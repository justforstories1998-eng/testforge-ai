import React from 'react';
import { FaBrain } from 'react-icons/fa';
import './ReasoningSelector.css';

export const REASONING_LEVELS = [
  { id: 'off', label: 'Off', hint: 'Fastest — no extended thinking' },
  { id: 'low', label: 'Low', hint: 'Quick reasoning pass' },
  { id: 'medium', label: 'Medium', hint: 'Balanced depth (default)' },
  { id: 'high', label: 'High', hint: 'Deepest analysis, slower' },
];

function ReasoningSelector({ value, onChange, disabled, compact = false }) {
  if (compact) {
    return (
      <label className="reasoning-compact" title="Reasoning effort">
        <FaBrain aria-hidden="true" />
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Reasoning effort"
        >
          {REASONING_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="reasoning-wrap">
      <span className="reasoning-label">
        <FaBrain className="reasoning-icon" /> Reasoning
      </span>
      <div className="reasoning-segmented" role="radiogroup" aria-label="Reasoning effort">
        {REASONING_LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={value === l.id}
            className={value === l.id ? 'active' : ''}
            onClick={() => onChange(l.id)}
            disabled={disabled}
            title={l.hint}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ReasoningSelector;
