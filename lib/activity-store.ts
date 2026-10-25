const ACTIVITY_STORAGE_EVENT = "studyeco:activity-changed";

export interface DayQuestionCount {
  date: string; // "YYYY-MM-DD"
  dayLabel: string; // "Mon", "Tue", etc.
  fullDateLabel: string; // e.g. "Monday, 20 October"
  count: number;
  isToday: boolean;
}

export type ActivityMap = Record<string, number>;

function activityKey(userId: string): string {
  return `studyeco:activity:${encodeURIComponent(userId)}`;
}

/**
 * Format local date as YYYY-MM-DD
 */
export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseActivityMap(raw: string | null): ActivityMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: ActivityMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === "number" && Number.isFinite(value) && value >= 0) {
        result[key] = Math.floor(value);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function readActivity(userId: string): ActivityMap {
  if (typeof window === "undefined" || !userId) return {};
  try {
    return parseActivityMap(window.localStorage.getItem(activityKey(userId)));
  } catch {
    return {};
  }
}

export function incrementTodayQuestions(userId: string, now = new Date()): void {
  if (typeof window === "undefined" || !userId) return;
  const todayKey = formatLocalDateKey(now);
  try {
    const current = readActivity(userId);
    const updated: ActivityMap = {
      ...current,
      [todayKey]: (current[todayKey] ?? 0) + 1,
    };
    window.localStorage.setItem(activityKey(userId), JSON.stringify(updated));
    window.dispatchEvent(new Event(ACTIVITY_STORAGE_EVENT));
  } catch (error) {
    console.error("[activity-store] Could not save activity increment", error);
  }
}

/**
 * Returns the last 7 calendar days in chronological order ending with today.
 */
export function getLast7DaysQuestions(userId: string, now = new Date()): DayQuestionCount[] {
  const activity = readActivity(userId);
  const days: DayQuestionCount[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = formatLocalDateKey(d);
    const isToday = i === 0;

    let dayLabel = "";
    let fullDateLabel = "";

    try {
      dayLabel = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
    } catch {
      dayLabel = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()] || "";
    }

    try {
      fullDateLabel = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(d);
    } catch {
      fullDateLabel = d.toDateString();
    }

    days.push({
      date: key,
      dayLabel,
      fullDateLabel,
      count: activity[key] ?? 0,
      isToday,
    });
  }

  return days;
}

export function subscribeToActivity(userId: string, onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === activityKey(userId)) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ACTIVITY_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ACTIVITY_STORAGE_EVENT, onChange);
  };
}

export function getActivitySnapshot(userId: string): string | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return window.localStorage.getItem(activityKey(userId));
  } catch {
    return null;
  }
}
