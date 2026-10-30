const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;
const MAX_DAY_DISTANCE = 1;

/** Parses a strict YYYY-MM-DD string as a UTC midnight, or null when it is not a real date. */
function parseUtcDate(value: string): number | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  // Round-tripping rejects dates such as 2026-02-31, which Date.UTC would roll over.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

function toIsoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** Formats a Date as YYYY-MM-DD using this machine's local calendar day. */
export function localDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Picks the date the plan should start on.
 * Trusts the browser's local date only when it is a real YYYY-MM-DD date no more
 * than one day away from the server's UTC date; otherwise uses the server's UTC date.
 */
export function resolveToday(clientDate: unknown, serverNow: Date): string {
  const serverTimestamp = Date.UTC(
    serverNow.getUTCFullYear(),
    serverNow.getUTCMonth(),
    serverNow.getUTCDate(),
  );
  const serverToday = toIsoDate(serverTimestamp);

  if (typeof clientDate !== "string") return serverToday;

  const clientTimestamp = parseUtcDate(clientDate);
  if (clientTimestamp === null) return serverToday;

  // Timezones are at most one calendar day away from UTC, so anything further is bad input.
  const dayDistance =
    Math.abs(clientTimestamp - serverTimestamp) / MILLISECONDS_PER_DAY;
  if (dayDistance > MAX_DAY_DISTANCE) return serverToday;

  return clientDate;
}
