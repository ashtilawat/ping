import type { TapRecord } from "./share";
import { boardLabel, type BoardSize } from "./boards";

export const TARGET_MARK = "🎯";

/** Label shown inside a tapped grid cell on the share card. Never returns "0". */
export function shareImageCellLabel(tap: TapRecord): string {
  if (tap.distance === 0) return TARGET_MARK;
  return String(tap.distance);
}

/** Footer score line for one board on the share card. */
export function shareImageScoreLine(won: boolean, tapCount: number, size: BoardSize): string {
  const label = boardLabel(size);
  if (won) return `${label} ${tapCount}/4 ${TARGET_MARK}`;
  return `${label} X/4`;
}

/** True when a tap is the winning hit (distance 0). */
export function isWinTap(tap: TapRecord): boolean {
  return tap.distance === 0;
}
