import { LavalinkManager } from "lavalink-client";
import { describe, expect, it } from "vitest";
import { sqliteQueueStore } from "./queueStore";

describe("sqliteQueueStore", () => {
  it("lavalink-client doğrulamasından geçer (metotlar prototipte olmalı)", () => {
    // lavalink-client, queueStore metotlarını PROTOTİPTE arar; düz nesne kabul
    // etmez. Bu test, queueStore'un gerçek LavalinkManager'da kabul edildiğini
    // doğrular (aksi halde bot açılışta çöker).
    expect(() => {
      new LavalinkManager({
        nodes: [{ id: "n", host: "localhost", port: 4000, authorization: "x" }],
        sendToShard: () => {},
        client: { id: "1", username: "test" },
        queueOptions: { queueStore: sqliteQueueStore },
      });
    }).not.toThrow();
  });
});
