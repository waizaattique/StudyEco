import type { UIMessage } from "ai";
import { isMessageMetadata } from "@/lib/chat-date";

const MAX_ASSISTANT_MESSAGE_LENGTH = 20_000;

export function sanitizeMessages(messages: unknown[]): unknown[] {
  return messages.flatMap((message) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return [message];
    }

    const candidate = message as Record<string, unknown>;
    if (!Array.isArray(candidate.parts)) return [message];

    let assistantTextLength = 0;
    const parts = candidate.parts.flatMap((part) => {
      if (!part || typeof part !== "object" || Array.isArray(part)) return [];

      const textPart = part as Record<string, unknown>;
      if (textPart.type !== "text" || typeof textPart.text !== "string") {
        return [];
      }

      if (textPart.text.length === 0) return [];
      if (candidate.role !== "assistant") return [part];

      const text = textPart.text.slice(
        0,
        MAX_ASSISTANT_MESSAGE_LENGTH - assistantTextLength,
      );
      assistantTextLength += text.length;
      return text ? [{ ...textPart, text }] : [];
    });

    return parts.length > 0 ? [{ ...candidate, parts }] : [];
  });
}

export function isTutorMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "string" ||
    (message.role !== "user" && message.role !== "assistant") ||
    !Array.isArray(message.parts) ||
    !isMessageMetadata(message.metadata)
  ) {
    return false;
  }

  return message.parts.every(
    (part) =>
      part !== null &&
      typeof part === "object" &&
      (part as Record<string, unknown>).type === "text" &&
      typeof (part as Record<string, unknown>).text === "string",
  );
}
