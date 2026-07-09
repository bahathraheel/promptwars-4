import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mic, MicOff, Eye, MessageSquare, Smartphone, Smile, Globe,
  CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';
import { api, type ChatMessage, type ChatResponse } from '../api/client';

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = 'chat' | 'sms' | 'pictogram' | 'voice';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: ChatResponse;
  timestamp: Date;
}

const LANGUAGES = [
  { code: 'en', label: 'EN 🇺🇸' },
  { code: 'es', label: 'ES 🇪🇸' },
  { code: 'hi', label: 'HI 🇮🇳' },
  { code: 'fr', label: 'FR 🇫🇷' },
  { code: 'ar', label: 'AR 🇸🇦' },
  { code: 'pt', label: 'PT 🇧🇷' },
];

const SUGGESTED_QUESTIONS = [
  'Where is the nearest accessible entrance?',
  'How do I get here by metro?',
  'Where is the medical station?',
  '¿Dónde está la entrada accesible más cercana?',
  'किस गेट पर wheelchair की सुविधा है?',
];

// ── SMS Mock component ─────────────────────────────────────────────────────
function SmsMockView({ messages }: { messages: UiMessage[] }) {
  return (
    <div className="sms-mock animate-fadeInUp" aria-label="SMS-style chat interface">
      <div className="sms-header">📱 StadiumPulse SMS (no smartphone needed)</div>
      {messages.map((m) => (
        <div key={m.id} className={m.role === 'user' ? 'sms-msg-in' : 'sms-msg-out'}>
          {m.role === 'user' ? '> ' : '< '}{m.content}
        </div>
      ))}
    </div>
  );
}

