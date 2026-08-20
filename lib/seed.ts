import { type BoardSize } from "./boards";
import { type Cell } from "./manhattan";
import { generateH, type GenerateOptions } from "./generator";

/** Return the published hidden cell H for a UTC calendar date and board size. */
export function seedForDate(
  dateStr: string,
  gridSize: BoardSize = 12,
  opts?: GenerateOptions,
): Cell {
  return generateH(dateStr, gridSize, opts);
}

/** Test-only override: force H for scoring without publishing center seeds. */
export function forcedH(row: number, col: number): Cell {
  return [row, col] as Cell;
}

export type { GenerateOptions };
