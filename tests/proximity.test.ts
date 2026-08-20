import { describe, expect, it } from "vitest";
import { closestDistance, proximityFromDistance } from "@/lib/proximity";

describe("proximity", () => {
  it("distance 0 is full proximity", () => {
    expect(proximityFromDistance(0)).toBe(1);
  });

  it("higher distance lowers proximity", () => {
    expect(proximityFromDistance(1)).toBeGreaterThan(proximityFromDistance(10));
    expect(proximityFromDistance(10)).toBeGreaterThan(proximityFromDistance(22));
  });

  it("closestDistance returns min tap distance", () => {
    expect(closestDistance([])).toBeNull();
    expect(closestDistance([{ distance: 8 }, { distance: 1 }, { distance: 11 }])).toBe(1);
  });
});
