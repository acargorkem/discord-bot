import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, deleteSession, getSession } from "./sessions";

describe("session store", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("oturum oluşturur ve geri okur", () => {
    const session = createSession("u1", "Ali");
    expect(session.id).toHaveLength(64);
    const fetched = getSession(session.id);
    expect(fetched).toMatchObject({ userId: "u1", username: "Ali" });
  });

  it("bilinmeyen id için null döner", () => {
    expect(getSession("yok")).toBeNull();
  });

  it("silinen oturum artık okunamaz", () => {
    const session = createSession("u2", "Veli");
    deleteSession(session.id);
    expect(getSession(session.id)).toBeNull();
  });

  it("süresi dolan oturum null döner", () => {
    const session = createSession("u3", "Can");
    // 8 gün ileri sar (TTL 7 gün).
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
    expect(getSession(session.id)).toBeNull();
  });
});
