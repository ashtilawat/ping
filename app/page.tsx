"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "@/components/Grid";
import { ShareButton } from "@/components/ShareButton";
import { boardLabel } from "@/lib/boards";
import { puzzleDateForInstant } from "@/lib/epoch";
import { isOnGrid } from "@/lib/manhattan";
import { closestDistance } from "@/lib/proximity";
import { seedForDate } from "@/lib/seed";
import type { BoardShareResult } from "@/lib/share";
import {
  activeBoardIndex,
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

  const hiddenByBoard = useMemo(
    () => ({
      4: seedForDate(dateStr, 4),
      6: seedForDate(dateStr, 6),
      12: seedForDate(dateStr, 12),
    }),
    [dateStr],
  );

  const [session, setSession] = useState<SessionSnapshot>(() => ({
    dateStr,
    boardIndex: 0,
    boards: [
      { taps: [], locked: false, won: false },
      { taps: [], locked: false, won: false },
      { taps: [], locked: false, won: false },
    ],
    complete: false,
  }));
  const [cellStates, setCellStates] = useState(() => emptyCellGrid(4));
  const [gridSize, setGridSize] = useState<4 | 6 | 12>(4);
  const [hydrated, setHydrated] = useState(false);

  const boardIndex = activeBoardIndex(session);
  const activeBoard = session.boards[boardIndex];
  const hidden = hiddenByBoard[gridSize];
  const finished = session.complete;

  useEffect(() => {
    const restored = restoreSession(dateStr);
    setSession(restored.session);
    setCellStates(restored.cellStates);
    setGridSize(restored.gridSize);
    setHydrated(true);
  }, [dateStr]);

  useEffect(() => {
    if (!hydrated) return;
    saveSession(session);
  }, [session, hydrated]);

  const syncActiveBoard = useCallback(
    (nextSession: SessionSnapshot) => {
      const index = activeBoardIndex(nextSession);
      const size = index === 3 ? 12 : ([4, 6, 12] as const)[index];
      const board = nextSession.boards[index];
      setSession(nextSession);
      setGridSize(size);
      setCellStates(emptyCellGrid(size).map((row, r) =>
        row.map((cell, c) => {
          const tap = board.taps.find((t) => t.row === r && t.col === c);
          if (!tap) return cell;
          return { distance: tap.distance, tapped: true };
        }),
      ));
    },
    [],
  );

  const onCellTap = useCallback(
    (row: number, col: number) => {
      if (session.complete) return;
      if (!isOnGrid(row, col, gridSize)) return;

      const next = applyTap(session, hidden, row, col, gridSize);
      if (next.boards[boardIndex].taps.length === session.boards[boardIndex].taps.length) {
        return;
      }

      const latest = next.boards[boardIndex].taps.at(-1)!;
      setCellStates((prevCells) => {
        const cells = prevCells.map((r) => r.map((c) => ({ ...c })));
        cells[latest.row][latest.col] = {
          distance: latest.distance,
          tapped: true,
        };
        return cells;
      });

      const advanced = next.boardIndex !== session.boardIndex || next.complete;
      if (advanced) {
        syncActiveBoard(next);
      } else {
        setSession(next);
      }
    },
    [session, hidden, gridSize, boardIndex, syncActiveBoard],
  );

  const tapsRemaining = MAX_TAPS - activeBoard.taps.length;
  const closest = closestDistance(activeBoard.taps);
  const boardLocked = activeBoard.locked;

  let status: string;
  if (finished) {
    const wins = session.boards.filter((b) => b.won).length;
    status = wins === 3 ? "All signals found." : `${wins}/3 boards won.`;
  } else if (boardLocked) {
    if (activeBoard.won) {
      status = "Signal found.";
    } else if (closest !== null) {
      status = `Closest: ${closest}`;
    } else {
      status = "Out of taps.";
    }
  } else {
    status = `${tapsRemaining} tap${tapsRemaining === 1 ? "" : "s"} left`;
  }

  const shareBoards: BoardShareResult[] = session.boards.map((board, i) => ({
    size: ([4, 6, 12] as const)[i],
    taps: board.taps,
    won: board.won,
  }));

  return (
    <main>
      <header className="header">
        <h1>PING</h1>
      </header>

      <p className="tagline">{boardLabel(gridSize)} · 4 taps · 0 wins</p>

      <Grid
        gridSize={gridSize}
        cellStates={cellStates}
        locked={boardLocked || finished}
        onCellTap={onCellTap}
        hidden={hidden}
        revealHidden={boardLocked && !activeBoard.won}
      />

      <p
        className={["status", boardLocked && !activeBoard.won && !finished ? "status-lose" : ""]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
      >
        {status}
      </p>

      <ShareButton
        dateStr={dateStr}
        boards={shareBoards}
        finished={finished}
      />
    </main>
  );
}
