import { describe, expect, it } from "vitest";
import {
  CENTER_CELLS,
  CORNERS,
  cellsConsistentWithTriple,
  findSharedThreeTapLine,
  findUniqueThreeTapLine,
  generateH,
  hasUniqueThreeTapLine,
  isCenterForbidden,
  isCornerTooFar,
  isPublishable,
  rejectionReasons,
} from "@/lib/generator";
import { addUtcDays, PING_EPOCH_UTC } from "@/lib/epoch";
import { manhattan } from "@/lib/manhattan";

describe("generator 12×12", () => {
  const gridSize = 12 as const;

  it("rejects center cells", () => {
    for (const cell of CENTER_CELLS) {
      expect(isCenterForbidden(cell, gridSize)).toBe(true);
      expect(rejectionReasons(cell, null, null, gridSize)).toContain("center");
    }
  });

  it("rejects cells within d ≤ 2 of center midpoint", () => {
    expect(isCenterForbidden([4, 5], gridSize)).toBe(true);
    expect(isCenterForbidden([7, 7], gridSize)).toBe(false);
  });

  it("rejects H when any corner d ≥ 18", () => {
    expect(isCornerTooFar([0, 0], gridSize)).toBe(true);
    expect(isCornerTooFar([1, 1], gridSize)).toBe(true);
    expect(CORNERS.some((corner) => manhattan([1, 1], corner) >= 18)).toBe(true);
    expect(isCornerTooFar([3, 3], gridSize)).toBe(false);
  });

  it("rejects known-ambiguous pair member from publishing", () => {
    const a = [2, 2] as const;
    const b = [2, 8] as const;

    const shared = findSharedThreeTapLine(a, b, gridSize);
    expect(shared).not.toBeNull();

    const ambiguousMatches = cellsConsistentWithTriple(
      shared!.t1,
      shared!.t2,
      shared!.t3,
      shared!.d1,
      shared!.d2,
      shared!.d3,
      gridSize,
    );
    expect(ambiguousMatches.length).toBeGreaterThanOrEqual(2);
    expect(ambiguousMatches).toContainEqual(a);
    expect(ambiguousMatches).toContainEqual(b);

    expect(isPublishable(a, null, null, gridSize)).toBe(false);
    expect(rejectionReasons(a, null, null, gridSize)).toContain("corner");
  });

  it("rejects every H that lacks a uniquely identifying 3-tap line", () => {
    const lackingUnique: Array<[number, number]> = [];
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        const h = [r, c] as [number, number];
        if (!hasUniqueThreeTapLine(h, gridSize)) lackingUnique.push(h);
      }
    }

    expect(lackingUnique.map((h) => isPublishable(h, null, null, gridSize))).toEqual(
      lackingUnique.map(() => false),
    );
    expect(
      lackingUnique.map((h) =>
        rejectionReasons(h, null, null, gridSize).includes("ambiguous-triple"),
      ),
    ).toEqual(lackingUnique.map(() => true));
  });

  it("wires ambiguous-triple rejection to hasUniqueThreeTapLine for every cell", () => {
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        const h = [r, c] as [number, number];
        const reasons = rejectionReasons(h, null, null, gridSize);
        expect(reasons.includes("ambiguous-triple")).toBe(!hasUniqueThreeTapLine(h, gridSize));
      }
    }
  });

  it("rejects H(D) equal to H(D+1)", () => {
    const d = "2026-03-15";
    const h = generateH(d, gridSize);
    const next = generateH(addUtcDays(d, 1), gridSize);
    expect(h).not.toEqual(next);
  });

  it("generateH returns H uniquely recoverable by some 3-tap line", () => {
    for (const dateStr of ["2025-01-01", "2026-03-15", "2026-08-21", "2026-11-01"]) {
      const h = generateH(dateStr, gridSize);
      const witness = findUniqueThreeTapLine(h, gridSize);
      expect(witness).not.toBeNull();

      const matches = cellsConsistentWithTriple(
        witness!.t1,
        witness!.t2,
        witness!.t3,
        witness!.d1,
        witness!.d2,
        witness!.d3,
        gridSize,
      );
      expect(matches).toEqual([h]);

      const prevH =
        dateStr === PING_EPOCH_UTC ? null : generateH(addUtcDays(dateStr, -1), gridSize);
      expect(isPublishable(h, prevH, null, gridSize)).toBe(true);
      expect(isCenterForbidden(h, gridSize)).toBe(false);
      expect(isCornerTooFar(h, gridSize)).toBe(false);
      expect(hasUniqueThreeTapLine(h, gridSize)).toBe(true);
    }
  });
});

describe("generator 4×4 and 6×6", () => {
  it("4×4 rejects center and generates publishable H", () => {
    expect(isCenterForbidden([1, 1], 4)).toBe(true);
    expect(isCenterForbidden([0, 0], 4)).toBe(false);

    const h = generateH("2026-08-21", 4);
    expect(isPublishable(h, null, null, 4)).toBe(true);
    expect(hasUniqueThreeTapLine(h, 4)).toBe(true);
    expect(h[0]).toBeGreaterThanOrEqual(0);
    expect(h[0]).toBeLessThan(4);
  });

  it("6×6 rejects corners that are too far and generates publishable H", () => {
    expect(isCornerTooFar([0, 0], 6)).toBe(true);

    const h = generateH("2026-08-21", 6);
    expect(isPublishable(h, null, null, 6)).toBe(true);
    expect(hasUniqueThreeTapLine(h, 6)).toBe(true);
  });

  it("each board size gets a distinct H on the same day", () => {
    const dateStr = "2026-08-21";
    const h4 = generateH(dateStr, 4);
    const h6 = generateH(dateStr, 6);
    const h12 = generateH(dateStr, 12);
    expect(h4).not.toEqual(h6);
    expect(h6).not.toEqual(h12);
  });
});
