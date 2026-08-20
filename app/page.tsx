"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Grid, type CellState } from "@/components/Grid";
import { Rules } from "@/components/Rules";
import { ShareButton } from "@/components/ShareButton";
import { puzzleDateForInstant, puzzleNumber } from "@/lib/epoch";
import { GRID_SIZE } from "@/lib/generator";
import { isOnGrid, manhattan } from "@/lib/manhattan";
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

  return (
    <main>
      <h1>PING</h1>
      <Rules />
      <p className="status">
        #{puzzleNum} · {tapsRemaining} tap{tapsRemaining === 1 ? "" : "s"} left
      </p>
      <Grid cellStates={cellStates} locked={locked} onCellTap={onCellTap} />
      {finished && (
        <p className={`result ${won ? "win" : "lose"}`}>
          {won ? "Signal found!" : "Out of taps."}
        </p>
      )}
      <ShareButton
        dateStr={dateStr}
        taps={taps}
        won={won}
        finished={finished}
      />
    </main>
  );
}
