import { describe, expect, it } from "vitest";
import { manhattan } from "@/lib/manhattan";

describe("manhattan", () => {
  it("d((5,5),(5,7)) === 2", () => {
    expect(manhattan([5, 5], [5, 7])).toBe(2);
  });

  it("d((2,2),(4,5)) === 5 (not Euclidean or Chebyshev)", () => {
    expect(manhattan([2, 2], [4, 5])).toBe(5);
    expect(Math.hypot(4 - 2, 5 - 2)).not.toBe(5);
    expect(Math.max(Math.abs(4 - 2), Math.abs(5 - 2))).not.toBe(5);
  });
});
