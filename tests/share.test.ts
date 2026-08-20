import { describe, expect, it } from "vitest";
import { buildShareText, shareTitle, shareUrl } from "@/lib/share";
import { puzzleNumber } from "@/lib/epoch";

describe("share", () => {
  const dateStr = "2026-08-21";
  const n = puzzleNumber(dateStr);

  it("win share: per-board header, miss lines, 🎯 — never 📡0", () => {
    const text = buildShareText({
      dateStr,
      boards: [
        {
          size: 4,
          won: true,
          taps: [
            { row: 0, col: 0, distance: 3 },
            { row: 1, col: 1, distance: 0 },
          ],
        },
      ],
    });
    expect(text).toBe(
      ["PING #" + n, "4×4 2/4", "📡3", "🎯"].join("\n"),
    );
    expect(text).not.toContain("📡0");
    expect(text).not.toMatch(/\b\d+,\d+\b/);
  });

  it("honest lose share: X/4 and exactly four 📡 lines, no 🎯", () => {
    const text = buildShareText({
      dateStr,
      boards: [
        {
          size: 12,
          won: false,
          taps: [
            { row: 0, col: 0, distance: 10 },
            { row: 1, col: 1, distance: 9 },
            { row: 2, col: 2, distance: 8 },
            { row: 3, col: 3, distance: 7 },
          ],
        },
      ],
    });
    const lines = text.split("\n");
    expect(lines[0]).toBe(`PING #${n}`);
    expect(lines[1]).toBe("12×12 X/4");
    expect(lines.slice(2)).toEqual(["📡10", "📡9", "📡8", "📡7"]);
    expect(text).not.toContain("🎯");
  });

  it("three-board daily share format", () => {
    const text = buildShareText({
      dateStr,
      boards: [
        {
          size: 4,
          won: true,
          taps: [
            { row: 0, col: 0, distance: 2 },
            { row: 1, col: 1, distance: 0 },
          ],
        },
        {
          size: 6,
          won: false,
          taps: [
            { row: 0, col: 0, distance: 5 },
            { row: 1, col: 1, distance: 4 },
            { row: 2, col: 2, distance: 3 },
            { row: 3, col: 3, distance: 2 },
          ],
        },
        {
          size: 12,
          won: true,
          taps: [{ row: 5, col: 5, distance: 0 }],
        },
      ],
    });
    expect(text).toBe(
      [
        `PING #${n}`,
        "4×4 2/4",
        "📡2",
        "🎯",
        "6×6 X/4",
        "📡5",
        "📡4",
        "📡3",
        "📡2",
        "12×12 1/4",
        "🎯",
      ].join("\n"),
    );
  });

  it("share title and URL never contain coords", () => {
    expect(shareTitle(dateStr)).toBe(`PING #${n}`);
    expect(shareUrl("https://ping.example")).toBe("https://ping.example/");
    expect(shareTitle(dateStr)).not.toMatch(/cell|row|col|,|\//);
  });
});
