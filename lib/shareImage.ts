import { type BoardSize, maxManhattanDistance } from "./boards";
import { puzzleNumber } from "./epoch";
import type { BoardShareResult } from "./share";
import {
  isWinTap,
  shareImageCellLabel,
  shareImageScoreLine,
} from "./shareImageLayout";

export type ShareImageInput = {
  dateStr: string;
  boards: BoardShareResult[];
};

export { shareImageCellLabel, shareImageScoreLine, isWinTap } from "./shareImageLayout";

const BG = "#12141a";
const CELL_EMPTY = "#252932";
const CELL_BORDER = "#3d4450";
const CELL_TAPPED = "#1a1d24";
const RING = "#9aa3b0";
const TEXT = "#e4e6eb";
const TEXT_DIM = "#8b919a";
const WIN_RING = "#e4e6eb";

function tapAt(
  taps: BoardShareResult["taps"],
  row: number,
  col: number,
): BoardShareResult["taps"][number] | undefined {
  return taps.find((t) => t.row === row && t.col === col);
}

function proximityFromDistance(distance: number, gridSize: BoardSize): number {
  if (distance === 0) return 1;
  return Math.max(0, 1 - distance / maxManhattanDistance(gridSize));
}

function cellSizeForBoard(size: BoardSize): number {
  if (size === 4) return 22;
  if (size === 6) return 16;
  return 10;
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: BoardShareResult,
  x: number,
  y: number,
  cellSize: number,
  gap: number,
): number {
  const gridSize = board.size;
  const gridPx = gridSize * cellSize + (gridSize - 1) * gap;

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "600 11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(shareImageScoreLine(board.won, board.taps.length, board.size), x, y - 8);

  const gridTop = y + 6;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cx = x + c * (cellSize + gap);
      const cy = gridTop + r * (cellSize + gap);
      const tap = tapAt(board.taps, r, c);

      ctx.fillStyle = tap ? CELL_TAPPED : CELL_EMPTY;
      ctx.strokeStyle = tap ? (isWinTap(tap) ? WIN_RING : RING) : CELL_BORDER;
      ctx.lineWidth = tap ? (isWinTap(tap) ? 2 : 1.5) : 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cellSize, cellSize, 2);
      ctx.fill();
      ctx.stroke();

      if (tap) {
        const prox = proximityFromDistance(tap.distance, gridSize);
        const lum = isWinTap(tap) ? 100 : Math.round(55 + prox * 45);
        ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`;
        const label = shareImageCellLabel(tap);
        const fontSize = isWinTap(tap)
          ? Math.max(10, cellSize * 0.45)
          : tap.distance >= 10
            ? Math.max(8, cellSize * 0.35)
            : Math.max(9, cellSize * 0.4);
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, cx + cellSize / 2, cy + cellSize / 2);

        if (!isWinTap(tap)) {
          ctx.strokeStyle = `rgba(154, 163, 176, ${0.4 + prox * 0.6})`;
          ctx.lineWidth = 1 + prox * 1.5;
          ctx.beginPath();
          ctx.roundRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 2);
          ctx.stroke();
        }
      }
    }
  }

  return gridPx + 22;
}

/**
 * Render a spoiler-free share card PNG: wordmark, three stacked boards, scores.
 * Never reveals H or coordinates.
 */
export function buildShareImage(input: ShareImageInput): Promise<Blob> {
  const n = puzzleNumber(input.dateStr);
  const pad = 20;
  const width = 280;

  const boardHeights = input.boards.map((board) => {
    const cellSize = cellSizeForBoard(board.size);
    const gap = 2;
    const gridPx = board.size * cellSize + (board.size - 1) * gap;
    return gridPx + 22;
  });
  const boardsH = boardHeights.reduce((a, b) => a + b, 0) + (input.boards.length - 1) * 12;
  const headerH = 44;
  const height = pad + headerH + boardsH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT;
  ctx.font = "700 20px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PING", width / 2 - 16, pad + 16);

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(`#${n}`, width / 2 + 30, pad + 16);

  let y = pad + headerH;
  const gridLeft = (width - Math.max(...input.boards.map((b) => {
    const cellSize = cellSizeForBoard(b.size);
    return b.size * cellSize + (b.size - 1) * 2;
  }))) / 2;

  for (const board of input.boards) {
    const cellSize = cellSizeForBoard(board.size);
    const gap = 2;
    const used = drawBoard(ctx, board, gridLeft, y + 14, cellSize, gap);
    y += used + 12;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to render share image"))),
      "image/png",
    );
  });
}
