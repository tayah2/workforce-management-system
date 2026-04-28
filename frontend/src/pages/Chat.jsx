import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../components/Toast.jsx';

const api = axios.create({ baseURL: 'http://localhost:5000' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const SUGGESTIONS = [
  'When is my next shift?',
  'How many hours have I worked this month?',
  'What is the sick leave policy?',
  'How do I report an absence?',
  'What training do I need to complete?',
];

function RobotAvatar() {
  return (
    <div
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        flexShrink: 0,
        alignSelf: 'flex-end',
      }}
    >
      {'🤖'}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-center gap-2">
      <RobotAvatar />
      <div className="chat-bubble assistant">
        <div className="chat-typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/chat', {
        message: trimmed,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = data.reply ?? 'Sorry, I did not understand that.';
      setMessages([...newHistory, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to get a response. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleSuggestion = (suggestion) => {
    send(suggestion);
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h1 className="page-title">{'🤖'} AI Assistant</h1>
        <p className="page-subtitle">Ask me anything about your shifts, pay, or policies</p>
      </div>

      <div className="card chat-container">
        {/* Messages area */}
        <div className="chat-messages">
          {messages.length === 0 && !loading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px' }}>{'🤖'}</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '6px' }}>
                  How can I help you today?
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Try one of the suggestions below or type your own question
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              {msg.role === 'assistant' && <RobotAvatar />}
              <div className={`chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && <TypingBubble />}

          {error && (
            <div
              style={{
                background: 'var(--danger-light)',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#991b1b',
                alignSelf: 'center',
                maxWidth: '400px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions (only when empty) */}
        {messages.length === 0 && !loading && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chat-suggestion" onClick={() => handleSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="chat-input-bar">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything... (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            style={{ resize: 'none', minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ flexShrink: 0 }}
          >
            {loading ? (
              <div className="spinner spinner-sm" style={{ borderTopColor: 'white' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
            {!loading && 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
