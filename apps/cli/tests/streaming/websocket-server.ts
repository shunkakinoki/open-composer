/**
 * WebSocket server utilities for streaming tests
 * Used with xterm addon-attach for process output streaming
 */

import type { Server as HTTPServer } from "node:http";
import type { Server as WebSocketServer, WebSocket } from "ws";

export interface WebSocketServerOptions {
  port?: number;
  path?: string;
}

export interface StreamingServerHandle {
  server: HTTPServer;
  wss: WebSocketServer;
  port: number;
  url: string;
  broadcast: (data: string) => void;
  close: () => Promise<void>;
  getClients: () => Set<WebSocket>;
}

/**
 * Create a WebSocket server for streaming terminal output
 */
export async function createStreamingServer(
  options: WebSocketServerOptions = {},
): Promise<StreamingServerHandle> {
  const { createServer } = await import("node:http");
  const { WebSocketServer } = await import("ws");

  const port = options.port ?? 0; // 0 = random port
  const path = options.path ?? "/stream";

  const server = createServer();
  const wss = new WebSocketServer({ server, path });

  // Track connected clients
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  // Start server
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server address");
  }

  const actualPort = address.port;
  const url = `ws://localhost:${actualPort}${path}`;

  return {
    server,
    wss,
    port: actualPort,
    url,
    broadcast: (data: string) => {
      for (const client of clients) {
        if (client.readyState === 1) {
          // WebSocket.OPEN
          client.send(data);
        }
      }
    },
    close: async () => {
      // Close all client connections first
      const closePromises: Promise<void>[] = [];
      for (const client of clients) {
        closePromises.push(
          new Promise((resolve) => {
            if (client.readyState === 1 || client.readyState === 2) {
              // OPEN or CLOSING
              client.once("close", () => resolve());
              client.close();
              // Force close after timeout
              setTimeout(() => {
                client.terminate();
                resolve();
              }, 1000);
            } else {
              resolve();
            }
          }),
        );
      }
      await Promise.all(closePromises);
      clients.clear();

      // Close WebSocket server
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // Resolve anyway after timeout
        }, 2000);
        wss.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve();
        });
      }).catch(() => {
        // Ignore errors
      });

      // Close HTTP server
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(); // Resolve anyway after timeout
        }, 2000);
        server.close((err) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve();
        });
      }).catch(() => {
        // Ignore errors
      });
    },
    getClients: () => clients,
  };
}

/**
 * Create a WebSocket client for testing
 */
export async function createStreamingClient(url: string): Promise<WebSocket> {
  const { default: WebSocket } = await import("ws");

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.on("open", () => {
      resolve(ws);
    });

    ws.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Collect WebSocket messages into an array
 */
export function collectMessages(
  ws: WebSocket,
  timeout = 5000,
): Promise<string[]> {
  const messages: string[] = [];

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(messages);
    }, timeout);

    ws.on("message", (data) => {
      messages.push(data.toString());
    });

    ws.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    ws.on("close", () => {
      clearTimeout(timer);
      resolve(messages);
    });
  });
}
