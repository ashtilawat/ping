import { describe, expect, it } from "vitest";
import {
  addUtcDays,
  puzzleDateForInstant,
  puzzleDateForTimezone,
  puzzleNumber,
} from "@/lib/epoch";
import { generateH } from "@/lib/generator";
import { isOnGrid, manhattan } from "@/lib/manhattan";
import { forcedH, seedForDate } from "@/lib/seed";
import { buildShareText } from "@/lib/share";
import {
  applyTap,
  freshSession,
  MAX_TAPS,
} from "@/lib/session";

const BOARD_SIZES = [4, 6, 12] as const;

type GameState = {
  taps: { row: number; col: number; distance: number }[];
  locked: boolean;
  won: boolean;
  tapped: Set<string>;
};

function tap(
  state: GameState,
  h: [number, number],
  row: number,
  col: number,
  gridSize: number,
): GameState {
  if (state.locked) return state;
  if (!isOnGrid(row, col, gridSize)) return state;
  const key = `${row},${col}`;
  if (state.tapped.has(key)) return state;
  if (state.taps.length >= MAX_TAPS) return state;

  const d = manhattan(h, [row, col]);
  const taps = [...state.taps, { row, col, distance: d }];
  const tapped = new Set(state.tapped);
  tapped.add(key);
  const won = d === 0;
  const locked = won || taps.length >= MAX_TAPS;
  return { taps, locked, won, tapped };
}

describe("fixtures", () => {
  it("2026-08-20 19:00 America/Chicago loads H(2026-08-21)", () => {
    const instant = new Date("2026-08-21T00:00:00.000Z");
    const chicagoDate = puzzleDateForTimezone(instant, "America/Chicago");
    expect(chicagoDate).toBe("2026-08-20");

    const utcPuzzleDate = puzzleDateForInstant(instant);
    expect(utcPuzzleDate).toBe("2026-08-21");

    const chicagoWallClock = new Date("2026-08-20T19:00:00-05:00");
    expect(puzzleDateForInstant(chicagoWallClock)).toBe("2026-08-21");

    const h21 = seedForDate("2026-08-21", 12);
    const h20 = seedForDate("2026-08-20", 12);
    expect(h21).not.toEqual(h20);
    expect(seedForDate("2026-08-21", 12)).toEqual(generateH("2026-08-21", 12));
  });

  it("unfinished day D does not flip to D+1 mid-tap", () => {
    const lockedDate = "2026-08-20";
    const h = seedForDate(lockedDate, 12);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, 0, 0, 12);
    expect(state.taps).toHaveLength(1);

    const nextDayH = seedForDate(addUtcDays(lockedDate, 1), 12);
    expect(h).toEqual(seedForDate(lockedDate, 12));
    expect(state.taps[0].distance).toBe(manhattan(h, [0, 0]));
    expect(state.taps[0].distance).not.toBe(manhattan(nextDayH, [0, 0]));
  });

  it("retap does not consume a tap", () => {
    const h = forcedH(2, 2);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, 1, 1, 4);
    state = tap(state, h, 1, 1, 4);
    expect(state.taps).toHaveLength(1);
  });

  it("off-grid tap does not consume a tap", () => {
    const h = forcedH(2, 2);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, -1, 0, 4);
    state = tap(state, h, 4, 0, 4);
    expect(state.taps).toHaveLength(0);
  });

  it("forced H=(2,2) on 4×4 scoring: win on exact cell", () => {
    const h = forcedH(2, 2);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, 2, 2, 4);
    expect(state.won).toBe(true);
    expect(state.taps[0].distance).toBe(0);

    const share = buildShareText({
      dateStr: "2025-01-02",
      boards: [{ size: 4, won: true, taps: state.taps }],
    });
    expect(share).not.toContain("📡0");
    expect(share).toContain("🎯");
  });

  it("three-board daily run: miss on 4×4 continues to 6×6 then 12×12", () => {
    const dateStr = "2026-08-21";
    const h4 = forcedH(1, 1);
    const h6 = forcedH(2, 2);
    const h12 = forcedH(5, 5);

    let session = freshSession(dateStr);

    session = applyTap(session, h4, 0, 0, 4);
    session = applyTap(session, h4, 0, 1, 4);
    session = applyTap(session, h4, 0, 2, 4);
    session = applyTap(session, h4, 0, 3, 4);
    expect(session.boards[0].won).toBe(false);
    expect(session.boardIndex).toBe(1);

    session = applyTap(session, h6, 2, 2, 6);
    expect(session.boards[1].won).toBe(true);
    expect(session.boardIndex).toBe(2);

    session = applyTap(session, h12, 5, 5, 12);
    expect(session.boards[2].won).toBe(true);
    expect(session.complete).toBe(true);

    const share = buildShareText({
      dateStr,
      boards: BOARD_SIZES.map((size, i) => ({
        size,
        taps: session.boards[i].taps,
        won: session.boards[i].won,
      })),
    });
    expect(share).toContain("4×4 X/4");
    expect(share).toContain("6×6 1/4");
    expect(share).toContain("12×12 1/4");
    expect(share).toContain(`PING #${puzzleNumber(dateStr)}`);
  });
});
