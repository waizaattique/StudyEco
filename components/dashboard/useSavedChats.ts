"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuthUser } from "@/components/AuthUserProvider";
import {
  getChatSnapshot,
  parseChatSnapshot,
  subscribeToChats,
} from "@/lib/chat-store";

export function useSavedChats() {
  const user = useAuthUser();
  const subscribe = useCallback(
    (callback: () => void) => subscribeToChats(callback, user.id),
    [user.id],
  );
  const getSnapshot = useCallback(() => getChatSnapshot(user.id), [user.id]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const parsed = useMemo(() => parseChatSnapshot(snapshot), [snapshot]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setReady(true);
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return {
    chats: parsed.chats,
    error: parsed.error,
    now,
    ready,
  };
}

export function relativeTime(timestamp: number, now: number) {
  const elapsed = Math.max(0, now - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  if (hours < 48) return "yesterday";

  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}
