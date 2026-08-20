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

describe("generator", () => {
  it("rejects center cells", () => {
    for (const cell of CENTER_CELLS) {
      expect(isCenterForbidden(cell)).toBe(true);
      expect(rejectionReasons(cell, null, null)).toContain("center");
    }
  });

  it("rejects cells within d ≤ 2 of center midpoint", () => {
    expect(isCenterForbidden([4, 5])).toBe(true);
    expect(isCenterForbidden([7, 7])).toBe(false);
  });

  it("rejects H when any corner d ≥ 18", () => {
    expect(isCornerTooFar([0, 0])).toBe(true);
    expect(isCornerTooFar([1, 1])).toBe(true);
    expect(CORNERS.some((corner) => manhattan([1, 1], corner) >= 18)).toBe(true);
    expect(isCornerTooFar([3, 3])).toBe(false);
  });

  it("rejects known-ambiguous pair member from publishing", () => {
    const a = [2, 2] as const;
    const b = [2, 8] as const;

    const shared = findSharedThreeTapLine(a, b);
    expect(shared).not.toBeNull();

    const ambiguousMatches = cellsConsistentWithTriple(
      shared!.t1,
      shared!.t2,
      shared!.t3,
      shared!.d1,
      shared!.d2,
      shared!.d3,
    );
    expect(ambiguousMatches.length).toBeGreaterThanOrEqual(2);
    expect(ambiguousMatches).toContainEqual(a);
    expect(ambiguousMatches).toContainEqual(b);

    expect(isPublishable(a, null, null)).toBe(false);
    expect(rejectionReasons(a, null, null)).toContain("corner");
  });

  it("rejects every H that lacks a uniquely identifying 3-tap line", () => {
    const lackingUnique: Array<[number, number]> = [];
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        const h = [r, c] as [number, number];
        if (!hasUniqueThreeTapLine(h)) lackingUnique.push(h);
      }
    }

    expect(lackingUnique.map((h) => isPublishable(h, null, null))).toEqual(
      lackingUnique.map(() => false),
    );
    expect(
      lackingUnique.map((h) => rejectionReasons(h, null, null).includes("ambiguous-triple")),
    ).toEqual(lackingUnique.map(() => true));
  });

  it("wires ambiguous-triple rejection to hasUniqueThreeTapLine for every cell", () => {
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 12; c++) {
        const h = [r, c] as [number, number];
        const reasons = rejectionReasons(h, null, null);
        expect(reasons.includes("ambiguous-triple")).toBe(!hasUniqueThreeTapLine(h));
      }
    }
  });

  it("rejects H(D) equal to H(D+1)", () => {
    const d = "2026-03-15";
    const h = generateH(d);
    const next = generateH(addUtcDays(d, 1));
    expect(h).not.toEqual(next);
  });

  it("generateH returns H uniquely recoverable by some 3-tap line", () => {
    for (const dateStr of ["2025-01-01", "2026-03-15", "2026-08-21", "2026-11-01"]) {
      const h = generateH(dateStr);
      const witness = findUniqueThreeTapLine(h);
      expect(witness).not.toBeNull();

      const matches = cellsConsistentWithTriple(
        witness!.t1,
        witness!.t2,
        witness!.t3,
        witness!.d1,
        witness!.d2,
        witness!.d3,
      );
      expect(matches).toEqual([h]);

      const prevH =
        dateStr === PING_EPOCH_UTC ? null : generateH(addUtcDays(dateStr, -1));
      expect(isPublishable(h, prevH, null)).toBe(true);
      expect(isCenterForbidden(h)).toBe(false);
      expect(isCornerTooFar(h)).toBe(false);
      expect(hasUniqueThreeTapLine(h)).toBe(true);
    }
  });
});
