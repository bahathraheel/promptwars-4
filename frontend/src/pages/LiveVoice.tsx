import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Camera, CameraOff, Radio, X, Volume2, Globe2, Zap, AlertCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionStatus = 'idle' | 'connecting' | 'ready' | 'listening' | 'speaking' | 'error';

interface TranscriptLine {
  id: string;
  text: string;
  type: 'you' | 'ai' | 'system';
  ts: Date;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

const WS_URL = (import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001')
  .replace(/^http/, 'ws');

// ── Audio worklet: PCM capture at 16kHz ──────────────────────────────────────
// Generated fresh each mount so each AudioContext gets its own blob URL
const WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch) {
      const int16 = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
`;

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SessionStatus, { color: string; label: string; icon: string }> = {
  idle:       { color: '#64748b', label: 'Ready to connect',  icon: '⚪' },
  connecting: { color: '#f59e0b', label: 'Connecting…',       icon: '🔄' },
  ready:      { color: '#22c55e', label: 'Live – speak now',  icon: '🟢' },
  listening:  { color: '#6366f1', label: 'Listening…',        icon: '🎙️' },
  speaking:   { color: '#ed872d', label: 'AI responding…',    icon: '🔊' },
  error:      { color: '#ef4444', label: 'Error',             icon: '🔴' },
};

// ── Sequential audio playback queue ──────────────────────────────────────────
// Plays PCM chunks one after another without overlapping.
class AudioPlaybackQueue {
  private ctx: AudioContext;
  private nextStartTime = 0;
  private playing = false;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 24000 });
  }

  enqueue(pcmBuffer: ArrayBuffer, onStart: () => void, onEmpty: () => void): void {
    const int16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    const audioBuffer = this.ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.ctx.destination);

    const chunkDuration = float32.length / 24000;
    const startAt = Math.max(this.ctx.currentTime, this.nextStartTime);

    if (!this.playing) {
      this.playing = true;
      onStart();
    }
    source.start(startAt);
    this.nextStartTime = startAt + chunkDuration;

    source.onended = () => {
      // If nothing scheduled after this chunk, we're done
      if (this.nextStartTime <= this.ctx.currentTime + 0.05) {
        this.playing = false;
        this.nextStartTime = 0;
        onEmpty();
      }
    };
  }

  async close(): Promise<void> {
    try { await this.ctx.close(); } catch { /* already closed */ }
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveVoice() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [targetLang, setTargetLang] = useState('en');
  const [cameraOn, setCameraOn] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(20).fill(3));

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // Mic capture refs
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const workletNodeRef  = useRef<AudioWorkletNode | null>(null);
  const micStreamRef    = useRef<MediaStream | null>(null);

  // Camera refs
  const cameraStreamRef    = useRef<MediaStream | null>(null);
  const videoRef           = useRef<HTMLVideoElement>(null);
  const cameraIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio playback
  const playbackQueueRef = useRef<AudioPlaybackQueue | null>(null);

  // Waveform animation
  const waveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcript scroll
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new transcript lines
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const addLine = useCallback((text: string, type: TranscriptLine['type']) => {
    setTranscript(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, text, type, ts: new Date() },
    ]);
  }, []);

  // ── Stop mic (stable ref so it can be called from anywhere) ──────────────
  const stopMic = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    if (waveIntervalRef.current !== null) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }
    setMicActive(false);
    setWaveAmplitudes(Array(20).fill(3));
  }, []);

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (cameraIntervalRef.current !== null) {
      clearInterval(cameraIntervalRef.current);
      cameraIntervalRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setCameraOn(false);
  }, []);

  // ── Stop audio playback ────────────────────────────────────────────────────
  const stopPlayback = useCallback(async () => {
    if (playbackQueueRef.current) {
      await playbackQueueRef.current.close();
      playbackQueueRef.current = null;
    }
  }, []);

  // ── Connect WebSocket ─────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus('connecting');
    setErrorMsg('');
    setTranscript([]);

    const ws = new WebSocket(`${WS_URL}/live?lang=${targetLang}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      addLine('Connecting to Gemini Live AI…', 'system');
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // ── Binary PCM audio chunk from Gemini ──────────────────────────────
        if (!playbackQueueRef.current) {
          playbackQueueRef.current = new AudioPlaybackQueue();
        }
        playbackQueueRef.current.enqueue(
          event.data,
          () => setStatus('speaking'),
          () => setStatus('ready'),
        );
      } else {
        // ── JSON control message ────────────────────────────────────────────
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            text?: string;
            message?: string;
            targetLang?: string;
            model?: string;
          };

