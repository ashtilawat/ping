import {
  BOARD_COUNT,
  BOARD_SIZES,
  type BoardSize,
} from "./boards";
import type { Cell } from "./manhattan";
import { isOnGrid, manhattan } from "./manhattan";
import type { TapRecord } from "./share";

export type CellState = {
  distance: number | null;
  tapped: boolean;
};

export type BoardSnapshot = {
  taps: TapRecord[];
  locked: boolean;
  won: boolean;
};

export type SessionSnapshot = {
  dateStr: string;
  /** Index of the active board (0–2), or BOARD_COUNT when all boards are done. */
  boardIndex: number;
  boards: [BoardSnapshot, BoardSnapshot, BoardSnapshot];
  complete: boolean;
};

export const SESSION_STORAGE_KEY = "ping-session-v2";
export const MAX_TAPS = 4;

export type SessionStorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const noopStorage: SessionStorageAdapter = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let storageOverride: SessionStorageAdapter | null = null;

/** Test hook: inject in-memory storage. Pass null to reset. */
export function setSessionStorageOverride(adapter: SessionStorageAdapter | null): void {
  storageOverride = adapter;
}

export function createMemorySessionStorage(): SessionStorageAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function resolveStorage(): SessionStorageAdapter {
  if (storageOverride) return storageOverride;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return noopStorage;
}

export function emptyBoardSnapshot(): BoardSnapshot {
  return { taps: [], locked: false, won: false };
}

export function freshSession(dateStr: string): SessionSnapshot {
  return {
    dateStr,
    boardIndex: 0,
    boards: [emptyBoardSnapshot(), emptyBoardSnapshot(), emptyBoardSnapshot()],
    complete: false,
  };
}

export function emptyCellGrid(gridSize: BoardSize): CellState[][] {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({ distance: null, tapped: false })),
  );
}

export function cellGridFromTaps(
  taps: readonly TapRecord[],
  gridSize: BoardSize,
): CellState[][] {
  const grid = emptyCellGrid(gridSize);
  for (const tap of taps) {
    if (!isOnGrid(tap.row, tap.col, gridSize)) continue;
    grid[tap.row][tap.col] = { distance: tap.distance, tapped: true };
  }
  return grid;
}

export function boardSizeAt(index: number): BoardSize {
  if (index < 0 || index >= BOARD_COUNT) {
    return BOARD_SIZES[BOARD_COUNT - 1];
  }
  return BOARD_SIZES[index];
}

export function activeBoardIndex(session: SessionSnapshot): number {
  if (session.complete) return BOARD_COUNT - 1;
  return Math.min(session.boardIndex, BOARD_COUNT - 1);
}

export function activeBoardSize(session: SessionSnapshot): BoardSize {
  return boardSizeAt(activeBoardIndex(session));
}

function isValidBoardSnapshot(value: unknown, gridSize: BoardSize): value is BoardSnapshot {
  if (!value || typeof value !== "object") return false;
  const board = value as BoardSnapshot;
  if (typeof board.locked !== "boolean") return false;
  if (typeof board.won !== "boolean") return false;
  if (!Array.isArray(board.taps)) return false;
  if (board.taps.length > MAX_TAPS) return false;
  for (const tap of board.taps) {
    if (typeof tap.row !== "number" || typeof tap.col !== "number") return false;
    if (typeof tap.distance !== "number" || tap.distance < 0) return false;
    if (!isOnGrid(tap.row, tap.col, gridSize)) return false;
  }
  if (board.won && !board.locked) return false;
  if (board.won && !board.taps.some((t) => t.distance === 0)) return false;
  if (board.locked && board.taps.length === 0) return false;
  return true;
}

function isValidSnapshot(value: unknown): value is SessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as SessionSnapshot;
  if (typeof s.dateStr !== "string") return false;
  if (typeof s.boardIndex !== "number") return false;
  if (typeof s.complete !== "boolean") return false;
  if (!Array.isArray(s.boards) || s.boards.length !== BOARD_COUNT) return false;
  if (s.boardIndex < 0 || s.boardIndex > BOARD_COUNT) return false;

  for (let i = 0; i < BOARD_COUNT; i++) {
    if (!isValidBoardSnapshot(s.boards[i], BOARD_SIZES[i])) return false;
  }

  if (s.complete && s.boardIndex !== BOARD_COUNT) return false;
  if (s.complete && s.boards.some((b) => !b.locked)) return false;
  if (!s.complete && s.boardIndex < BOARD_COUNT && !s.boards[s.boardIndex].locked) {
    for (let i = 0; i < s.boardIndex; i++) {
      if (!s.boards[i].locked) return false;
    }
  }
  if (!s.complete && s.boardIndex === BOARD_COUNT) return false;

  return true;
}

/** Load persisted session for today's puzzle date, or null if none / stale. */
export function loadSession(
  dateStr: string,
  storage: SessionStorageAdapter = resolveStorage(),
): SessionSnapshot | null {
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSnapshot(parsed)) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    if (parsed.dateStr !== dateStr) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveSession(
  snapshot: SessionSnapshot,
  storage: SessionStorageAdapter = resolveStorage(),
): void {
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
}

export type RestoredSession = {
  session: SessionSnapshot;
  cellStates: CellState[][];
  gridSize: BoardSize;
};

/** Restore UI state from storage for the current puzzle date. */
export function restoreSession(
  dateStr: string,
  storage: SessionStorageAdapter = resolveStorage(),
): RestoredSession {
  const saved = loadSession(dateStr, storage);
  const session = saved ?? freshSession(dateStr);
  const gridSize = activeBoardSize(session);
  const board = session.boards[activeBoardIndex(session)];

  return {
    session,
    cellStates: cellGridFromTaps(board.taps, gridSize),
    gridSize,
  };
}

/** Apply one legal tap to the active board; returns unchanged snapshot when tap is ignored. */
export function applyTap(
  snapshot: SessionSnapshot,
  hidden: Cell,
  row: number,
  col: number,
  gridSize: BoardSize = activeBoardSize(snapshot),
): SessionSnapshot {
  if (snapshot.complete) return snapshot;

  const index = activeBoardIndex(snapshot);
  const board = snapshot.boards[index];
  if (board.locked) return snapshot;
  if (!isOnGrid(row, col, gridSize)) return snapshot;
  if (board.taps.length >= MAX_TAPS) return snapshot;
  if (board.taps.some((t) => t.row === row && t.col === col)) return snapshot;

  const distance = manhattan(hidden, [row, col]);
  const taps = [...board.taps, { row, col, distance }];
  const won = distance === 0;
  const locked = won || taps.length >= MAX_TAPS;
  const nextBoard: BoardSnapshot = { taps, locked, won };

  const boards = [...snapshot.boards] as SessionSnapshot["boards"];
  boards[index] = nextBoard;

  if (locked && index < BOARD_COUNT - 1) {
    return {
      ...snapshot,
      boards,
      boardIndex: index + 1,
    };
  }

  if (locked && index === BOARD_COUNT - 1) {
    return {
      ...snapshot,
      boards,
      boardIndex: BOARD_COUNT,
      complete: true,
    };
  }

  return { ...snapshot, boards };
}

/** Simulate a page refresh: reload from storage for the same puzzle date. */
export function simulateRefresh(
  dateStr: string,
  storage: SessionStorageAdapter = resolveStorage(),
): RestoredSession {
  return restoreSession(dateStr, storage);
}

export function tapsRemaining(taps: readonly TapRecord[]): number {
  return MAX_TAPS - taps.length;
}

export function allBoardsFinished(session: SessionSnapshot): boolean {
  return session.complete;
}
