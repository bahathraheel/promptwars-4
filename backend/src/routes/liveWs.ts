/**
 * StadiumPulse AI – Live Voice WebSocket Handler
 *
 * Handles browser WebSocket connections at /live and proxies
 * real-time audio between the browser and the Gemini Live API.
 *
 * Protocol (Browser → Server):
 *   binary frames  – raw 16kHz PCM audio
 *   { type: 'image', data: '<base64 jpeg>' }
 *   { type: 'text',  text: '<message>' }
 *   { type: 'ping' }
 *
 * Protocol (Server → Browser):
 *   binary frames  – raw 24kHz PCM audio from Gemini
 *   { type: 'ready',      model, targetLang }
 *   { type: 'transcript', text }
 *   { type: 'error',      message }
 *   { type: 'pong' }
 */

import { WebSocket, type WebSocketServer } from 'ws';
import { type IncomingMessage } from 'http';
import { createLiveSession, type ManagedLiveSession } from '../services/liveSession.js';

// ─── Active sessions ──────────────────────────────────────────────────────────
// Keyed by WebSocket so we can clean up on disconnect
const activeSessions = new Map<WebSocket, ManagedLiveSession>();

// ─── Attach handler ───────────────────────────────────────────────────────────

export function attachLiveHandler(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const urlStr = `http://localhost${req.url ?? '/'}`;
    const url = new URL(urlStr);
    const targetLang = url.searchParams.get('lang') ?? 'en';

    console.log(`[LiveWS] New connection — targetLang=${targetLang}`);

    // Track whether the browser disconnected before the session was ready
    let browserGone = false;
    // Track whether we have already cleaned up this connection
    let cleanedUp = false;

    // ── Helpers ──────────────────────────────────────────────────────────────

    function safeSend(payload: string | Buffer): void {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(payload); } catch { /* ignore late sends */ }
      }
    }

    async function cleanupSession(session: ManagedLiveSession | null): Promise<void> {
      if (cleanedUp) return;
      cleanedUp = true;
      activeSessions.delete(ws);
      if (session) {
        try { await session.close(); } catch { /* already closed */ }
      }
    }

    // ── Initialize Gemini Live session ────────────────────────────────────────
    let sessionRef: ManagedLiveSession | null = null;

    // Use a Promise that resolves to the session (or null on failure)
    const sessionReady: Promise<ManagedLiveSession | null> = createLiveSession(
      targetLang,
      {
        onAudioChunk: (pcmData) => safeSend(pcmData),

        onText: (text) => {
          safeSend(JSON.stringify({ type: 'transcript', text }));
        },

        onError: (error) => {
          console.error('[LiveWS] Gemini error:', error.message);
          safeSend(JSON.stringify({ type: 'error', message: error.message }));
          // Don't close the WS here — let the caller decide; the onerror fires before onclose
        },

        onClose: () => {
          console.log('[LiveWS] Gemini session closed remotely');
          void cleanupSession(sessionRef);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Gemini session ended');
          }
        },
      },
    ).then((s) => {
      sessionRef = s;

      // If the browser already disconnected while we were connecting, close immediately
      if (browserGone) {
        void cleanupSession(s);
        return null;
      }

      activeSessions.set(ws, s);
      safeSend(JSON.stringify({
        type: 'ready',
        model: 'gemini-2.5-flash-live',
        targetLang,
      }));
      return s;

    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to start live session';
      console.error('[LiveWS] Session init failed:', message);
      safeSend(JSON.stringify({ type: 'error', message }));
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1011, message.slice(0, 120));
      }
      return null;
    });

    // ── Handle messages from browser ──────────────────────────────────────────
    ws.on('message', (data, isBinary) => {
      // Fire-and-forget with explicit error catch — never let an unhandled rejection escape
      void (async () => {
        // Wait for the session to be ready before forwarding anything
        const session = await sessionReady;
        if (!session) return; // session failed or browser already gone

        try {
          if (isBinary) {
            // Raw PCM audio from mic
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
            await session.sendAudio(buf);
          } else {
            const msg = JSON.parse(data.toString()) as {
              type: string;
              data?: string;
              text?: string;
            };

            if (msg.type === 'image' && msg.data) {
              await session.sendImage(msg.data);
            } else if (msg.type === 'text' && msg.text) {
              await session.sendText(msg.text);
            } else if (msg.type === 'ping') {
              safeSend(JSON.stringify({ type: 'pong' }));
            }
          }
        } catch (err) {
          console.error('[LiveWS] message handler error:', err instanceof Error ? err.message : err);
        }
      })();
    });

    // ── Handle browser disconnect ──────────────────────────────────────────────
    ws.on('close', () => {
      console.log('[LiveWS] Browser disconnected — cleaning up');
      browserGone = true;
      // sessionRef might still be null if init hasn't resolved yet;
      // the promise chain above handles that case via browserGone flag
      void cleanupSession(sessionRef);
    });

    ws.on('error', (err) => {
      console.error('[LiveWS] WebSocket error:', err.message);
      // The 'close' event will fire after this and handle cleanup
    });
  });

  console.log('[LiveWS] Live voice WebSocket handler attached');
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

export async function closeAllLiveSessions(): Promise<void> {
  const entries = Array.from(activeSessions.entries());
  activeSessions.clear();
  await Promise.allSettled(
    entries.map(async ([ws, session]) => {
      try { await session.close(); } catch { /* ignore */ }
      try { ws.terminate(); } catch { /* ignore */ }
    }),
  );
}
