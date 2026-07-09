/**
 * StadiumPulse AI – Gemini Live Session Service
 *
 * Wraps the @google/genai Live API for real-time bidirectional audio streaming.
 * Each fan session gets its own isolated Live API connection that is cleaned up
 * on disconnect.
 *
 * Model: gemini-2.5-flash-preview-native-audio-dialog
 * Audio in:  16kHz PCM mono (from browser mic)
 * Audio out: 24kHz PCM mono (to browser speaker)
 */

import { GoogleGenAI, Modality, MediaResolution, type Session } from '@google/genai';

// ─── Constants ──────────────────────────────────────────────────────────────

const LIVE_MODEL = 'gemini-2.5-flash-preview-native-audio-dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiveSessionCallbacks {
  onAudioChunk: (pcmData: Buffer) => void;
  onText: (text: string) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export interface ManagedLiveSession {
  /** Send raw PCM audio bytes from the browser mic (16kHz, 16-bit, mono) */
  sendAudio: (data: Buffer) => Promise<void>;
  /** Send a JPEG image frame (base64-encoded) from browser camera */
  sendImage: (base64Jpeg: string) => Promise<void>;
  /** Send a text turn */
  sendText: (text: string) => Promise<void>;
  /** Close the session and release resources */
  close: () => Promise<void>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a managed Gemini Live session.
 * @param targetLang  ISO-639-1 code for the translation target (default 'en')
 * @param callbacks   Handlers for incoming audio, text, errors, and close events
 */
export async function createLiveSession(
  targetLang: string = 'en',
  callbacks: LiveSessionCallbacks,
): Promise<ManagedLiveSession> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey || apiKey === 'your_gemini_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not set. The Gemini Live Voice feature requires a valid Gemini API key.',
    );
  }

  const client = new GoogleGenAI({ apiKey });

  // Build Live API config
  const config = {
    responseModalities: [Modality.AUDIO],
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
    systemInstruction: {
      parts: [
        {
          text: `You are the StadiumPulse Fan Copilot at FIFA World Cup 2026.
Help fans with navigation, accessibility, transport, food, safety, and stadium information.
Be concise and friendly — this is a voice interaction, so speak naturally.
Target response language: ${targetLang.toUpperCase()}.
If asked something outside your knowledge, suggest visiting a Guest Services desk.`,
        },
      ],
    },
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Aoede' },
      },
    },
  };

  let session: Session | null = null;
  let closed = false;
  let closeScheduled = false; // prevents double-close from close() + onclose()

  // ── Connect to Gemini Live API ─────────────────────────────────────────
  try {
    session = await client.live.connect({
      model: LIVE_MODEL,
      config,
      callbacks: {
        onopen: () => {
          console.log('[LiveSession] Connected to Gemini Live API');
        },
        onmessage: (message: unknown) => {
          handleGeminiMessage(message, callbacks);
        },
        onerror: (error: unknown) => {
          console.error('[LiveSession] WebSocket error:', error);
          if (!closed) {
            callbacks.onError(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
        },
        onclose: (event: unknown) => {
          const ev = event as { code?: number; reason?: string } | undefined;
          console.log(`[LiveSession] Connection closed: ${ev?.code ?? 'unknown'} – ${ev?.reason ?? ''}`);
          if (!closed) {
            closed = true;
            callbacks.onClose();
          }
        },
      },
    });
  } catch (err) {
    throw new Error(
      `Failed to connect to Gemini Live API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Return managed session interface ───────────────────────────────────
  return {
    sendAudio: async (data: Buffer) => {
      if (!session || closed) return;
      try {
        await session.sendRealtimeInput({
          audio: {
            data: data.toString('base64'),
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } catch (err) {
        console.error('[LiveSession] sendAudio error:', err);
      }
    },

    sendImage: async (base64Jpeg: string) => {
      if (!session || closed) return;
      try {
        await session.sendRealtimeInput({
          video: {
            data: base64Jpeg,
            mimeType: 'image/jpeg',
          },
        });
      } catch (err) {
        console.error('[LiveSession] sendImage error:', err);
      }
    },

    sendText: async (text: string) => {
      if (!session || closed) return;
      try {
        await session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true,
        });
      } catch (err) {
        console.error('[LiveSession] sendText error:', err);
      }
    },

    close: async () => {
      if (closeScheduled) return; // idempotent
      closeScheduled = true;
      closed = true;
      const sessionToClose = session; // capture before nulling
      session = null;                 // block further sends immediately
      try {
        sessionToClose?.close();
      } catch (err) {
        console.error('[LiveSession] close error:', err);
      }
    },
  };
}

// ─── Gemini message handler ───────────────────────────────────────────────

function handleGeminiMessage(message: unknown, callbacks: LiveSessionCallbacks): void {
  const msg = message as Record<string, unknown>;

  // Audio data and text from Gemini
  const serverContent = msg['serverContent'] as Record<string, unknown> | undefined;
  if (serverContent) {
    const modelTurn = serverContent['modelTurn'] as Record<string, unknown> | undefined;
    if (modelTurn) {
      const parts = modelTurn['parts'] as Array<Record<string, unknown>> | undefined;
      if (parts) {
        for (const part of parts) {
          // Inline audio
          const inlineData = part['inlineData'] as Record<string, unknown> | undefined;
          if (inlineData) {
            const data = inlineData['data'] as string | undefined;
            if (data) {
              const audioBuffer = Buffer.from(data, 'base64');
              callbacks.onAudioChunk(audioBuffer);
            }
          }
          // Text transcript
          const text = part['text'] as string | undefined;
          if (text) {
            callbacks.onText(text);
          }
        }
      }
    }

    // Turn complete — signal end of response
    const turnComplete = serverContent['turnComplete'] as boolean | undefined;
    if (turnComplete) {
      callbacks.onText('\n');
    }
  }

  // What Gemini heard from the user
  const inputTranscription = msg['inputTranscription'] as Record<string, unknown> | undefined;
  if (inputTranscription) {
    const text = inputTranscription['text'] as string | undefined;
    if (text) {
      callbacks.onText(`[You]: ${text}`);
    }
  }
}
