"use client";

import { GRID_SIZE } from "@/lib/generator";

export type CellState = {
  distance: number | null;
  tapped: boolean;
};

type GridProps = {
  cellStates: CellState[][];
  locked: boolean;
  onCellTap: (row: number, col: number) => void;
};

export function Grid({ cellStates, locked, onCellTap }: GridProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
      }}
      role="grid"
      aria-label="PING game board"
    >
      {cellStates.map((row, r) =>
        row.map((cell, c) => (
          <button
            key={`${r}-${c}`}
            type="button"
            className={`cell${cell.tapped ? " tapped" : ""}${locked ? " locked" : ""}`}
            data-testid={`cell-${r}-${c}`}
            aria-label={
              cell.tapped
                ? `Cell row ${r} column ${c}, distance ${cell.distance}`
                : `Cell row ${r} column ${c}`
            }
            disabled={locked}
            onClick={() => onCellTap(r, c)}
          >
            {cell.tapped && cell.distance !== null ? cell.distance : ""}
          </button>
        )),
      )}
    </div>
  );
}
