import { createServer } from "node:http";
import type { Client } from "discord.js";
import { logger } from "./logger.js";

/**
 * Minik bir HTTP sağlık sunucusu başlatır. `/health` ucu, bot Discord'a
 * bağlıysa 200, değilse 503 döner. Docker HEALTHCHECK bunu kullanır.
 * Port dışarı açılmaz; yalnızca konteyner içinden erişilir.
 */
export function startHealthServer(client: Client): void {
  const port = Number(process.env.HEALTH_PORT ?? 3000);

  const server = createServer((req, res) => {
    if (req.url === "/health") {
      const healthy = client.isReady();
      res.writeHead(healthy ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: healthy ? "ok" : "unavailable" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.on("error", (error) => {
    logger.error({ err: error }, "Sağlık sunucusu hatası");
  });

  server.listen(port, () => {
    logger.info(`Sağlık sunucusu ${port} portunda dinliyor.`);
  });
}
