export type Cell = readonly [row: number, col: number];

/** Manhattan distance between two grid cells. */
export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

/** True when (r, c) is an on-grid cell in a GRID_SIZE × GRID_SIZE board. */
export function isOnGrid(r: number, c: number, gridSize = 12): boolean {
  return r >= 0 && r < gridSize && c >= 0 && c < gridSize;
}
