import { GRID_SIZE } from "./generator";
import { puzzleNumber } from "./epoch";
import type { TapRecord } from "./share";
import {
  isWinTap,
  shareImageCellLabel,
  shareImageScoreLine,
} from "./shareImageLayout";

export type ShareImageInput = {
  dateStr: string;
  taps: TapRecord[];
  won: boolean;
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

function tapAt(taps: TapRecord[], row: number, col: number): TapRecord | undefined {
  return taps.find((t) => t.row === row && t.col === col);
}

function proximityFromDistance(distance: number): number {
  if (distance === 0) return 1;
  return Math.max(0, 1 - distance / 22);
}

/**
 * Render a spoiler-free share card PNG: wordmark, square grid with tap pings, score.
 * Win cards show k/4 + 🎯; lose cards show X/4. Never reveals H or coordinates.
 */
export function buildShareImage(input: ShareImageInput): Promise<Blob> {
  const n = puzzleNumber(input.dateStr);
  const scoreLine = shareImageScoreLine(input.won, input.taps.length);

  const cellSize = 28;
  const gap = 2;
  const gridPx = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;
  const pad = 24;
  const headerH = 52;
  const scoreH = 40;
  const width = gridPx + pad * 2;
  const height = pad + headerH + gridPx + scoreH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = TEXT;
  ctx.font = "700 22px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PING", width / 2 - 18, pad + 18);

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "500 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(`#${n}`, width / 2 + 34, pad + 18);

  const gridTop = pad + headerH;
  const gridLeft = pad;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = gridLeft + c * (cellSize + gap);
      const y = gridTop + r * (cellSize + gap);
      const tap = tapAt(input.taps, r, c);

      ctx.fillStyle = tap ? CELL_TAPPED : CELL_EMPTY;
      ctx.strokeStyle = tap ? (isWinTap(tap) ? WIN_RING : RING) : CELL_BORDER;
      ctx.lineWidth = tap ? (isWinTap(tap) ? 2.5 : 2) : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, 3);
      ctx.fill();
      ctx.stroke();

      if (tap) {
        const prox = proximityFromDistance(tap.distance);
        const lum = isWinTap(tap) ? 100 : Math.round(55 + prox * 45);
        ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`;
        const label = shareImageCellLabel(tap);
        const fontSize = isWinTap(tap) ? 14 : tap.distance >= 10 ? 11 : 13;
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + cellSize / 2, y + cellSize / 2);

        if (!isWinTap(tap)) {
          ctx.strokeStyle = `rgba(154, 163, 176, ${0.4 + prox * 0.6})`;
          ctx.lineWidth = 1 + prox * 2;
          ctx.beginPath();
          ctx.roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = WIN_RING;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 2);
          ctx.stroke();
        }
      }
    }
  }

  ctx.fillStyle = input.won ? TEXT : TEXT_DIM;
  ctx.font = "700 20px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(scoreLine, width / 2, gridTop + gridPx + scoreH / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to render share image"))),
      "image/png",
    );
  });
}
