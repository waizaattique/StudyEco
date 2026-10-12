import type { UIMessage } from "ai";

export const CHAT_USER_ID = "anon";
const CHAT_STORAGE_EVENT = "studyeco:chats-changed";
const STORAGE_UNAVAILABLE = "__studyeco_chat_storage_unavailable__";

export interface StoredChat {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
  pinned: boolean;
  stoppedMessageIds?: string[];
}

function storageKey(userId: string) {
  return `studyeco:chats:${encodeURIComponent(userId)}`;
}

function isStoredChat(value: unknown): value is StoredChat {
  if (!value || typeof value !== "object") return false;
  const chat = value as Record<string, unknown>;
  return (
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    Array.isArray(chat.messages) &&
    typeof chat.updatedAt === "number" &&
    Number.isFinite(chat.updatedAt) &&
    typeof chat.pinned === "boolean" &&
    (chat.stoppedMessageIds === undefined ||
      (Array.isArray(chat.stoppedMessageIds) &&
        chat.stoppedMessageIds.every((id) => typeof id === "string")))
  );
}

function readChats(userId: string): StoredChat[] {
  if (typeof window === "undefined") return [];
  const serialized = window.localStorage.getItem(storageKey(userId));
  const parsed = parseChatSnapshot(serialized);
  if (parsed.error) throw new Error(parsed.error);
  return parsed.chats;
}

function writeChats(userId: string, chats: StoredChat[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(chats));
  window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
}

export function subscribeToChats(onChange: () => void, userId = CHAT_USER_ID) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey(userId)) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHAT_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHAT_STORAGE_EVENT, onChange);
  };
}

export function getChatSnapshot(userId = CHAT_USER_ID): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

export function parseChatSnapshot(snapshot: string | null) {
  if (snapshot === STORAGE_UNAVAILABLE) {
    return {
      chats: [] as StoredChat[],
      error: "Browser storage is unavailable. Chats will not persist.",
    };
  }
  if (snapshot === null) return { chats: [] as StoredChat[], error: "" };

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!Array.isArray(parsed) || !parsed.every(isStoredChat)) {
      throw new Error("Saved chats have an invalid format.");
    }
    return { chats: parsed, error: "" };
  } catch {
    return {
      chats: [] as StoredChat[],
      error: "Saved chats could not be read. Existing browser data was left unchanged.",
    };
  }
}

export function listChats(userId = CHAT_USER_ID): StoredChat[] {
  return readChats(userId).sort((left, right) => right.updatedAt - left.updatedAt);
}

export function getChat(
  chatId: string,
  userId = CHAT_USER_ID,
): StoredChat | undefined {
  return readChats(userId).find((chat) => chat.id === chatId);
}

export function saveChat(chat: StoredChat, userId = CHAT_USER_ID): StoredChat[] {
  const chats = readChats(userId);
  const existing = chats.find((item) => item.id === chat.id);
  const saved = {
    ...chat,
    pinned: existing?.pinned ?? chat.pinned,
    title: existing?.title || chat.title,
  };
  writeChats(userId, [saved, ...chats.filter((item) => item.id !== chat.id)]);
  return listChats(userId);
}

export function deleteChat(
  chatId: string,
  userId = CHAT_USER_ID,
): StoredChat[] {
  const chats = readChats(userId).filter((chat) => chat.id !== chatId);
  writeChats(userId, chats);
  return listChats(userId);
}

export function togglePin(
  chatId: string,
  userId = CHAT_USER_ID,
): StoredChat[] {
  const chats = readChats(userId).map((chat) =>
    chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat,
  );
  writeChats(userId, chats);
  return listChats(userId);
}

export function renameChat(
  chatId: string,
  title: string,
  userId = CHAT_USER_ID,
): StoredChat[] {
  const chats = readChats(userId).map((chat) =>
    chat.id === chatId ? { ...chat, title: title.trim() } : chat,
  );
  writeChats(userId, chats);
  return listChats(userId);
}
