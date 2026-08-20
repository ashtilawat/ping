import { type BoardSize, maxManhattanDistance } from "./boards";

/** Normalized closeness in [0, 1]; 1 = on target (distance 0). */
export function proximityFromDistance(distance: number, gridSize: BoardSize = 12): number {
  if (distance === 0) return 1;
  const maxD = maxManhattanDistance(gridSize);
  return Math.max(0, 1 - distance / maxD);
}

/** Minimum distance among taps; null when no taps yet. */
export function closestDistance(
  taps: readonly { distance: number }[],
): number | null {
  if (taps.length === 0) return null;
  return Math.min(...taps.map((t) => t.distance));
}
