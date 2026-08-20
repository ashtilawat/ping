import { type Cell, manhattan } from "./manhattan";
import { addUtcDays, PING_EPOCH_UTC } from "./epoch";

export const GRID_SIZE = 12;

const CENTER_CELLS: Cell[] = [
  [5, 5],
  [5, 6],
  [6, 5],
  [6, 6],
];

const CORNERS: Cell[] = [
  [0, 0],
  [0, 11],
  [11, 0],
  [11, 11],
];

const CENTER_MID: readonly [number, number] = [5.5, 5.5];

export type GenerateOptions = {
  /** Skip publishing checks (test-only forced scoring). */
  force?: Cell;
  /** Precomputed H for the previous UTC day (consecutive-day rule). */
  prevH?: Cell | null;
};

function allCells(): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      cells.push([r, c]);
    }
  }
  return cells;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function manhattanToPoint(cell: Cell, point: readonly [number, number]): number {
  return Math.abs(cell[0] - point[0]) + Math.abs(cell[1] - point[1]);
}

function isCenterForbidden(h: Cell): boolean {
  if (CENTER_CELLS.some(([r, c]) => r === h[0] && c === h[1])) return true;
  return manhattanToPoint(h, CENTER_MID) <= 2;
}

function isCornerTooFar(h: Cell): boolean {
  return CORNERS.some((corner) => manhattan(h, corner) >= 18);
}

/**
 * Two cells share a 3-tap distance triple when ≥3 grid cells produce the same
 * distance reading for both hidden positions (equivalently, some ordered tap
 * sequence yields identical distance triples).
 */
export function sharesThreeTapTriple(h: Cell, other: Cell): boolean {
  if (h[0] === other[0] && h[1] === other[1]) return false;

  let matches = 0;
  for (const t of allCells()) {
    if (manhattan(h, t) === manhattan(other, t)) {
      matches++;
      if (matches >= 3) return true;
    }
  }
  return false;
}

export function hasAmbiguousTriple(h: Cell): boolean {
  for (const other of allCells()) {
    if (other[0] === h[0] && other[1] === h[1]) continue;
    if (sharesThreeTapTriple(h, other)) return true;
  }
  return false;
}

function passesStaticRules(h: Cell): boolean {
  return !isCenterForbidden(h) && !isCornerTooFar(h);
}

const STATIC_VALID: Cell[] = allCells().filter(passesStaticRules);

export type RejectionReason =
  | "center"
  | "corner"
  | "ambiguous-triple"
  | "same-as-next-day"
  | "same-as-prev-day";

export function rejectionReasons(
  h: Cell,
  prevH: Cell | null,
  nextH: Cell | null,
  checkAmbiguous = prevH === null && nextH === null,
): RejectionReason[] {
  const reasons: RejectionReason[] = [];
  if (isCenterForbidden(h)) reasons.push("center");
  if (isCornerTooFar(h)) reasons.push("corner");
  if (checkAmbiguous && hasAmbiguousTriple(h)) reasons.push("ambiguous-triple");
  if (prevH && prevH[0] === h[0] && prevH[1] === h[1]) reasons.push("same-as-prev-day");
  if (nextH && nextH[0] === h[0] && nextH[1] === h[1]) reasons.push("same-as-next-day");
  return reasons;
}

export function isPublishable(
  h: Cell,
  prevH: Cell | null = null,
  nextH: Cell | null = null,
): boolean {
  return rejectionReasons(h, prevH, nextH).length === 0;
}

export function candidateFromHash(dateStr: string, attempt: number): Cell {
  const h = hashString(`PING:${dateStr}:${attempt}`);
  return [h % GRID_SIZE, Math.floor(h / GRID_SIZE) % GRID_SIZE];
}

function pickFromValid(dateStr: string, attempt: number): Cell {
  const idx = hashString(`PING:${dateStr}:${attempt}`) % STATIC_VALID.length;
  return STATIC_VALID[idx];
}

const publishCache = new Map<string, Cell>();

function generateForDate(dateStr: string, prevH: Cell): Cell {
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const h = pickFromValid(dateStr, attempt);
    if (prevH[0] === h[0] && prevH[1] === h[1]) continue;
    return h;
  }

  throw new Error(`No publishable H for ${dateStr}`);
}

function ensureGeneratedThrough(targetDate: string): void {
  if (!publishCache.has(PING_EPOCH_UTC)) {
    const bootstrapPrev: Cell = [0, 0];
    publishCache.set(PING_EPOCH_UTC, generateForDate(PING_EPOCH_UTC, bootstrapPrev));
  }

  let cursor = PING_EPOCH_UTC;
  const targetMs = Date.parse(`${targetDate}T00:00:00.000Z`);

  while (Date.parse(`${cursor}T00:00:00.000Z`) < targetMs) {
    const next = addUtcDays(cursor, 1);
    if (!publishCache.has(next)) {
      publishCache.set(next, generateForDate(next, publishCache.get(cursor)!));
    }
    cursor = next;
  }
}

/** Generate a publishable H for a UTC calendar date. */
export function generateH(dateStr: string, opts: GenerateOptions = {}): Cell {
  if (opts.force) {
    return opts.force;
  }

  if (opts.prevH) {
    return generateForDate(dateStr, opts.prevH);
  }

  ensureGeneratedThrough(dateStr);

  if (publishCache.has(dateStr)) {
    return publishCache.get(dateStr)!;
  }

  const prev = publishCache.get(addUtcDays(dateStr, -1));
  if (!prev) {
    throw new Error(`Cannot generate H before ${PING_EPOCH_UTC}: ${dateStr}`);
  }
  const h = generateForDate(dateStr, prev);
  publishCache.set(dateStr, h);
  return h;
}

export {
  isCenterForbidden,
  isCornerTooFar,
  CENTER_CELLS,
  CORNERS,
};
