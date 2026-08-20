/** Daily session plays three boards in this order. */
export const BOARD_SIZES = [4, 6, 12] as const;

export type BoardSize = (typeof BOARD_SIZES)[number];

export const BOARD_COUNT = BOARD_SIZES.length;

export function boardLabel(size: BoardSize): string {
  return `${size}×${size}`;
}

export function isBoardSize(n: number): n is BoardSize {
  return (BOARD_SIZES as readonly number[]).includes(n);
}

/** Max Manhattan distance on an empty board (corner to opposite corner). */
export function maxManhattanDistance(size: BoardSize): number {
  return (size - 1) * 2;
}
