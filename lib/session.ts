import { GRID_SIZE } from "./generator";
import type { Cell } from "./manhattan";
import { isOnGrid, manhattan } from "./manhattan";
import type { TapRecord } from "./share";

export type CellState = {
  distance: number | null;
  tapped: boolean;
};

export type SessionSnapshot = {
  dateStr: string;
  taps: TapRecord[];
  locked: boolean;
  won: boolean;
};

export const SESSION_STORAGE_KEY = "ping-session-v1";
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

export function emptyCellGrid(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ distance: null, tapped: false })),
  );
}

export function cellGridFromTaps(taps: readonly TapRecord[]): CellState[][] {
  const grid = emptyCellGrid();
  for (const tap of taps) {
    if (!isOnGrid(tap.row, tap.col, GRID_SIZE)) continue;
    grid[tap.row][tap.col] = { distance: tap.distance, tapped: true };
  }
  return grid;
}

export function freshSession(dateStr: string): SessionSnapshot {
  return { dateStr, taps: [], locked: false, won: false };
}

function isValidSnapshot(value: unknown): value is SessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as SessionSnapshot;
  if (typeof s.dateStr !== "string") return false;
  if (typeof s.locked !== "boolean") return false;
  if (typeof s.won !== "boolean") return false;
  if (!Array.isArray(s.taps)) return false;
  if (s.taps.length > MAX_TAPS) return false;
  for (const tap of s.taps) {
    if (typeof tap.row !== "number" || typeof tap.col !== "number") return false;
    if (typeof tap.distance !== "number" || tap.distance < 0) return false;
    if (!isOnGrid(tap.row, tap.col, GRID_SIZE)) return false;
  }
  if (s.won && !s.locked) return false;
  if (s.won && !s.taps.some((t) => t.distance === 0)) return false;
  if (s.locked && s.taps.length === 0) return false;
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

/** Restore UI state from storage for the current puzzle date. */
export function restoreSession(
  dateStr: string,
  storage: SessionStorageAdapter = resolveStorage(),
): {
  taps: TapRecord[];
  locked: boolean;
  won: boolean;
  cellStates: CellState[][];
} {
  const saved = loadSession(dateStr, storage);
  if (!saved) {
    const fresh = freshSession(dateStr);
    return {
      taps: fresh.taps,
      locked: fresh.locked,
      won: fresh.won,
      cellStates: emptyCellGrid(),
    };
  }

  return {
    taps: [...saved.taps],
    locked: saved.locked,
    won: saved.won,
    cellStates: cellGridFromTaps(saved.taps),
  };
}

/** Apply one legal tap; returns unchanged snapshot when tap is ignored. */
export function applyTap(
  snapshot: SessionSnapshot,
  hidden: Cell,
  row: number,
  col: number,
): SessionSnapshot {
  if (snapshot.locked) return snapshot;
  if (!isOnGrid(row, col, GRID_SIZE)) return snapshot;
  if (snapshot.taps.length >= MAX_TAPS) return snapshot;
  if (snapshot.taps.some((t) => t.row === row && t.col === col)) return snapshot;

  const distance = manhattan(hidden, [row, col]);
  const taps = [...snapshot.taps, { row, col, distance }];
  const won = distance === 0;
  const locked = won || taps.length >= MAX_TAPS;

  return { ...snapshot, taps, won, locked };
}

/** Simulate a page refresh: reload from storage for the same puzzle date. */
export function simulateRefresh(
  dateStr: string,
  storage: SessionStorageAdapter = resolveStorage(),
): ReturnType<typeof restoreSession> {
  return restoreSession(dateStr, storage);
}

export function tapsRemaining(taps: readonly TapRecord[]): number {
  return MAX_TAPS - taps.length;
}
