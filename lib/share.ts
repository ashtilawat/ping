import { puzzleNumber } from "./epoch";

export type TapRecord = {
  row: number;
  col: number;
  distance: number;
};

export type ShareInput = {
  dateStr: string;
  taps: TapRecord[];
  won: boolean;
};

/**
 * Build the exact share string for a finished game.
 * Never includes H, coordinates, or 📡0 lines.
 */
export function buildShareText(input: ShareInput): string {
  const n = puzzleNumber(input.dateStr);
  const lines: string[] = [];

  if (input.won) {
    const k = input.taps.length;
    lines.push(`PING #${n} ${k}/4`);
    for (const tap of input.taps) {
      if (tap.distance === 0) continue;
      lines.push(`📡${tap.distance}`);
    }
    lines.push("🎯");
  } else {
    lines.push(`PING #${n} X/4`);
    for (const tap of input.taps) {
      lines.push(`📡${tap.distance}`);
    }
  }

  return lines.join("\n");
}

export function shareTitle(dateStr: string): string {
  const n = puzzleNumber(dateStr);
  return `PING #${n}`;
}

/** Share URL must not encode row/col or H. */
export function shareUrl(origin: string): string {
  const url = new URL("/", origin);
  return url.toString();
}
