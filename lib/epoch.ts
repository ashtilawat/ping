/**
 * PING_EPOCH_UTC — the first UTC calendar day of PING puzzles is puzzle #1.
 * Documented anchor for the 1-based puzzle number shown in share cards.
 */
export const PING_EPOCH_UTC = "2025-01-01";

/** UTC calendar date string (YYYY-MM-DD) for a Date object. */
export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 1-based puzzle number for a UTC calendar date. */
export function puzzleNumber(dateStr: string): number {
  const epoch = Date.parse(`${PING_EPOCH_UTC}T00:00:00.000Z`);
  const target = Date.parse(`${dateStr}T00:00:00.000Z`);
  const days = Math.round((target - epoch) / 86_400_000);
  return days + 1;
}

/** Add (or subtract) whole UTC calendar days from a YYYY-MM-DD string. */
export function addUtcDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return utcDateString(d);
}

/**
 * Puzzle UTC date for a given instant.
 * Uses the UTC calendar day, not the viewer's local timezone.
 */
export function puzzleDateForInstant(instant: Date): string {
  return utcDateString(instant);
}

/**
 * Puzzle UTC date for a local wall-clock time in a named IANA timezone.
 * Used by the America/Chicago boundary fixture.
 */
export function puzzleDateForTimezone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}
