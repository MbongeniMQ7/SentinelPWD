/**
 * Minimal fatigue-alert relay server.
 *
 * Accepts WebSocket connections at PATH and broadcasts every received message
 * to all *other* connected clients verbatim. The browser-side transport
 * already filters self-echoes via the `origin` field in the JSON envelope.
 *
 * Run:  npm run fatigue-ws
 *       (set PORT or WS_PATH env vars to override defaults)
 */

import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const PATH = process.env.WS_PATH || "/fatigue";

const wss = new WebSocketServer({ port: PORT, path: PATH });

wss.on("listening", () => {
  console.log(`[fatigue-ws] listening on ws://localhost:${PORT}${PATH}`);
});

wss.on("connection", (sock, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[fatigue-ws] client connected (${ip}) — total: ${wss.clients.size}`);

  sock.on("message", (data, isBinary) => {
    if (isBinary) return; // we only handle JSON text frames

    let preview = "";
    try {
      const parsed = JSON.parse(data.toString());
      preview = `${parsed.kind}:${parsed.payload?.workerId ?? "?"}:${parsed.payload?.score ?? "?"}`;
    } catch {
      return; // ignore non-JSON payloads
    }
    console.log(`[fatigue-ws] relay ${preview} → ${wss.clients.size - 1} peers`);

    for (const peer of wss.clients) {
      if (peer !== sock && peer.readyState === peer.OPEN) {
        peer.send(data.toString());
      }
    }
  });

  sock.on("close", () => {
    console.log(`[fatigue-ws] client disconnected — total: ${wss.clients.size}`);
  });
  sock.on("Open", )

  sock.on("error", (err) => {
    console.warn("[fatigue-ws] socket error:", err.message);
  });
});
