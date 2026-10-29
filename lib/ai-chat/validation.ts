import type { UIMessage } from "ai";
import { isMessageMetadata } from "@/lib/chat-date";

const MAX_ASSISTANT_MESSAGE_LENGTH = 20_000;
const STUDY_PLAN_PART_TYPE = "tool-studyPlan";
const EMPTY_MESSAGE_TEXT = "[No text]";

/** Rewrites a finished studyPlan tool part as one plain-text line for the model. */
function summarizeStudyPlanPart(part: Record<string, unknown>) {
  if (part.type !== STUDY_PLAN_PART_TYPE) return null;
  if (part.state !== "output-available") return null;

  const output = part.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }

  const plan = output as Record<string, unknown>;
  if (
    typeof plan.topic !== "string" ||
    typeof plan.examDate !== "string" ||
    typeof plan.daysLeft !== "number" ||
    typeof plan.totalHours !== "number"
  ) {
    return null;
  }

  return `[Study plan for ${plan.topic}: ${plan.daysLeft} days until ${plan.examDate}, ${plan.totalHours} hours in total.]`;
}

export function sanitizeMessages(messages: unknown[]): unknown[] {
  return messages.flatMap((message) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return [message];
    }

    const candidate = message as Record<string, unknown>;
    if (!Array.isArray(candidate.parts)) return [message];

    const isAssistant = candidate.role === "assistant";

    let assistantTextLength = 0;
    const parts = candidate.parts.flatMap((part) => {
      if (!part || typeof part !== "object" || Array.isArray(part)) return [];

      const candidatePart = part as Record<string, unknown>;
      const textPart =
        candidatePart.type === "text" && typeof candidatePart.text === "string"
          ? candidatePart.text
          : null;
      const text = textPart ?? summarizeStudyPlanPart(candidatePart);

      if (text === null || text.length === 0) return [];
      if (!isAssistant) {
        return textPart === null ? [{ type: "text", text }] : [part];
      }

      const trimmed = text.slice(
        0,
        MAX_ASSISTANT_MESSAGE_LENGTH - assistantTextLength,
      );
      assistantTextLength += trimmed.length;
      return trimmed ? [{ type: "text", text: trimmed }] : [];
    });

    if (parts.length > 0) return [{ ...candidate, parts }];

    return isAssistant
      ? [{ ...candidate, parts: [{ type: "text", text: EMPTY_MESSAGE_TEXT }] }]
      : [];
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
