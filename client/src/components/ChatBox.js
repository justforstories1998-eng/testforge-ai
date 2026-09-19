import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FaRobot,
  FaUser,
  FaPaperPlane,
  FaImage,
  FaTimes,
  FaSyncAlt,
  FaCopy,
  FaCheck,
  FaStop,
  FaTrashAlt,
  FaPlus,
  FaExchangeAlt,
  FaSpinner,
  FaFileCsv,
  FaMarkdown,
  FaFlask,
  FaDownload,
} from 'react-icons/fa';
import ModelSelector from './ModelSelector';
import ReasoningSelector from './ReasoningSelector';
import { chatWithAI } from '../services/api';
import './ChatBox.css';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

let messageId = 0;
const nextId = () => `msg-${Date.now()}-${messageId++}`;

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function stripSummaryLine(text) {
  return String(text || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('> ✅ Generated'))
    .join('\n')
    .trim();
}

function ChatBox({
  criteria,
  meta,
  model,
  models,
  onModelChange,
  reasoning,
  onReasoningChange,
  aiReady,
  onInsertCriteria,
  onTestCasesGenerated,
  onExportChat,
}) {
  const [mode, setMode] = useState('criteria');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null); // { dataUrl, name }
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const abortRef = useRef(null);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const inputRef = useRef(null);

  const visionOn = (models || []).some((m) => m.id === model && m.vision);
  const canSend =
    !sending && aiReady && (input.trim().length > 0 || image) && !(image && !visionOn);

  // Auto-scroll only when the user is already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, sending, mode]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  };

  const pushMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: nextId(), ts: Date.now(), ...msg }]);
  }, []);

  const pushSystemNote = useCallback(
    (content) => pushMessage({ role: 'system', content }),
    [pushMessage]
  );

  // ─── Image handling (paste, drop, picker) ──────────────────────
  const attachFile = useCallback(
    (file) => {
      if (!file) return;
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        pushSystemNote('Only PNG, JPEG, GIF or WebP images are supported.');
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        pushSystemNote('Image is too large. Maximum size is 6 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImage({ dataUrl: reader.result, name: file.name || 'image' });
      };
      reader.readAsDataURL(file);
    },
    [pushSystemNote]
  );

  const handlePaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    const img = files.find((f) => f.type.startsWith('image/'));
    if (img) {
      e.preventDefault();
      attachFile(img);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!visionOn) return;
    const file = Array.from(e.dataTransfer?.files || []).find((f) =>
      f.type.startsWith('image/')
    );
    if (file) attachFile(file);
  };

  // ─── Send / stop / retry ───────────────────────────────────────
  const send = useCallback(
    async (override) => {
      const text = (override?.text ?? input).trim();
      const img = override?.image !== undefined ? override.image : image;
      if (sending) return;
      if (!aiReady) return;
      if (!text && !img) return;
      if (img && !visionOn) return;

      const userMsg = {
        role: 'user',
        content: text,
        imageThumb: img?.dataUrl || null,
        imageName: img?.name || null,
        hadImage: !!img,
      };
      pushMessage(userMsg);
      if (!override) {
        setInput('');
        setImage(null);
      }
      setSending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const history = [...messages, userMsg]
        .slice(-13, -1)
        .map((m) => ({ role: m.role, content: m.content, hadImage: !!m.hadImage }));

      try {
        const res = await chatWithAI(
          {
            model,
            mode,
            reasoning,
            acceptanceCriteria: mode === 'criteria' ? criteria || '' : '',
            meta: meta || {},
            history,
            text,
            image: img?.dataUrl || null,
          },
          { signal: controller.signal }
        );

        const testInfo =
          res.testCases && res.testCases.length > 0
            ? { scenarios: res.scenarios || 0, count: res.count || 0 }
            : null;

        pushMessage({
          role: 'assistant',
          content: res.reply || '(empty response)',
          testInfo,
          rows: testInfo ? res.testCases : null,
          model: res.model || model,
        });

        if (res.truncated) {
          pushSystemNote(
            testInfo
              ? 'Output was cut off by length limits — showing complete scenarios only. Ask for fewer scenarios per message, or say “continue” to append more.'
              : 'Output was cut off before any complete scenario — ask for fewer scenarios per message.'
          );
        }

        if (testInfo) {
          const isContinue = /continue|more|next|remaining|rest of/i.test(text);
          onTestCasesGenerated(res.testCases, {
            scenarios: testInfo.scenarios,
            count: testInfo.count,
            model: res.model || model,
            append: isContinue,
          });
        }
      } catch (err) {
        if (err?.canceled) {
          pushMessage({ role: 'system', content: 'Generation stopped.' });
        } else {
          pushMessage({
            role: 'assistant',
            content: '',
            error: err?.error || err?.message || 'Chat failed. Please try again.',
            isRateLimit: !!err?.isRateLimitError,
            isConnection: !!err?.isConnectionError,
            source: { text, image: img },
          });
        }
      } finally {
        setSending(false);
        abortRef.current = null;
        stickRef.current = true;
      }
    },
    [input, image, sending, aiReady, visionOn, messages, pushMessage, pushSystemNote, model, mode, reasoning, criteria, meta, onTestCasesGenerated]
  );

  const stop = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  const retry = (failedMsg) => {
    if (!failedMsg?.source || sending) return;
    setMessages((prev) => prev.filter((m) => m.id !== failedMsg.id));
    send({ text: failedMsg.source.text, image: failedMsg.source.image });
  };

  const clearConversation = () => {
    if (sending) return;
    if (messages.length === 0 && !image) return;
    if (!window.confirm('Clear this conversation?')) return;
    setMessages([]);
    setImage(null);
    setInput('');
  };

  const downloadTranscript = () => {
    if (messages.length === 0 || sending) return;
    const lines = [
      '# Test-CaseAI Chat Transcript',
      '',
      `- Exported: ${new Date().toLocaleString()}`,
      `- Models used: ${[...new Set(messages.filter((m) => m.model).map((m) => m.model))].join(', ') || model}`,
      '',
      '---',
      '',
    ];
    for (const msg of messages) {
      if (msg.role === 'system') {
        lines.push(`> *${stripSummaryLine(msg.content)}*`, '');
      } else if (msg.role === 'user') {
        lines.push(`## User · ${formatTime(msg.ts)}`, '');
        if (msg.imageThumb) lines.push(`[image attached: ${msg.imageName || 'image'}]`, '');
        if (msg.content) lines.push(msg.content, '');
      } else {
        lines.push(`## Assistant · ${formatTime(msg.ts)}${msg.model ? ` · ${msg.model}` : ''}`, '');
        if (msg.error) {
          lines.push(`**Error:** ${msg.error}`, '');
        } else {
          if (msg.content) lines.push(stripSummaryLine(msg.content), '');
          if (msg.testInfo) {
            lines.push(`> Generated ${msg.testInfo.scenarios} scenario(s) (${msg.testInfo.count} rows).`, '');
          }
        }
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `testcaseai-chat-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const switchMode = (next) => {
    if (next === mode || sending) return;
    setMode(next);
    pushSystemNote(
      next === 'solo'
        ? 'Solo mode — general assistant, no project context attached.'
        : 'Criteria mode — the AI can see your Acceptance Criteria and load test cases into results.'
    );
  };

  const copyMessage = async (msg) => {
    const text = stripSummaryLine(msg.content) || msg.content;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) send();
    } else if (e.key === 'Escape') {
      if (sending) stop();
    }
  };

  return (
    <section
      className={`card chat-card ${dragOver ? 'chat-dragging' : ''}`}
      aria-label="AI Assistant"
      onDragOver={(e) => {
        if (!visionOn) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header: title + mode switch + model */}
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-title-icon">
            <FaRobot />
          </span>
          <div>
            <h3>AI Assistant</h3>
            <p>
              {mode === 'criteria'
                ? 'Works with your criteria · results load automatically'
                : 'Independent general assistant'}
            </p>
          </div>
        </div>
        <div className="chat-header-controls">
          <div className="chat-modes" role="tablist" aria-label="Chat mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'criteria'}
              className={mode === 'criteria' ? 'active' : ''}
              onClick={() => switchMode('criteria')}
              disabled={sending}
              title="AI works within your Acceptance Criteria context"
            >
              Criteria &amp; Stories
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'solo'}
              className={mode === 'solo' ? 'active' : ''}
              onClick={() => switchMode('solo')}
              disabled={sending}
              title="Independent assistant without project context"
            >
              Solo
            </button>
          </div>
          <ModelSelector
            models={models}
            value={model}
            onChange={onModelChange}
            disabled={sending}
            compact
          />
          <ReasoningSelector
            value={reasoning}
            onChange={onReasoningChange}
            disabled={sending}
            compact
          />
          <button
            type="button"
            className="icon-btn"
            onClick={downloadTranscript}
            disabled={sending || messages.length === 0}
            title="Download conversation (.md)"
            aria-label="Download conversation"
          >
            <FaDownload />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={clearConversation}
            disabled={sending || (messages.length === 0 && !image)}
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <FaTrashAlt />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef} onScroll={handleScroll} aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <FaRobot />
            <p>
              {mode === 'criteria'
                ? 'Ask me to explain, improve, or generate from your acceptance criteria — or attach a screenshot and say “generate test cases from this image”.'
                : 'Ask me anything. Switch to “Criteria & Stories” to work with your project context.'}
            </p>
            {!aiReady && <p className="chat-welcome-offline">AI is offline — reconnect to start chatting.</p>}
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="chat-system-note">
                {msg.content}
              </div>
            );
          }
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`chat-msg ${isUser ? 'chat-user' : 'chat-ai'}`}>
              <span className="chat-avatar" aria-hidden="true">
                {isUser ? <FaUser /> : <FaRobot />}
              </span>
              <div className="chat-bubble">
                {msg.imageThumb && (
                  <a
                    href={msg.imageThumb}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open full image"
                  >
                    <img
                      src={msg.imageThumb}
                      alt={msg.imageName || 'Attached image'}
                      className="chat-msg-thumb"
                    />
                  </a>
                )}
                {msg.error ? (
                  <div className="chat-error">
                    <p>{msg.error}</p>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => retry(msg)}
                      disabled={sending || !aiReady}
                    >
                      <FaSyncAlt /> Retry
                    </button>
                  </div>
                ) : isUser ? (
                  msg.content && <p className="chat-text">{msg.content}</p>
                ) : (
                  msg.content && (
                    <div className="chat-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )
                )}
                {msg.testInfo && msg.rows?.length > 0 && (
                  <div className="chat-result-card">
                    <p className="chat-testinfo">
                      ✅ {msg.testInfo.scenarios} scenario(s) · {msg.testInfo.count} rows — download:
                    </p>
                    <span className="chat-result-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onExportChat('csv', msg.rows)}
                      >
                        <FaFileCsv /> CSV
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onExportChat('markdown', msg.rows)}
                      >
                        <FaMarkdown /> Markdown
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onExportChat('playwright', msg.rows)}
                      >
                        <FaFlask /> .spec.ts
                      </button>
                    </span>
                  </div>
                )}
                {msg.testInfo && !msg.rows?.length && (
                  <p className="chat-testinfo">
                    ✅ {msg.testInfo.scenarios} scenario(s) loaded into Session Results below.
                  </p>
                )}
                <div className="chat-msg-foot">
                  <span className="mono chat-time">{formatTime(msg.ts)}</span>
                  {!isUser && !msg.error && msg.content && (
                    <span className="chat-msg-actions">
                      <button
                        type="button"
                        title="Copy message"
                        aria-label="Copy message"
                        onClick={() => copyMessage(msg)}
                      >
                        {copiedId === msg.id ? <FaCheck /> : <FaCopy />}
                      </button>
                      {mode === 'criteria' && (
                        <>
                          <button
                            type="button"
                            title="Append to Acceptance Criteria"
                            aria-label="Append to Acceptance Criteria"
                            onClick={() => onInsertCriteria(stripSummaryLine(msg.content), 'append')}
                          >
                            <FaPlus />
                          </button>
                          <button
                            type="button"
                            title="Replace Acceptance Criteria"
                            aria-label="Replace Acceptance Criteria"
                            onClick={() => onInsertCriteria(stripSummaryLine(msg.content), 'replace')}
                          >
                            <FaExchangeAlt />
                          </button>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="chat-msg chat-ai">
            <span className="chat-avatar" aria-hidden="true">
              <FaRobot />
            </span>
            <div className="chat-bubble chat-thinking">
              <FaSpinner className="groq-spin" aria-hidden="true" />
              <span>Thinking…</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={stop}>
                <FaStop /> Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attachment preview */}
      {image && (
        <div className="chat-attach-preview">
          <img src={image.dataUrl} alt={image.name} />
          <div className="chat-attach-meta">
            <span>{image.name}</span>
            <span className="mono">preview — sent with your next message</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            title="Remove image"
            aria-label="Remove image"
            onClick={() => setImage(null)}
            disabled={sending}
          >
            <FaTimes />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Replace image"
            aria-label="Replace image"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
          >
            <FaSyncAlt />
          </button>
        </div>
      )}

      {/* Vision gate hint */}
      {image && !visionOn && (
        <p className="chat-vision-warn">
          The selected model can’t see images. Switch to a vision-capable model to send this image.
        </p>
      )}

      {/* Composer */}
      <div className="chat-composer">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            attachFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="icon-btn chat-attach-btn"
          title={
            visionOn
              ? 'Attach image (or paste / drag & drop)'
              : 'Images require a vision-capable model'
          }
          aria-label="Attach image"
          onClick={() => visionOn && fileRef.current?.click()}
          disabled={sending || !visionOn}
        >
          <FaImage />
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            !aiReady
              ? 'AI is offline…'
              : mode === 'criteria'
                ? 'Ask about your criteria, or attach an image…'
                : 'Ask anything…'
          }
          rows={1}
          disabled={sending || !aiReady}
          aria-label="Chat message"
        />
        {sending ? (
          <button type="button" className="btn btn-ghost" onClick={stop} title="Stop generation (Esc)">
            <FaStop /> Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => send()}
            disabled={!canSend}
            title="Send (Enter)"
          >
            <FaPaperPlane /> Send
          </button>
        )}
      </div>
      <p className="chat-hints mono">
        Enter send · Shift+Enter newline · Esc stop · paste / drag &amp; drop images
        {visionOn ? '' : ' (images need the vision model)'}
      </p>

      {dragOver && (
        <div className="chat-drop-veil" aria-hidden="true">
          <FaImage />
          <span>Drop image to attach</span>
        </div>
      )}
    </section>
  );
}

export default ChatBox;
