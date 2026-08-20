"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Grid, type CellState } from "@/components/Grid";
import { ShareButton } from "@/components/ShareButton";
import { puzzleDateForInstant, puzzleNumber } from "@/lib/epoch";
import { GRID_SIZE } from "@/lib/generator";
import { isOnGrid, manhattan } from "@/lib/manhattan";
import { closestDistance } from "@/lib/proximity";
import { seedForDate } from "@/lib/seed";
import type { TapRecord } from "@/lib/share";

const MAX_TAPS = 4;

function emptyGrid(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ distance: null, tapped: false })),
  );
}

export default function Home() {
  const puzzleDateRef = useRef<string>(puzzleDateForInstant(new Date()));
  const dateStr = puzzleDateRef.current;

  const hidden = useMemo(() => seedForDate(dateStr), [dateStr]);
  const puzzleNum = useMemo(() => puzzleNumber(dateStr), [dateStr]);

  const [cellStates, setCellStates] = useState<CellState[][]>(emptyGrid);
  const [taps, setTaps] = useState<TapRecord[]>([]);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);

  const onCellTap = useCallback(
    (row: number, col: number) => {
      if (locked) return;
      if (!isOnGrid(row, col, GRID_SIZE)) return;

      setTaps((prevTaps) => {
        if (prevTaps.length >= MAX_TAPS) return prevTaps;
        if (prevTaps.some((t) => t.row === row && t.col === col)) return prevTaps;

        const d = manhattan(hidden, [row, col]);
        const updated = [...prevTaps, { row, col, distance: d }];

        setCellStates((prevCells) => {
          const next = prevCells.map((r) => r.map((c) => ({ ...c })));
          next[row][col] = { distance: d, tapped: true };
          return next;
        });

        if (d === 0) {
          setWon(true);
          setLocked(true);
        } else if (updated.length >= MAX_TAPS) {
          setLocked(true);
        }

        return updated;
      });
    },
    [hidden, locked],
  );

  const finished = locked;
  const tapsRemaining = MAX_TAPS - taps.length;
  const closest = closestDistance(taps);

  let status: string;
  if (finished) {
    if (won) {
      status = "Signal found.";
    } else if (closest !== null) {
      status = `Closest: ${closest}`;
    } else {
      status = "Out of taps.";
    }
  } else {
    status = `${tapsRemaining} tap${tapsRemaining === 1 ? "" : "s"} left`;
  }

  return (
    <main>
      <header className="header">
        <h1>PING</h1>
        <span className="puzzle-id">#{puzzleNum}</span>
      </header>

      <p className="tagline">4 taps · 0 wins</p>

      <Grid
        cellStates={cellStates}
        locked={locked}
        onCellTap={onCellTap}
        hidden={hidden}
        revealHidden={finished && !won}
      />

      <p
        className={["status", finished && !won ? "status-lose" : ""]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
      >
        {status}
      </p>

      <ShareButton
        dateStr={dateStr}
        taps={taps}
        won={won}
        finished={finished}
      />
    </main>
  );
}
