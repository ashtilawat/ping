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

export type ThreeTapLine = {
  t1: Cell;
  t2: Cell;
  t3: Cell;
  d1: number;
  d2: number;
  d3: number;
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

const ALL_CELLS = allCells();

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

/** Cells whose Manhattan readings on (t1,t2,t3) equal (d1,d2,d3). */
export function cellsConsistentWithTriple(
  t1: Cell,
  t2: Cell,
  t3: Cell,
  d1: number,
  d2: number,
  d3: number,
): Cell[] {
  return ALL_CELLS.filter(
    (h) =>
      manhattan(h, t1) === d1 &&
      manhattan(h, t2) === d2 &&
      manhattan(h, t3) === d3,
  );
}

/** Some ordered tap triple yields readings consistent with exactly this cell. */
export function findUniqueThreeTapLine(h: Cell): ThreeTapLine | null {
  for (let i = 0; i < ALL_CELLS.length; i++) {
    for (let j = 0; j < ALL_CELLS.length; j++) {
      if (j === i) continue;
      for (let k = 0; k < ALL_CELLS.length; k++) {
        if (k === i || k === j) continue;
        const t1 = ALL_CELLS[i];
        const t2 = ALL_CELLS[j];
        const t3 = ALL_CELLS[k];
        const d1 = manhattan(h, t1);
        const d2 = manhattan(h, t2);
        const d3 = manhattan(h, t3);
        const matches = cellsConsistentWithTriple(t1, t2, t3, d1, d2, d3);
        if (matches.length === 1 && matches[0][0] === h[0] && matches[0][1] === h[1]) {
          return { t1, t2, t3, d1, d2, d3 };
        }
      }
    }
  }
  return null;
}

export function hasUniqueThreeTapLine(h: Cell): boolean {
  return findUniqueThreeTapLine(h) !== null;
}

/** First tap triple where both cells produce identical (d1,d2,d3). */
export function findSharedThreeTapLine(a: Cell, b: Cell): ThreeTapLine | null {
  if (a[0] === b[0] && a[1] === b[1]) return null;

  for (let i = 0; i < ALL_CELLS.length; i++) {
    for (let j = 0; j < ALL_CELLS.length; j++) {
      if (j === i) continue;
      for (let k = 0; k < ALL_CELLS.length; k++) {
        if (k === i || k === j) continue;
        const t1 = ALL_CELLS[i];
        const t2 = ALL_CELLS[j];
        const t3 = ALL_CELLS[k];
        const d1a = manhattan(a, t1);
        const d2a = manhattan(a, t2);
        const d3a = manhattan(a, t3);
        const d1b = manhattan(b, t1);
        const d2b = manhattan(b, t2);
        const d3b = manhattan(b, t3);
        if (d1a === d1b && d2a === d2b && d3a === d3b) {
          return { t1, t2, t3, d1: d1a, d2: d2a, d3: d3a };
        }
      }
    }
  }
  return null;
}

function passesStaticRules(h: Cell): boolean {
  return !isCenterForbidden(h) && !isCornerTooFar(h) && hasUniqueThreeTapLine(h);
}

const PUBLISHABLE_POOL: Cell[] = ALL_CELLS.filter(passesStaticRules);

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
): RejectionReason[] {
  const reasons: RejectionReason[] = [];
  if (isCenterForbidden(h)) reasons.push("center");
  if (isCornerTooFar(h)) reasons.push("corner");
  if (!hasUniqueThreeTapLine(h)) reasons.push("ambiguous-triple");
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

function pickFromPool(dateStr: string, attempt: number): Cell {
  const idx = hashString(`PING:${dateStr}:${attempt}`) % PUBLISHABLE_POOL.length;
  return PUBLISHABLE_POOL[idx];
}

const publishCache = new Map<string, Cell>();

function generateForDate(dateStr: string, prevH: Cell): Cell {
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const h = pickFromPool(dateStr, attempt);
    if (prevH[0] === h[0] && prevH[1] === h[1]) continue;
    if (!hasUniqueThreeTapLine(h)) continue;
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
  allCells,
};
