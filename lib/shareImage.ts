import { GRID_SIZE } from "./generator";
import { puzzleNumber } from "./epoch";
import type { TapRecord } from "./share";

export type ShareImageInput = {
  dateStr: string;
  taps: TapRecord[];
  won: boolean;
};

const BG = "#12141a";
const CELL_EMPTY = "#252932";
const CELL_BORDER = "#3d4450";
const CELL_TAPPED = "#1a1d24";
const RING = "#9aa3b0";
const TEXT = "#e4e6eb";
const TEXT_DIM = "#8b919a";

function tapAt(taps: TapRecord[], row: number, col: number): TapRecord | undefined {
  return taps.find((t) => t.row === row && t.col === col);
}

/**
 * Render a spoiler-free share card PNG: wordmark, square grid with tap pings, score.
 * Never reveals H or coordinates.
 */
export function buildShareImage(input: ShareImageInput): Promise<Blob> {
  const n = puzzleNumber(input.dateStr);
  const scoreLabel = input.won ? `${input.taps.length}/4` : "X/4";

  const cellSize = 28;
  const gap = 2;
  const gridPx = GRID_SIZE * cellSize + (GRID_SIZE - 1) * gap;
  const pad = 24;
  const headerH = 52;
  const scoreH = 36;
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
      ctx.strokeStyle = tap ? RING : CELL_BORDER;
      ctx.lineWidth = tap ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, 3);
      ctx.fill();
      ctx.stroke();

      if (tap) {
        const prox = Math.max(0, 1 - tap.distance / 22);
        const lum = Math.round(55 + prox * 45);
        ctx.fillStyle = `rgb(${lum}, ${lum}, ${lum})`;
        ctx.font = `600 ${tap.distance >= 10 ? 11 : 13}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(tap.distance), x + cellSize / 2, y + cellSize / 2);

        if (tap.distance > 0) {
          ctx.strokeStyle = `rgba(154, 163, 176, ${0.4 + prox * 0.6})`;
          ctx.lineWidth = 1 + prox * 2;
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
  ctx.fillText(scoreLabel, width / 2, gridTop + gridPx + scoreH / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to render share image"))),
      "image/png",
    );
  });
}
