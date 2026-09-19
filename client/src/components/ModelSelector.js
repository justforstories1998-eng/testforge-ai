import React from 'react';
import { FaRobot, FaImage } from 'react-icons/fa';
import './ModelSelector.css';

function shortLabel(id) {
  const last = String(id || '').split('/').pop();
  return last || id;
}

function ModelSelector({ models, value, onChange, disabled, compact = false }) {
  const list = Array.isArray(models) && models.length > 0 ? models : [];
  const current = list.find((m) => m.id === value);

  return (
    <label className={`model-select-wrap ${compact ? 'model-select-compact' : ''}`}>
      {!compact && (
        <span className="model-select-label">
          <FaRobot className="model-select-icon" /> AI Model
        </span>
      )}
      <span className="model-select-field">
        <select
          value={value}
          disabled={disabled || list.length === 0}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Select AI model"
        >
          {list.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label || shortLabel(m.id)}
              {m.vision ? ' · vision' : ''}
            </option>
          ))}
        </select>
        {current?.vision && (
          <span className="model-vision-badge" title="This model accepts image input">
            <FaImage /> vision
          </span>
        )}
      </span>
    </label>
  );
}

export default ModelSelector;
