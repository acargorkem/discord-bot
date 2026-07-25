import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkCooldown } from "./cooldown";

describe("checkCooldown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("ilk çağrı beklemesiz (0), hemen ardından kalan süre döner", () => {
    expect(checkCooldown("u1", "play", 2000)).toBe(0);
    expect(checkCooldown("u1", "play", 2000)).toBeGreaterThan(0);
  });

  it("süre dolunca tekrar 0 döner", () => {
    checkCooldown("u2", "play", 2000);
    vi.advanceTimersByTime(2000);
    expect(checkCooldown("u2", "play", 2000)).toBe(0);
  });

  it("farklı kullanıcılar birbirini etkilemez", () => {
    expect(checkCooldown("a", "skip", 2000)).toBe(0);
    expect(checkCooldown("b", "skip", 2000)).toBe(0);
  });
});
