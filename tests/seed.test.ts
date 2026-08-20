import { describe, expect, it } from "vitest";
import { addUtcDays, PING_EPOCH_UTC, puzzleNumber } from "@/lib/epoch";
import { forcedH, seedForDate } from "@/lib/seed";
import { isCenterForbidden } from "@/lib/generator";

describe("seed", () => {
  it("uses forced H=(5,5) for test scoring only", () => {
    const h = seedForDate("2025-06-01", { force: forcedH(5, 5) });
    expect(h).toEqual([5, 5]);
  });

  it("generator rejects publishing center H=(5,5)", () => {
    expect(isCenterForbidden([5, 5])).toBe(true);
  });

  it("published seed for a date is deterministic", () => {
    const a = seedForDate("2026-08-21");
    const b = seedForDate("2026-08-21");
    expect(a).toEqual(b);
  });

  it("PING_EPOCH_UTC is puzzle #1", () => {
    expect(puzzleNumber(PING_EPOCH_UTC)).toBe(1);
  });

  it("addUtcDays advances calendar", () => {
    expect(addUtcDays("2026-08-20", 1)).toBe("2026-08-21");
  });
});
