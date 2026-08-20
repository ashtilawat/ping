import { describe, expect, it } from "vitest";
import { buildShareText, shareTitle, shareUrl } from "@/lib/share";
import { puzzleNumber } from "@/lib/epoch";

describe("share", () => {
  const dateStr = "2026-08-21";
  const n = puzzleNumber(dateStr);

  it("win share: header, miss lines, 🎯 — never 📡0", () => {
    const text = buildShareText({
      dateStr,
      won: true,
      taps: [
        { row: 0, col: 0, distance: 7 },
        { row: 3, col: 3, distance: 2 },
        { row: 5, col: 5, distance: 0 },
      ],
    });
    expect(text).toBe(["PING #" + n + " 3/4", "📡7", "📡2", "🎯"].join("\n"));
    expect(text).not.toContain("📡0");
    expect(text).not.toMatch(/\b\d+,\d+\b/);
  });

  it("honest lose share: X/4 and exactly four 📡 lines, no 🎯", () => {
    const text = buildShareText({
      dateStr,
      won: false,
      taps: [
        { row: 0, col: 0, distance: 10 },
        { row: 1, col: 1, distance: 9 },
        { row: 2, col: 2, distance: 8 },
        { row: 3, col: 3, distance: 7 },
      ],
    });
    const lines = text.split("\n");
    expect(lines[0]).toBe(`PING #${n} X/4`);
    expect(lines.slice(1)).toEqual(["📡10", "📡9", "📡8", "📡7"]);
    expect(text).not.toContain("🎯");
  });

  it("share title and URL never contain coords", () => {
    expect(shareTitle(dateStr)).toBe(`PING #${n}`);
    expect(shareUrl("https://ping.example")).toBe("https://ping.example/");
    expect(shareTitle(dateStr)).not.toMatch(/cell|row|col|,|\//);
  });
});