// ── Sign Language widget ────────────────────────────────────────────────────
function SignLanguageWidget({ lastMessage }: { lastMessage: string }) {
  return (
    <div className="sign-lang-widget" aria-label="Sign language interpretation widget">
      <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🤟</div>
      <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sign Language Interpretation</p>
      <p style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.5 }}>
        {lastMessage
          ? `PA message: "${lastMessage.slice(0, 120)}..."`
          : 'Sign language avatar appears here for PA announcements'}
      </p>
      <p style={{ fontSize: '0.7rem', marginTop: '8px', color: 'var(--color-text-dim)' }}>
        [Avatar video clip stub — request sign language at Gate 1 Guest Services]
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FanCopilot() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '👋 Welcome to **StadiumPulse AI**! I\'m your FIFA World Cup 2026 assistant.\n\nAsk me about gates, accessible routes, medical stations, transport, food, or stadium policies. I speak English, Spanish, Hindi, and more!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('chat');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [pictogramMode, setPictogramMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Text-to-speech stub: architecture-level hook
  useEffect(() => {
    if (!voiceEnabled) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        lastMsg.content.replace(/\*\*/g, '').slice(0, 500),
      );
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, voiceEnabled, language]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const history: ChatMessage[] = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const activeMode = pictogramMode ? 'pictogram' : mode;
      const res = await api.chat({
        message: text.trim(),
        history,
        language,
        mode: activeMode,
      });

      const assistantMsg: UiMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        meta: res,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: UiMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ I couldn\'t connect to the server. Please check your connection or ask a nearby steward.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, mode, language, pictogramMode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  // Speech-to-text stub — web Speech API where available
  const startVoiceInput = () => {
    const anyWindow = window as any;
    if (!anyWindow.webkitSpeechRecognition && !anyWindow.SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please type your question.');
      return;
    }
    const SR = anyWindow.SpeechRecognition ?? anyWindow.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = language;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setInput(transcript);
      textareaRef.current?.focus();
    };
    recognition.start();
  };

  const activeMode = pictogramMode ? 'pictogram' : mode;

  return (
    <div className="chat-container" aria-label="Fan Copilot chat interface">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2>Fan Copilot</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Multilingual AI assistant — navigation, accessibility, transport &amp; more
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Mode toggles */}
          <div className="toggle-group" role="group" aria-label="Chat mode">
            {([
              { v: 'chat',      icon: <MessageSquare size={12} />, label: 'Chat' },
              { v: 'sms',       icon: <Smartphone size={12} />,    label: 'SMS' },
              { v: 'voice',     icon: <Mic size={12} />,           label: 'Voice' },
            ] as const).map(({ v, icon, label }) => (
              <button
                key={v}
                className={`toggle-pill ${activeMode === v && !pictogramMode ? 'active' : ''}`}
                onClick={() => { setMode(v); setPictogramMode(false); }}
                aria-pressed={mode === v && !pictogramMode}
                aria-label={`Switch to ${label} mode`}
                id={`mode-${v}`}
              >
                {icon} {label}
              </button>
            ))}
            <button
              className={`toggle-pill ${pictogramMode ? 'active' : ''}`}
              onClick={() => setPictogramMode((p) => !p)}
              aria-pressed={pictogramMode}
              aria-label="Toggle pictogram mode for low-literacy support"
              id="mode-pictogram"
            >
              <Smile size={12} /> Pictogram
            </button>
          </div>

          {/* Language selector */}
          <div style={{ position: 'relative' }}>
            <label htmlFor="language-select" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              Select language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
              aria-label="Select response language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* TTS toggle */}
          <button
            className={`btn-icon ${voiceEnabled ? 'active' : ''}`}
            onClick={() => setVoiceEnabled((v) => !v)}
            aria-pressed={voiceEnabled}
            aria-label={voiceEnabled ? 'Disable voice output' : 'Enable voice output (text-to-speech)'}
            title="Toggle voice output"
          >
            {voiceEnabled ? <Mic size={15} aria-hidden="true" /> : <MicOff size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ── SMS mock view ── */}
      {mode === 'sms' && !pictogramMode && (
        <div style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <SmsMockView messages={messages} />
          <div style={{ flex: 1 }}>
            <div className="card">
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                <Eye size={14} style={{ display: 'inline', marginRight: '6px' }} aria-hidden="true" />
                SMS mode: plain text only, no rich UI required. Works on basic feature phones.
              </p>
              <Globe size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--color-primary)' }} aria-hidden="true" />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                Multi-language support active — responses in selected language.
              </span>
            </div>
            <div style={{ marginTop: '16px' }}>
              <SignLanguageWidget lastMessage={messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content ?? ''} />
            </div>
          </div>
        </div>
      )}

      {/* ── Suggested questions ── */}
      {messages.length <= 1 && mode !== 'sms' && (
        <div style={{ padding: '0 24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              className="btn-ghost"
              style={{ fontSize: '0.75rem' }}
              onClick={() => void sendMessage(q)}
              aria-label={`Ask: ${q}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      {mode !== 'sms' && (
        <div
          className="chat-messages"
          role="log"
          aria-live="polite"
          aria-label="Chat message history"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.role} animate-fadeInUp`}>
              <div
                className="bubble-content"
                style={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>'),
                }}
              />
              {msg.meta && (
                <div className="bubble-meta" aria-label="Message metadata">
                  {msg.meta.isGrounded ? (
                    <CheckCircle size={11} color="var(--color-green)" aria-hidden="true" />
                  ) : (
                    <AlertCircle size={11} color="var(--color-yellow)" aria-hidden="true" />
                  )}
                  <span>{msg.meta.isGrounded ? 'Grounded' : 'Low confidence'}</span>
                  <span>·</span>
                  <span>{msg.meta.intent}</span>
                  <span>·</span>
                  <span>{msg.meta.responseTimeMs}ms</span>
                  <span>·</span>
                  <span style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>
                    {msg.meta.modelUsed.split('-').slice(0, 2).join('-')}
                  </span>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message-bubble assistant animate-fadeInUp" aria-live="assertive" aria-label="Assistant is thinking">
              <div className="bubble-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span style={{ color: 'var(--color-text-muted)' }}>Thinking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="chat-input-bar" role="form" aria-label="Chat input">
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            pictogramMode
              ? 'Ask in any language 😊 Type or speak...'
              : mode === 'voice'
              ? 'Click 🎙️ or type your question...'
              : 'Ask about gates, transport, accessibility, food...'
          }
          rows={1}
          disabled={loading}
          aria-label="Type your message to the Fan Copilot"
          aria-describedby="chat-hint"
        />
        <span id="chat-hint" style={{ display: 'none' }}>Press Enter to send, Shift+Enter for new line</span>

        {/* Voice input button */}
        <button
          className="btn-icon"
          onClick={startVoiceInput}
          aria-label="Start voice input (speech to text)"
          title="Voice input"
          disabled={loading}
        >
          <Mic size={16} aria-hidden="true" />
        </button>

        <button
          className="btn-primary"
          onClick={() => void sendMessage(input)}
          disabled={!input.trim() || loading}
          aria-label="Send message"
          id="send-button"
        >
          {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
