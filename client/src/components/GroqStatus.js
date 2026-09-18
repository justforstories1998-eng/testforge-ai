import React from 'react';
import { FaSyncAlt, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import './GroqStatus.css';

function shortModelName(model) {
  if (!model) return 'Groq AI';
  const last = String(model).split('/').pop();
  return last || 'Groq AI';
}

function GroqStatus({ status, onRetry }) {
  const state = status?.state || 'checking';

  const config = {
    checking: {
      className: 'groq-checking',
      icon: <FaSpinner className="groq-spin" />,
      title: 'Checking AI connection…',
      detail: 'Pinging the Groq backend.',
    },
    waking: {
      className: 'groq-waking',
      icon: <FaSpinner className="groq-spin" />,
      title: 'Waking up the server…',
      detail: `Render sleeps when idle — attempt ${status?.attempts || 1} · ${Math.round((status?.elapsedMs || 0) / 1000)}s elapsed. This can take up to a minute, hang tight.`,
    },
    connected: {
      className: 'groq-connected',
      icon: <FaCheckCircle />,
      title: status?.rateLimited ? 'AI connected · rate-limited' : 'AI connected',
      detail: status?.rateLimited
        ? 'Quota exhausted — generation may be slower. Existing results and exports still work.'
        : `${shortModelName(status?.model)} responding${status?.latencyMs ? ` in ${status.latencyMs} ms` : ''}.`,
    },
    disconnected: {
      className: 'groq-disconnected',
      icon: <FaExclamationTriangle />,
      title: 'AI disconnected',
      detail: status?.message || 'The Groq backend is unreachable. Generation is disabled.',
    },
  }[state];

  return (
    <div className={`groq-status ${config.className}`} role="status">
      <span className="groq-dot" aria-hidden="true" />
      <div className="groq-text">
        <span className="groq-title">
          {config.icon} {config.title}
        </span>
        <span className="groq-detail">{config.detail}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          className="groq-retry"
          onClick={onRetry}
          disabled={state === 'checking' || state === 'waking'}
          title="Re-check the AI connection"
        >
          <FaSyncAlt className={state === 'checking' ? 'groq-spin' : ''} /> Retry
        </button>
      )}
    </div>
  );
}

export default GroqStatus;
