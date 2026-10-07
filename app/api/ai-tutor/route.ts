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
  AIProviderConfigurationError,
  getModel,
  MAX_OUTPUT_TOKENS,
  SYSTEM_PROMPT,
  TEMPERATURE,
} from "@/lib/ai-config";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_TOTAL_LENGTH = 40_000;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
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
  const textLengths = messages.map((message) =>
    message.parts.reduce(
      (length, part) => length + (part.type === "text" ? part.text.length : 0),
      0,
    ),
  );

  if (
    textLengths.some((length) => length > MAX_MESSAGE_LENGTH) ||
    textLengths.reduce((sum, length) => sum + length, 0) > MAX_TOTAL_LENGTH ||
    messages.at(-1)?.role !== "user"
  ) {
    return jsonError("The chat messages are invalid or exceed the allowed limit.", 400);
  }

  let model;
  try {
    model = getModel();
  } catch (error) {
    if (error instanceof AIProviderConfigurationError) {
      return jsonError(error.message, 503);
    }
    throw error;
  }

  const validatedMessages = await validateUIMessages({ messages });
  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(validatedMessages),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => "The tutor could not finish this response. Please try again.",
    }),
  });
}