          switch (msg.type) {
            case 'ready':
              setStatus('ready');
              addLine(
                `🟢 Live session started · ${msg.model ?? 'gemini-live'} · target: ${(msg.targetLang ?? 'en').toUpperCase()}`,
                'system',
              );
              break;

            case 'transcript':
              if (msg.text?.trim()) {
                if (msg.text.startsWith('[You]:')) {
                  addLine(msg.text.replace('[You]:', '').trim(), 'you');
                } else {
                  addLine(msg.text.trim(), 'ai');
                }
              }
              break;

            case 'error':
              setStatus('error');
              setErrorMsg(msg.message ?? 'Unknown error');
              addLine(`❌ ${msg.message ?? 'Connection error'}`, 'system');
              break;
          }
        } catch {
          // ignore JSON parse errors
        }
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setErrorMsg('WebSocket connection failed. Is the backend running?');
    };

    ws.onclose = () => {
      setStatus('idle');
      stopMic();
      addLine('Session ended.', 'system');
    };
  }, [targetLang, addLine, stopMic]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    stopMic();
    stopCamera();
    void stopPlayback();
    setStatus('idle');
  }, [stopMic, stopCamera, stopPlayback]);

  // ── Start mic ─────────────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    if (micActive) return;
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      micStreamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;

      // Create a fresh blob URL every time (required per AudioContext instance)
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl); // safe to revoke after addModule resolves

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, 'pcm-capture');
      workletNodeRef.current = worklet;

      worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      };
      source.connect(worklet);
      // worklet doesn't need to connect to destination (capture-only)

      setMicActive(true);
      setStatus('listening');

      waveIntervalRef.current = setInterval(() => {
        setWaveAmplitudes(Array.from({ length: 20 }, () => Math.random() * 32 + 4));
      }, 80);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Mic error: ${msg}`);
    }
  }, [micActive]);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);

      // Send a frame every 2 seconds while WS is open
      cameraIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        if (!video || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx2d = canvas.getContext('2d');
        if (!ctx2d) return;
        ctx2d.drawImage(video, 0, 0, 320, 240);
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        if (base64) {
          wsRef.current.send(JSON.stringify({ type: 'image', data: base64 }));
        }
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Camera error: ${msg}`);
    }
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  const isConnected = status !== 'idle' && status !== 'error';
  const cfg = STATUS_CONFIG[status];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: cfg.color,
                display: 'inline-block',
                boxShadow: isConnected ? `0 0 12px ${cfg.color}` : 'none',
                animation: isConnected ? 'pulse 2s infinite' : 'none',
              }}
              aria-hidden="true"
            />
            Live Voice Copilot
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Real-time AI voice · Gemini Live API · Multilingual
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Language selector — disabled while connected */}
          <div style={{ position: 'relative' }}>
            <Globe2
              size={14}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)' }}
              aria-hidden="true"
            />
            <select
              id="live-lang-select"
              value={targetLang}
              onChange={e => setTargetLang(e.target.value)}
              disabled={isConnected}
              style={{ paddingLeft: 26, fontSize: '0.8rem', minWidth: 120 }}
              aria-label="Select target translation language"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>

          {/* Connect / Disconnect */}
          {!isConnected ? (
            <button
              className="btn-primary"
              onClick={connect}
              id="live-connect-btn"
              aria-label="Start live voice session"
            >
              <Radio size={15} aria-hidden="true" />
              Start Live Session
            </button>
          ) : (
            <button
              className="btn-reject"
              onClick={disconnect}
              id="live-disconnect-btn"
              aria-label="End live voice session"
              style={{ gap: 6 }}
            >
              <X size={15} aria-hidden="true" />
              End Session
            </button>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div
        className="page-content"
        style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, flex: 1, overflow: 'hidden' }}
      >
        {/* Left: Status + Transcript */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

          {/* Status bar */}
          <div
            className="card"
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderColor: cfg.color + '44',
              background: `${cfg.color}0d`,
              flexShrink: 0,
            }}
            role="status"
            aria-live="polite"
          >
            <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: cfg.color }}>
                {cfg.label}
              </span>
              {errorMsg && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>{errorMsg}</p>
              )}
            </div>
            {/* Waveform — only when mic is active */}
            {isConnected && (
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
                {waveAmplitudes.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: micActive ? h : 3,
                      borderRadius: 2,
                      background: micActive ? 'var(--color-primary)' : 'var(--color-border)',
                      transition: 'height 0.08s ease',
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div
            className="card"
            style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: 20 }}
            role="log"
            aria-live="polite"
            aria-label="Live conversation transcript"
          >
            {transcript.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', flex: 1, gap: 16, color: 'var(--color-text-muted)',
              }}>
                <Zap size={40} style={{ opacity: 0.3 }} aria-hidden="true" />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>Start a live session to begin</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    Your conversation transcript appears here in real time
                  </p>
                </div>
              </div>
            )}

            {transcript.map(line => (
              <div
                key={line.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems:
                    line.type === 'you' ? 'flex-end'
                    : line.type === 'system' ? 'center'
                    : 'flex-start',
                }}
              >
                {line.type === 'system' ? (
                  <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-dim)',
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 20,
                  }}>
                    {line.text}
                  </span>
                ) : (
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: line.type === 'you' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: line.type === 'you' ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: line.type === 'you' ? '#fff' : 'var(--color-text)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    border: line.type === 'ai' ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <span style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', marginBottom: 4 }}>
                      {line.type === 'you' ? '🎙️ You' : '🤖 AI Copilot'} · {line.ts.toLocaleTimeString()}
                    </span>
                    {line.text}
                  </div>
                )}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Microphone button */}
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{
              fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 16,
              fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Microphone
            </p>
            <button
              id="live-mic-btn"
              onClick={micActive ? stopMic : () => void startMic()}
              disabled={!isConnected}
              aria-label={micActive ? 'Stop microphone' : 'Start microphone'}
              aria-pressed={micActive}
              style={{
                width: 88, height: 88,
                borderRadius: '50%',
                border: 'none',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                background: micActive
                  ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                  : 'var(--color-surface)',
                color: micActive ? '#fff' : 'var(--color-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: micActive
                  ? '0 0 32px rgba(99,102,241,0.5)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease',
                animation: micActive ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
              }}
            >
              {micActive
                ? <Mic size={32} aria-hidden="true" />
                : <MicOff size={32} aria-hidden="true" />}
            </button>
            <p style={{ fontSize: '0.8rem', color: micActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
              {!isConnected ? 'Connect first' : micActive ? 'Listening — click to stop' : 'Click to speak'}
            </p>
          </div>

          {/* Camera */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                Camera Feed
              </p>
              <button
                id="live-camera-btn"
                onClick={cameraOn ? stopCamera : () => void startCamera()}
                disabled={!isConnected}
                className={cameraOn ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                aria-label={cameraOn ? 'Stop camera' : 'Start camera'}
                aria-pressed={cameraOn}
              >
                {cameraOn
                  ? <><CameraOff size={12} aria-hidden="true" /> Stop</>
                  : <><Camera size={12} aria-hidden="true" /> Start</>}
              </button>
            </div>

            <div
              style={{
                width: '100%', aspectRatio: '4/3',
                borderRadius: 8,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Camera preview"
            >
              {cameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  aria-label="Live camera feed"
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
                  <Camera size={28} style={{ marginBottom: 8, opacity: 0.3 }} aria-hidden="true" />
                  <p>Camera off</p>
                  <p style={{ fontSize: '0.7rem', marginTop: 4 }}>AI can see what you point at</p>
                </div>
              )}
            </div>
          </div>

          {/* Info card */}
          <div className="card" style={{ padding: 16, borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={14} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: 6 }}>
                  Powered by Gemini Live API
                </p>
                <ul style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.6, listStyle: 'none' }}>
                  <li>🎤 Real-time voice streaming</li>
                  <li>🌐 Live multilingual translation</li>
                  <li>📷 Visual context awareness</li>
                  <li>🔒 Audio processed server-side</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Speaking indicator */}
          {status === 'speaking' && (
            <div className="card animate-fadeInUp" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Volume2 size={16} style={{ color: 'var(--color-accent-2)' }} aria-hidden="true" />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent-2)', fontWeight: 600 }}>
                AI is speaking…
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
