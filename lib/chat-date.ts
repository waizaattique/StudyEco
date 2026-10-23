export interface MessageMetadata {
  createdAt?: number;
}

export function isMessageMetadata(value: unknown): value is MessageMetadata {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.createdAt === undefined ||
    (typeof record.createdAt === "number" && Number.isFinite(record.createdAt))
  );
}

/**
 * Returns calendar day difference:
 * 0 = today
 * 1 = yesterday
 * 2..7 = 2 to 7 calendar days ago
 * >=8 = 8 or more days ago
 * Negative values indicate future dates (treated as 0).
 */
export function getCalendarDayDiff(targetTimestamp: number, now = Date.now()): number {
  const targetDate = new Date(targetTimestamp);
  const nowDate = new Date(now);

  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).getTime();
  const startOfNow = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  ).getTime();

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((startOfNow - startOfTarget) / msPerDay);
  return Math.max(0, diffDays);
}

/**
 * Formats a message timestamp into a localized short time, e.g. "2:41 PM".
 */
export function formatMessageTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  }
}

/**
 * Formats day separator heading: "Today", "Yesterday", or "Mon 20 Oct".
 */
export function formatDaySeparator(timestamp: number, now = Date.now()): string {
  const diff = getCalendarDayDiff(timestamp, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";

  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(timestamp));
  } catch {
    const d = new Date(timestamp);
    return d.toDateString();
  }
}

export type RecentsGroupKey = "today" | "yesterday" | "previous7Days" | "older";

export interface RecentsGroup<T> {
  key: RecentsGroupKey;
  label: string;
  items: T[];
}

export function groupChatsByCalendarDate<T extends { updatedAt: number }>(
  chats: T[],
  now = Date.now(),
): RecentsGroup<T>[] {
  const groups: Record<RecentsGroupKey, T[]> = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  for (const chat of chats) {
    const diff = getCalendarDayDiff(chat.updatedAt, now);
    if (diff === 0) {
      groups.today.push(chat);
    } else if (diff === 1) {
      groups.yesterday.push(chat);
    } else if (diff >= 2 && diff <= 7) {
      groups.previous7Days.push(chat);
    } else {
      groups.older.push(chat);
    }
  }

  const result: RecentsGroup<T>[] = [
    { key: "today", label: "Today", items: groups.today },
    { key: "yesterday", label: "Yesterday", items: groups.yesterday },
    { key: "previous7Days", label: "Previous 7 days", items: groups.previous7Days },
    { key: "older", label: "Older", items: groups.older },
  ];

  return result.filter((g) => g.items.length > 0);
}
