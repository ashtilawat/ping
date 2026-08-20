import { boardLabel, BOARD_SIZES, type BoardSize } from "./boards";
import { puzzleNumber } from "./epoch";

export type TapRecord = {
  row: number;
  col: number;
  distance: number;
};

export type BoardShareResult = {
  size: BoardSize;
  taps: TapRecord[];
  won: boolean;
};

export type ShareInput = {
  dateStr: string;
  boards: BoardShareResult[];
};

function boardShareLines(board: BoardShareResult): string[] {
  const label = boardLabel(board.size);
  const lines: string[] = [];

  if (board.won) {
    lines.push(`${label} ${board.taps.length}/4`);
    for (const tap of board.taps) {
      if (tap.distance === 0) continue;
      lines.push(`📡${tap.distance}`);
    }
    lines.push("🎯");
  } else {
    lines.push(`${label} X/4`);
    for (const tap of board.taps) {
      lines.push(`📡${tap.distance}`);
    }
  }

  return lines;
}

/**
 * Build the exact share string for a finished three-board daily.
 * Never includes H, coordinates, or 📡0 lines.
 */
export function buildShareText(input: ShareInput): string {
  const n = puzzleNumber(input.dateStr);
  const lines: string[] = [`PING #${n}`];

  for (const board of input.boards) {
    lines.push(...boardShareLines(board));
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

export { BOARD_SIZES };
