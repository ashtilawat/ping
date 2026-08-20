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

const MAX_TAPS = 4;

type GameState = {
  taps: { row: number; col: number; distance: number }[];
  locked: boolean;
  won: boolean;
  tapped: Set<string>;
};

function tap(state: GameState, h: [number, number], row: number, col: number): GameState {
  if (state.locked) return state;
  if (!isOnGrid(row, col)) return state;
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

    const h21 = seedForDate("2026-08-21");
    const h20 = seedForDate("2026-08-20");
    expect(h21).not.toEqual(h20);
    expect(seedForDate("2026-08-21")).toEqual(generateH("2026-08-21"));
  });

  it("unfinished day D does not flip to D+1 mid-tap", () => {
    const lockedDate = "2026-08-20";
    const h = seedForDate(lockedDate);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, 0, 0);
    expect(state.taps).toHaveLength(1);

    const nextDayH = seedForDate(addUtcDays(lockedDate, 1));
    expect(h).toEqual(seedForDate(lockedDate));
    expect(state.taps[0].distance).toBe(manhattan(h, [0, 0]));
    expect(state.taps[0].distance).not.toBe(manhattan(nextDayH, [0, 0]));
  });

  it("retap does not consume a tap", () => {
    const h = forcedH(5, 5);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, 1, 1);
    state = tap(state, h, 1, 1);
    expect(state.taps).toHaveLength(1);
  });

  it("off-grid tap does not consume a tap", () => {
    const h = forcedH(5, 5);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, -1, 0);
    state = tap(state, h, 12, 0);
    expect(state.taps).toHaveLength(0);
  });

  it("forced H=(5,5) scoring: win on exact cell", () => {
    const h = forcedH(5, 5);
    let state: GameState = { taps: [], locked: false, won: false, tapped: new Set() };
    state = tap(state, h, 5, 5);
    expect(state.won).toBe(true);
    expect(state.taps[0].distance).toBe(0);

    const share = buildShareText({
      dateStr: "2025-01-02",
      won: true,
      taps: state.taps,
    });
    expect(share).not.toContain("📡0");
    expect(share).toContain("🎯");
  });
});
