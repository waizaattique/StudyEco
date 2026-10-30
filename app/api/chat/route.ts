import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { isTutorMessage, sanitizeMessages } from "@/lib/ai-chat/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
import { createStudyPlanTool, ToolUserError } from "@/lib/ai-tools/study-plan";
import { resolveToday } from "@/lib/ai-chat/today";

export const maxDuration = 60;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_TOTAL_LENGTH = 100_000;
const MAX_REQUEST_BODY_BYTES = 100 * 1024;
const MAX_PARTS_PER_MESSAGE = 100;
const FIRST_TEXT_TIMEOUT_MS = 25_000;
const MAX_PREFLIGHT_CHUNKS = 100;
const IP_RATE_LIMIT = 60;
const IP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000;
const MAX_IP_RATE_LIMIT_ENTRIES = 10_000;
const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment.";
const IP_RATE_LIMIT_MESSAGE =
  "Too many requests from your network. Please try again later.";
const PROVIDER_BUSY_MESSAGE =
  "The free model is busy. Wait a few seconds and send again.";
const GENERIC_ERROR_MESSAGE =
  "The tutor could not finish this response. Please try again.";

const MAX_STEPS = 3;
const STUDY_PLAN_INSTRUCTIONS =
  "You can call the studyPlan tool. Use it only when the student gives a topic, " +
  "an exam date and how many hours per day they can study. If any of those three " +
  "details is missing, ask for it instead of guessing. After the studyPlan tool " +
  "result, write only one or two sentences and do not repeat the plan in text. " +
  "Convert relative dates like 'next Friday' into an exact date using today's " +
  "date before calling the tool. " +
  "You cannot save, schedule or send anything. Never say a plan was saved, added " +
  "to a schedule or timetable, or sent anywhere. Just say the plan is ready.";

type StudyPlanTool = ReturnType<typeof createStudyPlanTool>;

type IpRateLimit = {
  windowStartedAt: number;
  requestCount: number;
};

// These in-memory counters reset on restart and aren't shared across instances, so they only reduce abuse and don't fully stop it.
const ipRateLimits = new Map<string, IpRateLimit>();

type ModelStreamChunk =
  ReturnType<typeof streamText>["stream"] extends ReadableStream<infer Chunk>
    ? Chunk
    : never;

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

function getClientIp(request: Request) {
  for (const header of ["x-vercel-forwarded-for", "x-forwarded-for"]) {
    const ip = request.headers.get(header)?.split(",")[0].trim();
    if (ip) return ip;
  }
  return "unknown";
}

function isIpRateLimited(ip: string) {
  const now = Date.now();
  const existing = ipRateLimits.get(ip);
  const windowIsActive =
    existing && now - existing.windowStartedAt < IP_RATE_LIMIT_WINDOW_MS;

  if (windowIsActive && existing.requestCount >= IP_RATE_LIMIT) {
    ipRateLimits.delete(ip);
    ipRateLimits.set(ip, existing);
    return true;
  }

  if (ipRateLimits.has(ip)) {
    ipRateLimits.delete(ip);
  } else if (ipRateLimits.size >= MAX_IP_RATE_LIMIT_ENTRIES) {
    const oldestIp = ipRateLimits.keys().next().value;
    if (oldestIp !== undefined) ipRateLimits.delete(oldestIp);
  }

  ipRateLimits.set(
    ip,
    windowIsActive
      ? { ...existing, requestCount: existing.requestCount + 1 }
      : { windowStartedAt: now, requestCount: 1 },
  );
  return false;
}

class PreflightError extends Error {}

class FirstTextTimeoutError extends PreflightError {
  constructor() {
    super("The model did not produce a first text chunk before the deadline.");
    this.name = "FirstTextTimeoutError";
  }
}

class PreflightChunkLimitError extends PreflightError {
  constructor() {
    super("The model produced too many chunks before its first text chunk.");
    this.name = "PreflightChunkLimitError";
  }
}

async function readRequestBody(
  request: Request,
): Promise<
  { ok: true; text: string } | { ok: false; status: number; message: string }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_REQUEST_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      message: "The request body must be no larger than 100 KB.",
    };
  }

  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          status: 413,
          message: "The request body must be no larger than 100 KB.",
        };
      }
      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      status: 400,
      message: "The request body could not be read.",
    };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

