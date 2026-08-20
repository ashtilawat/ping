import { describe, expect, it } from "vitest";
import {
  CENTER_CELLS,
  CORNERS,
  generateH,
  isCenterForbidden,
  isCornerTooFar,
  isPublishable,
  rejectionReasons,
  sharesThreeTapTriple,
} from "@/lib/generator";
import { addUtcDays } from "@/lib/epoch";
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

  it("rejects when two cells share a 3-tap distance triple", () => {
    const symmetric = sharesThreeTapTriple([2, 2], [2, 8]);
    if (symmetric) {
      expect(isPublishable([2, 2], null, null)).toBe(false);
    }
  });

  it("rejects H(D) equal to H(D+1)", () => {
    const d = "2026-03-15";
    const h = generateH(d);
    const next = generateH(addUtcDays(d, 1));
    expect(h).not.toEqual(next);
  });

  it("publishes a valid H for 2026-08-21", () => {
    const h = generateH("2026-08-21");
    expect(isPublishable(h, generateH("2026-08-20"), generateH("2026-08-22"))).toBe(
      true,
    );
    expect(isCenterForbidden(h)).toBe(false);
  });
});
