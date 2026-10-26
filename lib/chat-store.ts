import type { UIMessage } from "ai";

const CHAT_STORAGE_EVENT = "studyeco:chats-changed";
const STORAGE_UNAVAILABLE = "__studyeco_chat_storage_unavailable__";
const MAX_STORED_CHATS = 50;
const MAX_STORED_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_STORED_PARTS_PER_MESSAGE = 100;

export interface StoredChat {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt?: number;
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
    chat.id.length > 0 &&
    typeof chat.title === "string" &&
    chat.title.length <= 1_000 &&
    Array.isArray(chat.messages) &&
    chat.messages.every(isStoredMessage) &&
    (chat.createdAt === undefined ||
      (typeof chat.createdAt === "number" && Number.isFinite(chat.createdAt))) &&
    typeof chat.updatedAt === "number" &&
    Number.isFinite(chat.updatedAt) &&
    typeof chat.pinned === "boolean" &&
    (chat.stoppedMessageIds === undefined ||
      (Array.isArray(chat.stoppedMessageIds) &&
        chat.stoppedMessageIds.every((id) => typeof id === "string")))
  );
}

function isStoredMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "string" ||
    message.id.length === 0 ||
    (message.role !== "user" && message.role !== "assistant") ||
    !Array.isArray(message.parts) ||
    message.parts.length === 0 ||
    message.parts.length > MAX_STORED_PARTS_PER_MESSAGE
  ) {
    return false;
  }

  let textLength = 0;
  for (const part of message.parts) {
    if (!part || typeof part !== "object" || Array.isArray(part)) return false;
    const item = part as Record<string, unknown>;
    if (typeof item.type !== "string" || item.type.length === 0) return false;
    if (item.type === "text") {
      if (typeof item.text !== "string") return false;
      textLength += item.text.length;
    }
  }

  return textLength <= (message.role === "user" ? 4_000 : 20_000);
}

function byteLength(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function capStoredChats(chats: StoredChat[]) {
  const ordered = [...chats].sort((left, right) => right.updatedAt - left.updatedAt);
  const capped: StoredChat[] = [];
  for (const chat of ordered) {
    if (capped.length >= MAX_STORED_CHATS) break;
    const candidate = [...capped, chat];
    if (byteLength(candidate) <= MAX_STORED_SIZE_BYTES) capped.push(chat);
  }
  return capped;
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
  const cappedChats = capStoredChats(chats);
  if (chats.length > 0 && !cappedChats.some((chat) => chat.id === chats[0].id)) {
    throw new Error("This chat is too large to save in this browser.");
  }
  window.localStorage.setItem(storageKey(userId), JSON.stringify(cappedChats));
  window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
}

export function subscribeToChats(onChange: () => void, userId: string) {
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

export function getChatSnapshot(userId: string): string | null {
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
    if (!Array.isArray(parsed)) {
      throw new Error("Saved chats have an invalid format.");
    }
    return {
      chats: capStoredChats(parsed.filter(isStoredChat)),
      error: "",
    };
  } catch {
    return {
      chats: [] as StoredChat[],
      error: "Saved chats could not be read. Existing browser data was left unchanged.",
    };
  }
}

export function listChats(userId: string): StoredChat[] {
  return readChats(userId).sort((left, right) => right.updatedAt - left.updatedAt);
}

export function getChat(
  chatId: string,
  userId: string,
): StoredChat | undefined {
  return readChats(userId).find((chat) => chat.id === chatId);
}

export function saveChat(chat: StoredChat, userId: string): StoredChat[] {
  const chats = readChats(userId);
  const existing = chats.find((item) => item.id === chat.id);
  const createdAt = existing?.createdAt ?? chat.createdAt ?? Date.now();
  const saved: StoredChat = {
    ...chat,
    createdAt,
    pinned: existing?.pinned ?? chat.pinned,
    title: existing?.title || chat.title,
  };
  writeChats(userId, [saved, ...chats.filter((item) => item.id !== chat.id)]);
  return listChats(userId);
}

export function deleteChat(
  chatId: string,
  userId: string,
): StoredChat[] {
  const chats = readChats(userId).filter((chat) => chat.id !== chatId);
  writeChats(userId, chats);
  return listChats(userId);
}

export function togglePin(
  chatId: string,
  userId: string,
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
  userId: string,
): StoredChat[] {
  const chats = readChats(userId).map((chat) =>
    chat.id === chatId ? { ...chat, title: title.trim() } : chat,
  );
  writeChats(userId, chats);
  return listChats(userId);
}

export function clearChats(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(userId));
  window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
} 

// Reaction helpers for message like/dislike
export function getMessageReactions(userId: string): Record<string, 'like' | 'dislike' | null> {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(`studyeco:message-reactions:${userId}`);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setMessageReaction(
  userId: string,
  messageId: string,
  reaction: 'like' | 'dislike' | null,
) {
  const map = getMessageReactions(userId);
  if (reaction) {
    map[messageId] = reaction;
  } else {
    delete map[messageId];
  }
  window.localStorage.setItem(`studyeco:message-reactions:${userId}`, JSON.stringify(map));
  window.dispatchEvent(new Event('studyeco:message-reactions-changed'));
}

// Edit helpers for user messages
export function replaceUserMessage(
  chatId: string,
  messageId: string,
  newText: string,
  userId: string,
) {
  const chat = getChat(chatId, userId);
  if (!chat) return;
  const newMessages = chat.messages.map((msg) => {
    if (msg.id !== messageId) return msg;
    const newMsg: UIMessage = {
      ...msg,
      parts: [{ type: 'text', text: newText }],
    };
    return newMsg;
  });
  saveChat({ ...chat, messages: newMessages }, userId);
}

export function truncateChatAfter(
  chatId: string,
  messageId: string,
  userId: string,
) {
  const chat = getChat(chatId, userId);
  if (!chat) return;
  const index = chat.messages.findIndex((msg) => msg.id === messageId);
  if (index === -1) return;
  const truncated = chat.messages.slice(0, index + 1);
  saveChat({ ...chat, messages: truncated }, userId);
}