function readWithTimeout(
  reader: ReadableStreamDefaultReader<ModelStreamChunk>,
  timeoutMs: number,
) {
  return new Promise<ReadableStreamReadResult<ModelStreamChunk>>(
    (resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new FirstTextTimeoutError()),
        timeoutMs,
      );
      reader
        .read()
        .then(resolve, reject)
        .finally(() => clearTimeout(timeout));
    },
  );
}

function isQuotaError(error: unknown): boolean {
  if (typeof error === "string") {
    return /quota|rate.?limit|resource.?exhausted|too many requests/i.test(
      error,
    );
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

function buildSystemPrompt(today: string) {
  return `${SYSTEM_PROMPT} Today's date is ${today} (the student's local date). ${STUDY_PLAN_INSTRUCTIONS}`;
}

function errorMessage(error: unknown) {
  // A ToolUserError explains a fixable problem to the student, so it is shown as-is and not logged.
  if (error instanceof ToolUserError) return error.message;

  logProviderError(error);
  return isQuotaError(error) ? PROVIDER_BUSY_MESSAGE : GENERIC_ERROR_MESSAGE;
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

function hasStreamActivity(chunk: ModelStreamChunk) {
  return (
    (chunk.type === "text-delta" && chunk.text.length > 0) ||
    chunk.type === "tool-input-start" ||
    chunk.type === "tool-input-delta" ||
    chunk.type === "tool-call" ||
    chunk.type === "tool-result" ||
    chunk.type === "tool-error"
  );
}

async function prepareModelStream(
  modelId: string,
  model: ReturnType<typeof getModel>,
  messages: Awaited<ReturnType<typeof convertToModelMessages>>,
  system: string,
  studyPlan: StudyPlanTool,
  request: Request,
) {
  const result = streamText({
    model,
    system,
    tools: { studyPlan },
    stopWhen: stepCountIs(MAX_STEPS),
    messages,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    abortSignal: request.signal,
  });
  const reader = result.stream.getReader();
  const initialChunks: ModelStreamChunk[] = [];
  const firstTextDeadline = Date.now() + FIRST_TEXT_TIMEOUT_MS;

  try {
    while (true) {
      const remainingMs = firstTextDeadline - Date.now();
      if (remainingMs <= 0) throw new FirstTextTimeoutError();
      const { done, value } = await readWithTimeout(reader, remainingMs);

      if (done) {
        const receivedActivity = initialChunks.some(hasStreamActivity);

        reader.releaseLock();

        if (!receivedActivity) {
          console.info("[api/chat] Model ended without sending text", {
            model: modelId,
          });

          return {
            ok: false as const,
            error: new PreflightError(
              "The model ended before sending a text response.",
            ),
          };
        }

        console.info("[api/chat] Model answered", { model: modelId });

        return {
          ok: true as const,
          stream: new ReadableStream<ModelStreamChunk>({
            start(controller) {
              for (const chunk of initialChunks) {
                controller.enqueue(chunk);
              }
              controller.close();
            },
          }),
        };
      }

      if (value.type === "error") {
        await reader.cancel();
        reader.releaseLock();
        return { ok: false as const, error: value.error };
      }

      if (hasStreamActivity(value)) {
        initialChunks.push(value);
        console.info("[api/chat] Model answered", { model: modelId });
        return {
          ok: true as const,
          stream: replayStream(reader, initialChunks),
        };
      }

      initialChunks.push(value);
      if (initialChunks.length > MAX_PREFLIGHT_CHUNKS) {
        await reader.cancel();
        reader.releaseLock();
        return { ok: false as const, error: new PreflightChunkLimitError() };
      }
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // The reader may already be cancelled by the provider.
    } finally {
      reader.releaseLock();
    }
    return { ok: false as const, error };
  }
}

export async function POST(request: Request) {
  if (isIpRateLimited(getClientIp(request))) {
    return jsonError(IP_RATE_LIMIT_MESSAGE, 429);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[api/chat] Session verification failed", error.message);
  }
  if (!data.user) {
    return jsonError("Your session expired. Log in again.", 401);
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return jsonError("Content-Type must be application/json.", 415);
  }

  const { data: limitRows, error: limitError } = await supabase.rpc(
    "consume_chat_rate_limit",
  );
  if (limitError) {
    console.error("[api/chat] Rate limit check failed", limitError.message);
    return jsonError("The chat service is temporarily unavailable.", 503);
  }
  const limit = limitRows[0];
  if (!limit) {
    console.error("[api/chat] Rate limit check returned no result.");
    return jsonError("The chat service is temporarily unavailable.", 503);
  }
  if (!limit.allowed) {
    return jsonError(RATE_LIMIT_MESSAGE, 429, {
      "Retry-After": String(limit.retry_after),
    });
  }

  let body: unknown;
  try {
    const requestBody = await readRequestBody(request);
    if (!requestBody.ok) {
      return jsonError(requestBody.message, requestBody.status);
    }
    body = JSON.parse(requestBody.text);
  } catch {
    return jsonError("The request body must be valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || !("messages" in body)) {
    return jsonError("A list of chat messages is required.", 400);
  }

  const candidateMessages = (body as { messages: unknown }).messages;
  if (!Array.isArray(candidateMessages)) {
    return jsonError("Chat messages must be provided as an array.", 400);
  }
  if (candidateMessages.length > MAX_MESSAGES) {
    return jsonError(
      `A chat can contain no more than ${MAX_MESSAGES} messages.`,
      400,
    );
  }
  if (
    candidateMessages.some((message) => {
      if (!message || typeof message !== "object" || Array.isArray(message)) {
        return true;
      }
      const parts = (message as Record<string, unknown>).parts;
      return !Array.isArray(parts) || parts.length > MAX_PARTS_PER_MESSAGE;
    })
  ) {
    return jsonError(
      `Each chat message must have a valid parts array with no more than ${MAX_PARTS_PER_MESSAGE} parts.`,
      400,
    );
  }

  const sanitizedMessages = sanitizeMessages(candidateMessages);
  if (
    sanitizedMessages.length === 0 ||
    !sanitizedMessages.every(isTutorMessage)
  ) {
    return jsonError(
      "Chat messages must be a non-empty array of valid messages.",
      400,
    );
  }

  const messages = sanitizedMessages as UIMessage[];
  if (
    messages.some(
      (message) =>
        message.role === "user" &&
        message.parts.reduce(
          (length, part) =>
            length + (part.type === "text" ? part.text.length : 0),
          0,
        ) > MAX_MESSAGE_LENGTH,
    )
  ) {
    return jsonError(
      `A user message cannot exceed ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`,
      400,
    );
  }

  const totalLength = messages.reduce(
    (total, message) =>
      total +
      message.parts.reduce(
        (length, part) =>
          length + (part.type === "text" ? part.text.length : 0),
        0,
      ),
    0,
  );
  if (messages.at(-1)?.role !== "user" || totalLength > MAX_TOTAL_LENGTH) {
    return jsonError(
      totalLength > MAX_TOTAL_LENGTH
        ? "The conversation is too large. Start a new chat."
        : "The last chat message must be from the user.",
      400,
    );
  }

  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({ messages });
  } catch {
    return jsonError(
      "The chat messages are invalid or exceed the allowed limit.",
      400,
    );
  }

  let provider: string;
  let messagesForModel: Awaited<ReturnType<typeof convertToModelMessages>>;
  try {
    provider = getConfiguredProvider();
    messagesForModel = await convertToModelMessages(validatedMessages);
  } catch (error) {
    logProviderError(error);
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }

  // The browser reports its local date so a plan starts on the student's today, not the server's UTC day.
  const today = resolveToday(
    (body as { clientDate?: unknown }).clientDate,
    new Date(),
  );
  const systemPrompt = buildSystemPrompt(today);
  const studyPlan = createStudyPlanTool(today);

  try {
    if (provider === "google") {
      const primaryModelId = getGoogleModelId();
      const primary = await prepareModelStream(
        primaryModelId,
        getModel("google", primaryModelId),
        messagesForModel,
        systemPrompt,
        studyPlan,
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
      if (
        !isQuotaError(primary.error) &&
        !(primary.error instanceof PreflightError)
      ) {
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
            systemPrompt,
            studyPlan,
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
        return jsonError(PROVIDER_BUSY_MESSAGE, 429);
      }

      const groqModelId = "groq:llama-3.3-70b-versatile";
      const groqAttempt = await prepareModelStream(
        groqModelId,
        getModel("groq"),
        messagesForModel,
        systemPrompt,
        studyPlan,
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
          ? PROVIDER_BUSY_MESSAGE
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
      systemPrompt,
      studyPlan,
      request,
    );
    if (!attempt.ok) {
      logProviderError(attempt.error);
      return jsonError(
        isQuotaError(attempt.error)
          ? PROVIDER_BUSY_MESSAGE
          : GENERIC_ERROR_MESSAGE,
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
      isQuotaError(error) ? PROVIDER_BUSY_MESSAGE : GENERIC_ERROR_MESSAGE,
      isQuotaError(error) ? 429 : 500,
    );
  }
}
