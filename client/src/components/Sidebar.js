import React from 'react';
import { FaHome, FaMagic, FaHistory, FaChartBar } from 'react-icons/fa';
import Logo from './Logo';
import './Sidebar.css';

const NAV = [
  { key: 'generate', label: 'Generate', icon: <FaMagic /> },
  { key: 'history', label: 'Repository', icon: <FaHistory />, badge: true },
  { key: 'statistics', label: 'Insights', icon: <FaChartBar /> },
];

function statusMeta(groq) {
  if (!groq || groq.state === 'checking') return { dot: 'is-checking', text: 'Checking AI…' };
  if (groq.state === 'waking')
    return { dot: 'is-waking', text: `Waking server… ${Math.round((groq.elapsedMs || 0) / 1000)}s` };
  if (groq.state === 'connected')
    return { dot: 'is-ok', text: groq.rateLimited ? 'AI · rate-limited' : 'AI connected' };
  return { dot: 'is-down', text: 'AI offline' };
}

function Sidebar({ currentPage, historyCount, groq, onNavigate, onNavDone }) {
  const go = (key) => () => {
    onNavigate(key);
    if (onNavDone) onNavDone();
  };
  const ai = statusMeta(groq);

  return (
    <aside className="sidebar" aria-label="Primary">
      <button className="side-brand" onClick={go('landing')} title="Back to home">
        <Logo size={34} />
        <span className="side-word">
          Test-Case<em>AI</em>
        </span>
      </button>

      <nav className="side-nav">
        <p className="side-label">Menu</p>
        <button
          className={`side-item ${currentPage === 'landing' ? 'active' : ''}`}
          onClick={go('landing')}
        >
          <span className="side-ico"><FaHome /></span>
          <span className="side-text">Home</span>
        </button>

        <p className="side-label">Workspace</p>
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`side-item ${currentPage === item.key ? 'active' : ''}`}
            onClick={go(item.key)}
            aria-current={currentPage === item.key ? 'page' : undefined}
          >
            <span className="side-ico">{item.icon}</span>
            <span className="side-text">{item.label}</span>
            {item.badge && historyCount > 0 && (
              <span className="side-badge">{historyCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <button className="side-ai" onClick={go('generate')} title="Open generator to retry the connection">
          <span className={`side-dot ${ai.dot}`} aria-hidden="true" />
          <span className="side-ai-text">{ai.text}</span>
        </button>
        <p className="side-ver mono">v2.0.0 · groq</p>
      </div>
    </aside>
  );
}

export default Sidebar;
