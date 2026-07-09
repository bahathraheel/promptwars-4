import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { attachLiveHandler, closeAllLiveSessions } from './routes/liveWs.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

// ─── Create HTTP server from Express app ─────────────────────────────────────
const server = http.createServer(app);

// ─── Attach WebSocket server for Gemini Live voice ───────────────────────────
// Only sessions on /live path are handled by our live handler
const wss = new WebSocketServer({ server, path: '/live' });
attachLiveHandler(wss);

// ─── Start listening ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[StadiumPulse AI] Backend running on http://localhost:${PORT}`);
  console.log(`[StadiumPulse AI] Live Voice WebSocket: ws://localhost:${PORT}/live`);
  console.log(`[StadiumPulse AI] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('[StadiumPulse AI] Shutting down gracefully…');
  await closeAllLiveSessions();
  server.close();
});

process.on('SIGINT', async () => {
  console.log('[StadiumPulse AI] Interrupted — shutting down…');
  await closeAllLiveSessions();
  server.close();
  process.exit(0);
});
