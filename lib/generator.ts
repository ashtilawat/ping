import { type BoardSize, maxManhattanDistance } from "./boards";
import { type Cell, manhattan } from "./manhattan";
import { addUtcDays, PING_EPOCH_UTC } from "./epoch";

export { BOARD_SIZES } from "./boards";
export type { BoardSize } from "./boards";

/** @deprecated Use BOARD_SIZES[2] or pass an explicit board size. */
export const GRID_SIZE = 12;

type GridRules = {
  gridSize: BoardSize;
  centerCells: Cell[];
  centerMid: readonly [number, number];
  centerForbiddenRadius: number;
  corners: Cell[];
  cornerMinDistance: number;
  allCells: Cell[];
};

function buildGridRules(gridSize: BoardSize): GridRules {
  const mid = (gridSize - 1) / 2;
  const low = Math.floor(mid);
  const high = Math.ceil(mid);
  const centerCells: Cell[] = [
    [low, low],
    [low, high],
    [high, low],
    [high, high],
  ];
  const corners: Cell[] = [
    [0, 0],
    [0, gridSize - 1],
    [gridSize - 1, 0],
    [gridSize - 1, gridSize - 1],
  ];
  const allCells: Cell[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      allCells.push([r, c]);
    }
  }

  return {
    gridSize,
    centerCells,
    centerMid: [mid, mid],
    centerForbiddenRadius: Math.max(0, Math.round((2 * gridSize) / 12)),
    corners,
    cornerMinDistance: Math.ceil(1.5 * gridSize),
    allCells,
  };
}

const RULES_BY_SIZE: Record<BoardSize, GridRules> = {
  4: buildGridRules(4),
  6: buildGridRules(6),
  12: buildGridRules(12),
};

export function gridRules(gridSize: BoardSize): GridRules {
  return RULES_BY_SIZE[gridSize];
}

/** 12×12 constants kept for tests that still target the large board. */
export const CENTER_CELLS: Cell[] = RULES_BY_SIZE[12].centerCells;
export const CORNERS: Cell[] = RULES_BY_SIZE[12].corners;

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

function manhattanToPoint(cell: Cell, point: readonly [number, number]): number {
  return Math.abs(cell[0] - point[0]) + Math.abs(cell[1] - point[1]);
}

export function isCenterForbidden(h: Cell, gridSize: BoardSize = 12): boolean {
  const rules = gridRules(gridSize);
  if (rules.centerCells.some(([r, c]) => r === h[0] && c === h[1])) return true;
  return manhattanToPoint(h, rules.centerMid) <= rules.centerForbiddenRadius;
}

export function isCornerTooFar(h: Cell, gridSize: BoardSize = 12): boolean {
  const rules = gridRules(gridSize);
  return rules.corners.some((corner) => manhattan(h, corner) >= rules.cornerMinDistance);
}

/** Cells whose Manhattan readings on (t1,t2,t3) equal (d1,d2,d3). */
export function cellsConsistentWithTriple(
  t1: Cell,
  t2: Cell,
  t3: Cell,
  d1: number,
  d2: number,
  d3: number,
  gridSize: BoardSize = 12,
): Cell[] {
  const { allCells } = gridRules(gridSize);
  return allCells.filter(
    (cell) =>
      manhattan(cell, t1) === d1 &&
      manhattan(cell, t2) === d2 &&
      manhattan(cell, t3) === d3,
  );
}

/** Some ordered tap triple yields readings consistent with exactly this cell. */
export function findUniqueThreeTapLine(h: Cell, gridSize: BoardSize = 12): ThreeTapLine | null {
  const { allCells } = gridRules(gridSize);
  for (let i = 0; i < allCells.length; i++) {
    for (let j = 0; j < allCells.length; j++) {
      if (j === i) continue;
      for (let k = 0; k < allCells.length; k++) {
        if (k === i || k === j) continue;
        const t1 = allCells[i];
        const t2 = allCells[j];
        const t3 = allCells[k];
        const d1 = manhattan(h, t1);
        const d2 = manhattan(h, t2);
        const d3 = manhattan(h, t3);
        const matches = cellsConsistentWithTriple(t1, t2, t3, d1, d2, d3, gridSize);
        if (matches.length === 1 && matches[0][0] === h[0] && matches[0][1] === h[1]) {
          return { t1, t2, t3, d1, d2, d3 };
        }
      }
    }
  }
  return null;
}

export function hasUniqueThreeTapLine(h: Cell, gridSize: BoardSize = 12): boolean {
  return findUniqueThreeTapLine(h, gridSize) !== null;
}

