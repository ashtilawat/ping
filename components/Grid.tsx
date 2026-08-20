"use client";

import type { CSSProperties } from "react";
import { GRID_SIZE } from "@/lib/generator";
import type { Cell } from "@/lib/manhattan";
import { proximityFromDistance } from "@/lib/proximity";

export type CellState = {
  distance: number | null;
  tapped: boolean;
};

type GridProps = {
  cellStates: CellState[][];
  locked: boolean;
  onCellTap: (row: number, col: number) => void;
  hidden?: Cell | null;
  revealHidden?: boolean;
};

export function Grid({
  cellStates,
  locked,
  onCellTap,
  hidden = null,
  revealHidden = false,
}: GridProps) {
  const showHidden =
    revealHidden && hidden !== null && locked;

  return (
    <div className="grid-wrap">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        }}
        role="grid"
        aria-label="PING game board"
      >
        {cellStates.map((row, r) =>
          row.map((cell, c) => {
            const isHiddenCell =
              showHidden && hidden![0] === r && hidden![1] === c;
            const isWin = cell.tapped && cell.distance === 0;
            const proximity =
              cell.tapped && cell.distance !== null
                ? proximityFromDistance(cell.distance)
                : undefined;

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={[
                  "cell",
                  cell.tapped ? "tapped" : "",
                  isWin ? "win-tap" : "",
                  isHiddenCell ? "hidden-reveal" : "",
                  locked ? "locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  proximity !== undefined
                    ? ({ "--proximity": proximity } as CSSProperties)
                    : undefined
                }
                data-testid={`cell-${r}-${c}`}
                aria-label={
                  isHiddenCell
                    ? `Hidden signal at row ${r} column ${c}`
                    : cell.tapped
                      ? `Cell row ${r} column ${c}, distance ${cell.distance}`
                      : `Cell row ${r} column ${c}`
                }
                disabled={locked}
                onClick={() => onCellTap(r, c)}
              >
                {cell.tapped && cell.distance !== null
                  ? cell.distance
                  : isHiddenCell
                    ? "H"
                    : ""}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
