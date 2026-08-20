import { describe, expect, it } from "vitest";
import {
  isWinTap,
  shareImageCellLabel,
  shareImageScoreLine,
  TARGET_MARK,
} from "@/lib/shareImageLayout";

describe("shareImage layout", () => {
  it("win cell shows 🎯 instead of 0", () => {
    expect(shareImageCellLabel({ row: 9, col: 10, distance: 0 })).toBe(TARGET_MARK);
    expect(shareImageCellLabel({ row: 9, col: 10, distance: 0 })).not.toBe("0");
  });

  it("miss cells show distance numbers", () => {
    expect(shareImageCellLabel({ row: 0, col: 0, distance: 15 })).toBe("15");
    expect(shareImageCellLabel({ row: 0, col: 11, distance: 10 })).toBe("10");
  });

  it("win score line is k/4 + 🎯 with board label", () => {
    expect(shareImageScoreLine(true, 3, 12)).toBe(`12×12 3/4 ${TARGET_MARK}`);
    expect(shareImageScoreLine(true, 1, 4)).toBe(`4×4 1/4 ${TARGET_MARK}`);
  });

  it("lose score line is X/4 without 🎯", () => {
    expect(shareImageScoreLine(false, 4, 6)).toBe("6×6 X/4");
    expect(shareImageScoreLine(false, 4, 6)).not.toContain(TARGET_MARK);
  });

  it("isWinTap identifies the winning hit", () => {
    expect(isWinTap({ row: 1, col: 2, distance: 0 })).toBe(true);
    expect(isWinTap({ row: 1, col: 2, distance: 1 })).toBe(false);
  });

  it("matches #597 win scenario on 12×12: 15 / 10 / 🎯 footer 3/4 🎯", () => {
    const taps = [
      { row: 0, col: 0, distance: 15 },
      { row: 0, col: 11, distance: 10 },
      { row: 9, col: 10, distance: 0 },
    ];
    expect(shareImageCellLabel(taps[0])).toBe("15");
    expect(shareImageCellLabel(taps[1])).toBe("10");
    expect(shareImageCellLabel(taps[2])).toBe(TARGET_MARK);
    expect(shareImageScoreLine(true, taps.length, 12)).toBe(`12×12 3/4 ${TARGET_MARK}`);
  });

  it("lose scenario: four distances, X/4 footer", () => {
    const taps = [
      { row: 0, col: 0, distance: 15 },
      { row: 4, col: 3, distance: 8 },
      { row: 7, col: 6, distance: 1 },
      { row: 9, col: 0, distance: 11 },
    ];
    expect(taps.map(shareImageCellLabel)).toEqual(["15", "8", "1", "11"]);
    expect(shareImageScoreLine(false, taps.length, 12)).toBe("12×12 X/4");
  });
});
