import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { isTutorMessage } from "@/lib/ai-tutor";
import {
  getConfiguredProvider,
  getGoogleFallbackModelId,
  getGoogleModelId,
  getModel,
  hasGroqApiKey,
  MAX_OUTPUT_TOKENS,
  SYSTEM_PROMPT,
  TEMPERATURE,
} from "@/lib/ai-config";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4_000;
const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITED_MESSAGE =
  "The free model is busy. Wait a few seconds and send again.";
const GENERIC_ERROR_MESSAGE =
  "The tutor could not finish this response. Please try again.";

const requestsByIp = new Map<string, { count: number; windowStart: number }>();
type ModelStreamChunk = ReturnType<typeof streamText>["stream"] extends ReadableStream<
  infer Chunk
>
  ? Chunk
  : never;

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  return forwardedIp || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function checkRateLimit(ip: string, now: number) {
  for (const [key, entry] of requestsByIp) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      requestsByIp.delete(key);
    }
  }

  const current = requestsByIp.get(ip);
  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestsByIp.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.ceil(
        (current.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1_000,
      ),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function isQuotaError(error: unknown): boolean {
  if (typeof error === "string") {
    return /quota|rate.?limit|resource.?exhausted|too many requests/i.test(error);
  }
  if (typeof error !== "object" || error === null) return false;

  const details = error as Record<string, unknown>;
  const data =
    typeof details.data === "object" && details.data !== null
      ? (details.data as Record<string, unknown>)
      : {};
  const providerError =
    typeof data.error === "object" && data.error !== null
      ? (data.error as Record<string, unknown>)
      : {};
  const code = details.code ?? providerError.code;
  const status = details.status ?? providerError.status;
  const statusCode = details.statusCode;
  const message =
    error instanceof Error
      ? error.message
      : typeof details.message === "string"
        ? details.message
        : typeof providerError.message === "string"
          ? providerError.message
          : String(error);

  return (
    statusCode === 429 ||
    code === 8 ||
    (typeof code === "string" &&
      /resource.?exhausted|quota|rate.?limit/i.test(code)) ||
    (typeof status === "string" &&
      /resource.?exhausted|quota|rate.?limit/i.test(status)) ||
    /quota|rate.?limit|resource.?exhausted|too many requests/i.test(message)
  );
}

function logProviderError(error: unknown) {
  const details =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const secrets = [
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.GROQ_API_KEY,
  ].filter((secret): secret is string => Boolean(secret));
  let message =
    error instanceof Error
      ? error.message
      : typeof details.message === "string"
        ? details.message
        : String(error);

  for (const secret of secrets) {
    message = message.replaceAll(secret, "[REDACTED]");
  }
  message = message.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");

  console.error("[api/chat] Provider error", {
    name:
      error instanceof Error
        ? error.name
        : typeof details.name === "string"
          ? details.name
          : "UnknownError",
    statusCode:
      typeof details.statusCode === "number"
        ? details.statusCode
        : typeof details.status === "number"
          ? details.status
          : undefined,
    message,
  });
}

function errorMessage(error: unknown) {
  logProviderError(error);
  return isQuotaError(error) ? RATE_LIMITED_MESSAGE : GENERIC_ERROR_MESSAGE;
}

function replayStream(
  reader: ReadableStreamDefaultReader<ModelStreamChunk>,
  initialChunks: ModelStreamChunk[],
) {
  let chunkIndex = 0;
  return new ReadableStream<ModelStreamChunk>({
    async pull(controller) {
      if (chunkIndex < initialChunks.length) {
        controller.enqueue(initialChunks[chunkIndex++]);
        return;
      }

      try {
        const { done, value } = await reader.read();
        if (done) {
          reader.releaseLock();
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        reader.releaseLock();
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

async function prepareModelStream(
  modelId: string,
  model: ReturnType<typeof getModel>,
  messages: Awaited<ReturnType<typeof convertToModelMessages>>,
  request: Request,
) {
  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    abortSignal: request.signal,
  });
  const reader = result.stream.getReader();
  const initialChunks: ModelStreamChunk[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.info("[api/chat] Model answered", { model: modelId });
        reader.releaseLock();
        return {
          ok: true as const,
          stream: new ReadableStream<ModelStreamChunk>({
            start(controller) {
              for (const chunk of initialChunks) controller.enqueue(chunk);
              controller.close();
            },
          }),
        };
      }

      initialChunks.push(value);
      if (value.type === "error") {
        await reader.cancel();
        reader.releaseLock();
        return { ok: false as const, error: value.error };
      }

      if (value.type === "text-delta" && value.text.length > 0) {
        console.info("[api/chat] Model answered", { model: modelId });
        return { ok: true as const, stream: replayStream(reader, initialChunks) };
      }
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // The reader may already be cancelled by the provider.
    }
    return { ok: false as const, error };
  }
}

export async function POST(request: Request) {
  const limit = checkRateLimit(getClientIp(request), Date.now());
  if (!limit.allowed) {
    return jsonError(RATE_LIMITED_MESSAGE, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("The request body must be valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || !("messages" in body)) {
    return jsonError("A list of chat messages is required.", 400);
  }

  const candidateMessages = (body as { messages: unknown }).messages;
  if (
    !Array.isArray(candidateMessages) ||
    candidateMessages.length === 0 ||
    candidateMessages.length > MAX_MESSAGES ||
    !candidateMessages.every(isTutorMessage)
  ) {
    return jsonError("The chat messages are invalid or exceed the allowed limit.", 400);
  }

  const messages = candidateMessages as UIMessage[];
  if (
    messages.some(
      (message) =>
        message.parts.reduce(
          (length, part) => length + (part.type === "text" ? part.text.length : 0),
          0,
        ) > MAX_MESSAGE_LENGTH,
    )
  ) {
    return jsonError("The chat messages are invalid or exceed the allowed limit.", 400);
  }

  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({ messages });
  } catch {
    return jsonError("The chat messages are invalid or exceed the allowed limit.", 400);
  }

  let provider: string;
  let messagesForModel: Awaited<
    ReturnType<typeof convertToModelMessages>
  >;
  try {
    provider = getConfiguredProvider();
    messagesForModel = await convertToModelMessages(validatedMessages);
  } catch (error) {
    logProviderError(error);
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }

  try {
    if (provider === "google") {
      const primaryModelId = getGoogleModelId();
      const primary = await prepareModelStream(
        primaryModelId,
        getModel("google", primaryModelId),
        messagesForModel,
        request,
      );

      if (primary.ok) {
        return createUIMessageStreamResponse({
          stream: toUIMessageStream({
            stream: primary.stream,
            onError: errorMessage,
          }),
        });
      }

      logProviderError(primary.error);
      if (!isQuotaError(primary.error)) {
        return jsonError(GENERIC_ERROR_MESSAGE, 500);
      }

      const fallbackModelId = getGoogleFallbackModelId();
      if (fallbackModelId !== primaryModelId) {
        let fallback:
          | Awaited<ReturnType<typeof prepareModelStream>>
          | { ok: false; error: unknown };
        try {
          fallback = await prepareModelStream(
            fallbackModelId,
            getModel("google", fallbackModelId),
            messagesForModel,
            request,
          );
        } catch (error) {
          fallback = { ok: false, error };
        }
        if (fallback.ok) {
          return createUIMessageStreamResponse({
            stream: toUIMessageStream({
              stream: fallback.stream,
              onError: errorMessage,
            }),
          });
        }
        logProviderError(fallback.error);
      }

      if (!hasGroqApiKey()) {
        return jsonError(RATE_LIMITED_MESSAGE, 429);
      }

      const groqModelId = "groq:llama-3.3-70b-versatile";
      const groqAttempt = await prepareModelStream(
        groqModelId,
        getModel("groq"),
        messagesForModel,
        request,
      );
      if (groqAttempt.ok) {
        return createUIMessageStreamResponse({
          stream: toUIMessageStream({
            stream: groqAttempt.stream,
            onError: errorMessage,
          }),
        });
      }
      logProviderError(groqAttempt.error);
      return jsonError(
        isQuotaError(groqAttempt.error)
          ? RATE_LIMITED_MESSAGE
          : GENERIC_ERROR_MESSAGE,
        isQuotaError(groqAttempt.error) ? 429 : 500,
      );
    }

    const model = getModel(provider);
    const selectedModelId =
      provider === "groq" ? "groq:llama-3.3-70b-versatile" : provider;
    const attempt = await prepareModelStream(
      selectedModelId,
      model,
      messagesForModel,
      request,
    );
    if (!attempt.ok) {
      logProviderError(attempt.error);
      return jsonError(
        isQuotaError(attempt.error) ? RATE_LIMITED_MESSAGE : GENERIC_ERROR_MESSAGE,
        isQuotaError(attempt.error) ? 429 : 500,
      );
    }

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: attempt.stream,
        onError: errorMessage,
      }),
    });
  } catch (error) {
    logProviderError(error);
    return jsonError(
      isQuotaError(error) ? RATE_LIMITED_MESSAGE : GENERIC_ERROR_MESSAGE,
      isQuotaError(error) ? 429 : 500,
    );
  }
}
