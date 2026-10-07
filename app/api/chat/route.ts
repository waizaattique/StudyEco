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
  getModel,
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

function isRateLimitError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === 429
  );
}

function errorMessage(error: unknown) {
  return isRateLimitError(error) ? RATE_LIMITED_MESSAGE : GENERIC_ERROR_MESSAGE;
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

  try {
    const result = streamText({
      model: getModel(),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(validatedMessages),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      abortSignal: request.signal,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: errorMessage,
      }),
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return jsonError(RATE_LIMITED_MESSAGE, 429);
    }
    return jsonError(GENERIC_ERROR_MESSAGE, 500);
  }
}