/** First tap triple where both cells produce identical (d1,d2,d3). */
export function findSharedThreeTapLine(
  a: Cell,
  b: Cell,
  gridSize: BoardSize = 12,
): ThreeTapLine | null {
  if (a[0] === b[0] && a[1] === b[1]) return null;
  const { allCells } = gridRules(gridSize);

  for (let i = 0; i < allCells.length; i++) {
    for (let j = 0; j < allCells.length; j++) {
      if (j === i) continue;
      for (let k = 0; k < allCells.length; k++) {
        if (k === i || k === j) continue;
        const t1 = allCells[i];
        const t2 = allCells[j];
        const t3 = allCells[k];
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

function passesStaticRules(h: Cell, gridSize: BoardSize): boolean {
  return (
    !isCenterForbidden(h, gridSize) &&
    !isCornerTooFar(h, gridSize) &&
    hasUniqueThreeTapLine(h, gridSize)
  );
}

function publishablePool(gridSize: BoardSize): Cell[] {
  return gridRules(gridSize).allCells.filter((cell) => passesStaticRules(cell, gridSize));
}

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
  gridSize: BoardSize = 12,
): RejectionReason[] {
  const reasons: RejectionReason[] = [];
  if (isCenterForbidden(h, gridSize)) reasons.push("center");
  if (isCornerTooFar(h, gridSize)) reasons.push("corner");
  if (!hasUniqueThreeTapLine(h, gridSize)) reasons.push("ambiguous-triple");
  if (prevH && prevH[0] === h[0] && prevH[1] === h[1]) reasons.push("same-as-prev-day");
  if (nextH && nextH[0] === h[0] && nextH[1] === h[1]) reasons.push("same-as-next-day");
  return reasons;
}

export function isPublishable(
  h: Cell,
  prevH: Cell | null = null,
  nextH: Cell | null = null,
  gridSize: BoardSize = 12,
): boolean {
  return rejectionReasons(h, prevH, nextH, gridSize).length === 0;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function candidateFromHash(
  dateStr: string,
  attempt: number,
  gridSize: BoardSize = 12,
): Cell {
  const h = hashString(`PING:${gridSize}:${dateStr}:${attempt}`);
  return [h % gridSize, Math.floor(h / gridSize) % gridSize];
}

function pickFromPool(dateStr: string, attempt: number, gridSize: BoardSize): Cell {
  const pool = publishablePool(gridSize);
  const idx = hashString(`PING:${gridSize}:${dateStr}:${attempt}`) % pool.length;
  return pool[idx];
}

const publishCache = new Map<string, Cell>();

function cacheKey(dateStr: string, gridSize: BoardSize): string {
  return `${gridSize}:${dateStr}`;
}

function generateForDate(dateStr: string, prevH: Cell, gridSize: BoardSize): Cell {
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const h = pickFromPool(dateStr, attempt, gridSize);
    if (prevH[0] === h[0] && prevH[1] === h[1]) continue;
    if (!hasUniqueThreeTapLine(h, gridSize)) continue;
    return h;
  }

  throw new Error(`No publishable H for ${dateStr} on ${gridSize}×${gridSize}`);
}

function ensureGeneratedThrough(targetDate: string, gridSize: BoardSize): void {
  const epochKey = cacheKey(PING_EPOCH_UTC, gridSize);
  if (!publishCache.has(epochKey)) {
    const bootstrapPrev: Cell = [0, 0];
    publishCache.set(epochKey, generateForDate(PING_EPOCH_UTC, bootstrapPrev, gridSize));
  }

  let cursor = PING_EPOCH_UTC;
  const targetMs = Date.parse(`${targetDate}T00:00:00.000Z`);

  while (Date.parse(`${cursor}T00:00:00.000Z`) < targetMs) {
    const next = addUtcDays(cursor, 1);
    const nextKey = cacheKey(next, gridSize);
    if (!publishCache.has(nextKey)) {
      publishCache.set(
        nextKey,
        generateForDate(next, publishCache.get(cacheKey(cursor, gridSize))!, gridSize),
      );
    }
    cursor = next;
  }
}

/** Generate a publishable H for a UTC calendar date and board size. */
export function generateH(
  dateStr: string,
  gridSize: BoardSize = 12,
  opts: GenerateOptions = {},
): Cell {
  if (opts.force) {
    return opts.force;
  }

  if (opts.prevH) {
    return generateForDate(dateStr, opts.prevH, gridSize);
  }

  ensureGeneratedThrough(dateStr, gridSize);

  const key = cacheKey(dateStr, gridSize);
  if (publishCache.has(key)) {
    return publishCache.get(key)!;
  }

  const prev = publishCache.get(cacheKey(addUtcDays(dateStr, -1), gridSize));
  if (!prev) {
    throw new Error(`Cannot generate H before ${PING_EPOCH_UTC}: ${dateStr}`);
  }
  const h = generateForDate(dateStr, prev, gridSize);
  publishCache.set(key, h);
  return h;
}

export function allCells(gridSize: BoardSize = 12): Cell[] {
  return gridRules(gridSize).allCells;
}

export { maxManhattanDistance };
