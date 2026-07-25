/** Yayın yapılabilecek minimal WebSocket arayüzü (test edilebilirlik için). */
export interface Broadcastable {
  readyState: number;
  send(data: string): void;
}

export interface Broadcaster {
  add(client: Broadcastable): void;
  remove(client: Broadcastable): void;
  broadcast(data: unknown): void;
  count(): number;
}

const WS_OPEN = 1;

/**
 * Bağlı WebSocket istemcilerini yönetir ve hepsine JSON yayını yapar.
 * Fabrika deseni → paylaşımlı durum yok, kolayca test edilir.
 */
export function createBroadcaster(): Broadcaster {
  const clients = new Set<Broadcastable>();

  return {
    add: (client) => clients.add(client),
    remove: (client) => clients.delete(client),
    broadcast: (data) => {
      const message = JSON.stringify(data);
      for (const client of clients) {
        if (client.readyState !== WS_OPEN) {
          clients.delete(client);
          continue;
        }
        try {
          client.send(message);
        } catch {
          clients.delete(client);
        }
      }
    },
    count: () => clients.size,
  };
}
