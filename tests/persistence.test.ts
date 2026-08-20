import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { addUtcDays } from "@/lib/epoch";
import { forcedH } from "@/lib/seed";
import {
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

  it("refresh after mid-game restores taps and remaining count", () => {
    const h = forcedH(5, 5);
    let session = freshSession(dateStr);
    session = applyTap(session, h, 0, 0);
    session = applyTap(session, h, 1, 1);
    saveSession(session);

    const afterRefresh = simulateRefresh(dateStr);
    expect(afterRefresh.taps).toHaveLength(2);
    expect(afterRefresh.taps[0].distance).toBe(session.taps[0].distance);
    expect(afterRefresh.taps[1].distance).toBe(session.taps[1].distance);
    expect(afterRefresh.locked).toBe(false);
    expect(afterRefresh.won).toBe(false);
    expect(tapsRemaining(afterRefresh.taps)).toBe(2);
    expect(afterRefresh.cellStates[0][0].tapped).toBe(true);
    expect(afterRefresh.cellStates[1][1].tapped).toBe(true);
  });

  it("refresh after win keeps finished state and refuses replay", () => {
    const h = forcedH(5, 5);
    let session = freshSession(dateStr);
    session = applyTap(session, h, 2, 2);
    session = applyTap(session, h, 5, 5);
    expect(session.won).toBe(true);
    expect(session.locked).toBe(true);
    saveSession(session);

    const afterRefresh = simulateRefresh(dateStr);
    expect(afterRefresh.won).toBe(true);
    expect(afterRefresh.locked).toBe(true);
    expect(afterRefresh.taps).toHaveLength(2);

    const replayAttempt = applyTap(
      { dateStr, ...afterRefresh, taps: afterRefresh.taps },
      h,
      3,
      3,
    );
    expect(replayAttempt.taps).toHaveLength(2);
    expect(replayAttempt.locked).toBe(true);
  });

  it("refresh after lose keeps finished state, reveal context, and refuses replay", () => {
    const h = forcedH(5, 5);
    let session = freshSession(dateStr);
    session = applyTap(session, h, 0, 0);
    session = applyTap(session, h, 1, 0);
    session = applyTap(session, h, 2, 0);
    session = applyTap(session, h, 3, 0);
    expect(session.won).toBe(false);
    expect(session.locked).toBe(true);
    saveSession(session);

    const afterRefresh = simulateRefresh(dateStr);
    expect(afterRefresh.won).toBe(false);
    expect(afterRefresh.locked).toBe(true);
    expect(afterRefresh.taps).toHaveLength(4);

    const replayAttempt = applyTap(
      { dateStr, ...afterRefresh, taps: afterRefresh.taps },
      h,
      4,
      0,
    );
    expect(replayAttempt.taps).toHaveLength(4);
    expect(replayAttempt.locked).toBe(true);
  });

  it("stale puzzle date does not restore prior-day session", () => {
    const h = forcedH(5, 5);
    let session = freshSession(dateStr);
    session = applyTap(session, h, 0, 0);
    saveSession(session);

    const nextDay = addUtcDays(dateStr, 1);
    expect(loadSession(nextDay)).toBeNull();

    const fresh = restoreSession(nextDay);
    expect(fresh.taps).toHaveLength(0);
    expect(fresh.locked).toBe(false);
    expect(fresh.won).toBe(false);
  });
});
