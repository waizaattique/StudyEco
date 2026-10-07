import type { UIMessage } from "ai";
import { BRAND } from "@/lib/brand";

const STORAGE_KEY = `${BRAND.slug}:ai-tutor-history`;
const STORAGE_CHANGED_EVENT = "studyeco-ai-tutor-history-changed";
export const STORAGE_ERROR_EVENT = "studyeco-ai-tutor-storage-error";
const STORAGE_UNAVAILABLE = "__ai_tutor_storage_unavailable__";

let memorySnapshot: string | null = null;

export interface StoredConversation {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
  messages: UIMessage[];
}

export interface TutorHistory {
  conversations: StoredConversation[];
  sidebarExpanded?: boolean;
}

export interface ParsedTutorHistory {
  history: TutorHistory;
  error: string;
  valid: boolean;
}

export function getTutorHistorySnapshot() {
  if (memorySnapshot !== null) return memorySnapshot;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

export function subscribeToTutorHistory(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  const onLocalChange = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_CHANGED_EVENT, onLocalChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_CHANGED_EVENT, onLocalChange);
  };
}

export function parseTutorHistorySnapshot(
  snapshot: string | null,
): ParsedTutorHistory {
  const emptyHistory: TutorHistory = { conversations: [] };
  if (snapshot === null) {
    return { history: emptyHistory, error: "", valid: true };
  }
  if (snapshot === STORAGE_UNAVAILABLE) {
    return {
      history: emptyHistory,
      error: "Browser storage is unavailable. Chat history will not persist.",
      valid: false,
    };
  }

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!isTutorHistory(parsed)) {
      throw new Error("Saved chat history has an invalid format.");
    }
    return { history: parsed, error: "", valid: true };
  } catch {
    return {
      history: emptyHistory,
      error:
        "Saved chat history could not be read. Existing browser data was left unchanged.",
      valid: false,
    };
  }
}

export function updateTutorHistory(
  update: (history: TutorHistory) => TutorHistory,
) {
  const current = parseTutorHistorySnapshot(getTutorHistorySnapshot());
  const next = update(current.history);
  const serialized = JSON.stringify(next);

  if (!current.valid) {
    memorySnapshot = serialized;
    notifyStorageError(current.error);
    window.dispatchEvent(new Event(STORAGE_CHANGED_EVENT));
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
    memorySnapshot = null;
    notifyStorageError("");
  } catch {
    memorySnapshot = serialized;
    notifyStorageError(
      "Chat history could not be saved in this browser. Your current conversation is still available until you leave this page.",
    );
  }
  window.dispatchEvent(new Event(STORAGE_CHANGED_EVENT));
}

function notifyStorageError(message: string) {
  window.dispatchEvent(
    new CustomEvent(STORAGE_ERROR_EVENT, { detail: message }),
  );
}

export function isTutorMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "string" ||
    (message.role !== "user" && message.role !== "assistant") ||
    !Array.isArray(message.parts)
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

export function isTutorHistory(value: unknown): value is TutorHistory {
  if (!value || typeof value !== "object") return false;

  const history = value as Record<string, unknown>;
  if (
    !Array.isArray(history.conversations) ||
    (history.sidebarExpanded !== undefined &&
      typeof history.sidebarExpanded !== "boolean")
  ) {
    return false;
  }

  return history.conversations.every((conversation) => {
    if (!conversation || typeof conversation !== "object") return false;

    const item = conversation as Record<string, unknown>;
    return (
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.pinned === "boolean" &&
      typeof item.updatedAt === "number" &&
      Number.isFinite(item.updatedAt) &&
      Array.isArray(item.messages) &&
      item.messages.every(isTutorMessage)
    );
  });
}
