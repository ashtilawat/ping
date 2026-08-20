import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { addUtcDays } from "@/lib/epoch";
import { forcedH } from "@/lib/seed";
import {
  activeBoardIndex,
  applyTap,
  createMemorySessionStorage,
  freshSession,
  loadSession,
  restoreSession,
  saveSession,
  setSessionStorageOverride,
  simulateRefresh,
  tapsRemaining,
} from "@/lib/session";

describe("session persistence", () => {
  const dateStr = "2026-08-21";
  let memory: ReturnType<typeof createMemorySessionStorage>;

  beforeEach(() => {
    memory = createMemorySessionStorage();
    setSessionStorageOverride(memory);
  });

  afterEach(() => {
    setSessionStorageOverride(null);
  });

  it("refresh after mid-game restores taps and remaining count on active board", () => {
    const h = forcedH(1, 1);
    let session = freshSession(dateStr);
    session = applyTap(session, h, 0, 0, 4);
    session = applyTap(session, h, 1, 0, 4);
    saveSession(session);

    const afterRefresh = simulateRefresh(dateStr);
    expect(afterRefresh.session.boards[0].taps).toHaveLength(2);
    expect(afterRefresh.session.boards[0].taps[0].distance).toBe(
      session.boards[0].taps[0].distance,
    );
    expect(afterRefresh.session.boards[0].locked).toBe(false);
    expect(afterRefresh.session.boards[0].won).toBe(false);
    expect(tapsRemaining(afterRefresh.session.boards[0].taps)).toBe(2);
    expect(afterRefresh.cellStates[0][0].tapped).toBe(true);
    expect(afterRefresh.gridSize).toBe(4);
  });

  it("refresh after full daily keeps finished state and refuses replay", () => {
    const h4 = forcedH(1, 1);
    const h6 = forcedH(2, 2);
    const h12 = forcedH(5, 5);
    let session = freshSession(dateStr);

    session = applyTap(session, h4, 1, 1, 4);
    session = applyTap(session, h6, 0, 0, 6);
    session = applyTap(session, h6, 1, 1, 6);
    session = applyTap(session, h6, 2, 2, 6);
    session = applyTap(session, h6, 3, 3, 6);
    session = applyTap(session, h12, 5, 5, 12);

    expect(session.complete).toBe(true);
    saveSession(session);

    const afterRefresh = simulateRefresh(dateStr);
    expect(afterRefresh.session.complete).toBe(true);
    expect(afterRefresh.session.boards[2].won).toBe(true);

    const replayAttempt = applyTap(afterRefresh.session, h12, 3, 3, 12);
    expect(replayAttempt).toEqual(afterRefresh.session);
  });

  it("miss on early board advances to next board and persists", () => {
    const h4 = forcedH(1, 1);
    let session = freshSession(dateStr);
    session = applyTap(session, h4, 0, 0, 4);
    session = applyTap(session, h4, 0, 1, 4);
    session = applyTap(session, h4, 0, 2, 4);
    session = applyTap(session, h4, 0, 3, 4);

    expect(session.boards[0].won).toBe(false);
    expect(session.boards[0].locked).toBe(true);
    expect(session.boardIndex).toBe(1);
    expect(activeBoardIndex(session)).toBe(1);

    saveSession(session);
    const afterRefresh = simulateRefresh(dateStr);
    expect(afterRefresh.session.boardIndex).toBe(1);
    expect(afterRefresh.gridSize).toBe(6);
    expect(afterRefresh.session.boards[0].taps).toHaveLength(4);
  });

  it("stale puzzle date does not restore prior-day session", () => {
    const h = forcedH(1, 1);
    let session = freshSession(dateStr);
    session = applyTap(session, h, 0, 0, 4);
    saveSession(session);

    const nextDay = addUtcDays(dateStr, 1);
    expect(loadSession(nextDay)).toBeNull();

    const fresh = restoreSession(nextDay);
    expect(fresh.session.boards[0].taps).toHaveLength(0);
    expect(fresh.session.complete).toBe(false);
    expect(fresh.gridSize).toBe(4);
  });
});
