"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "@/components/Grid";
import { ShareButton } from "@/components/ShareButton";
import { puzzleDateForInstant, puzzleNumber } from "@/lib/epoch";
import { GRID_SIZE } from "@/lib/generator";
import { isOnGrid } from "@/lib/manhattan";
import { closestDistance } from "@/lib/proximity";
import { seedForDate } from "@/lib/seed";
import {
  applyTap,
  emptyCellGrid,
  MAX_TAPS,
  restoreSession,
  saveSession,
  type SessionSnapshot,
} from "@/lib/session";

export default function Home() {
  const puzzleDateRef = useRef<string>(puzzleDateForInstant(new Date()));
  const dateStr = puzzleDateRef.current;

  const hidden = useMemo(() => seedForDate(dateStr), [dateStr]);
  const puzzleNum = useMemo(() => puzzleNumber(dateStr), [dateStr]);

  const [cellStates, setCellStates] = useState(emptyCellGrid);
  const [taps, setTaps] = useState<SessionSnapshot["taps"]>([]);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restored = restoreSession(dateStr);
    setCellStates(restored.cellStates);
    setTaps(restored.taps);
    setLocked(restored.locked);
    setWon(restored.won);
    setHydrated(true);
  }, [dateStr]);

  useEffect(() => {
    if (!hydrated) return;
    saveSession({ dateStr, taps, locked, won });
  }, [dateStr, taps, locked, won, hydrated]);

  const onCellTap = useCallback(
    (row: number, col: number) => {
      if (locked) return;
      if (!isOnGrid(row, col, GRID_SIZE)) return;

      setTaps((prevTaps) => {
        const snapshot: SessionSnapshot = {
          dateStr,
          taps: prevTaps,
          locked,
          won,
        };
        const next = applyTap(snapshot, hidden, row, col);
        if (next.taps.length === prevTaps.length) return prevTaps;

        const latest = next.taps[next.taps.length - 1];
        setCellStates((prevCells) => {
          const cells = prevCells.map((r) => r.map((c) => ({ ...c })));
          cells[latest.row][latest.col] = {
            distance: latest.distance,
            tapped: true,
          };
          return cells;
        });

        if (next.won !== won) setWon(next.won);
        if (next.locked !== locked) setLocked(next.locked);

        return next.taps;
      });
    },
    [dateStr, hidden, locked, won],
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
