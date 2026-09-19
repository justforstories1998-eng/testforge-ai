import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaCopy, FaDownload, FaRedo, FaCheck, FaFlask } from 'react-icons/fa';
import { generatePlaywrightSpec, groupScenarios, toSpecFileName } from '../utils/playwrightExporter';
import './PlaywrightExportModal.css';

function PlaywrightExportModal({ testCases, initialFileName, initialCode, aiBadge, onClose, onDownloaded }) {
  const scenarios = useMemo(() => groupScenarios(testCases), [testCases]);
  const totalSteps = useMemo(
    () => scenarios.reduce((n, s) => n + s.steps.length, 0),
    [scenarios]
  );

  const [baseURL, setBaseURL] = useState('/');
  const [describeTitle, setDescribeTitle] = useState('Test-CaseAI — Generated Suite');
  const [fileName, setFileName] = useState(
    initialFileName || toSpecFileName(scenarios[0]?.title)
  );
  const [code, setCode] = useState(initialCode || '');
  const [copied, setCopied] = useState(false);

  const regenerate = (nextBase = baseURL, nextDescribe = describeTitle) => {
    setCode(
      generatePlaywrightSpec(testCases, { baseURL: nextBase, describeTitle: nextDescribe })
    );
  };

  // AI-provided code wins on open; otherwise generate from rows.
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    } else {
      regenerate('/', 'Test-CaseAI — Generated Suite');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCases, initialCode]);

  const ensureSpecExtension = (name) => {
    const clean = (name || '').trim() || 'test-caseai-generated.spec.ts';
    return clean.endsWith('.spec.ts') ? clean : `${clean.replace(/\.ts$/, '')}.spec.ts`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable (non-secure context) — fall back to select.
      const el = document.getElementById('pw-spec-editor');
      if (el) {
        el.focus();
        el.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ensureSpecExtension(fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onDownloaded) onDownloaded(scenarios.length, totalSteps);
  };

  return (
    <div className="pw-modal-backdrop" onClick={onClose}>
      <div className="pw-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pw-modal-header">
          <div className="pw-modal-title">
            <span className="pw-modal-icon">
              <FaFlask />
            </span>
            <div>
              <h3>Export as Playwright spec.ts</h3>
              <p>
                {aiBadge || (
                  <>
                    {scenarios.length} scenario{scenarios.length === 1 ? '' : 's'} · {totalSteps} step
                    {totalSteps === 1 ? '' : 's'} · edit the code below, then download
                  </>
                )}
              </p>
            </div>
          </div>
          <button className="pw-modal-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="pw-modal-controls">
          <label className="pw-field">
            <span>Base URL / start page</span>
            <input
              type="text"
              value={baseURL}
              placeholder="/ or https://your-app.com/login"
              onChange={(e) => setBaseURL(e.target.value)}
            />
          </label>
          <label className="pw-field">
            <span>Suite name (describe block)</span>
            <input
              type="text"
              value={describeTitle}
              onChange={(e) => setDescribeTitle(e.target.value)}
            />
          </label>
          <label className="pw-field">
            <span>File name</span>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </label>
          <button
            className="pw-btn pw-btn-secondary"
            onClick={() => regenerate(baseURL, describeTitle)}
            title="Regenerate code from the current test cases and settings"
          >
            <FaRedo /> Regenerate
          </button>
        </div>

        <textarea
          id="pw-spec-editor"
          className="pw-spec-editor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck="false"
          aria-label="Editable Playwright spec file"
        />

        <div className="pw-modal-hint">
          Ready to run: helpers try label → placeholder → role locators, and every line explains itself
          in a <code>WHY</code> comment. Only touch lines marked <code>ADJUST</code>, then run{' '}
          <code>npx playwright test {ensureSpecExtension(fileName)}</code>.
        </div>

        <div className="pw-modal-footer">
          <span className="pw-line-count">{code.split('\n').length} lines · TypeScript</span>
          <div className="pw-footer-actions">
            <button className="pw-btn pw-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="pw-btn pw-btn-secondary" onClick={handleCopy}>
              {copied ? <FaCheck /> : <FaCopy />} {copied ? 'Copied!' : 'Copy code'}
            </button>
            <button className="pw-btn pw-btn-primary" onClick={handleDownload}>
              <FaDownload /> Download .spec.ts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaywrightExportModal;
