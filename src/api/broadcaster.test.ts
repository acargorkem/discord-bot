import { describe, expect, it, vi } from "vitest";
import { createBroadcaster } from "./broadcaster";

const OPEN = 1;
const CLOSED = 3;

function fakeClient(readyState = OPEN) {
  return { readyState, send: vi.fn() };
}

describe("broadcaster", () => {
  it("bağlı tüm açık istemcilere yayın yapar", () => {
    const b = createBroadcaster();
    const a = fakeClient();
    const c = fakeClient();
    b.add(a);
    b.add(c);

    b.broadcast({ hello: "dünya" });

    const expected = JSON.stringify({ hello: "dünya" });
    expect(a.send).toHaveBeenCalledWith(expected);
    expect(c.send).toHaveBeenCalledWith(expected);
  });

  it("kapalı istemciye göndermez ve onu düşürür", () => {
    const b = createBroadcaster();
    const closed = fakeClient(CLOSED);
    b.add(closed);

    b.broadcast({ x: 1 });

    expect(closed.send).not.toHaveBeenCalled();
    expect(b.count()).toBe(0);
  });

  it("remove edilen istemci artık yayın almaz", () => {
    const b = createBroadcaster();
    const a = fakeClient();
    b.add(a);
    b.remove(a);

    b.broadcast({ x: 1 });

    expect(a.send).not.toHaveBeenCalled();
    expect(b.count()).toBe(0);
  });

  it("count bağlı istemci sayısını verir", () => {
    const b = createBroadcaster();
    b.add(fakeClient());
    b.add(fakeClient());
    expect(b.count()).toBe(2);
  });
});
