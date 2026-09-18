import React from 'react';
import {
  FaFileCsv,
  FaFileCode,
  FaMarkdown,
  FaFlask,
  FaDownload,
  FaListOl,
  FaLayerGroup,
  FaTags,
} from 'react-icons/fa';
import TestCaseForm from '../components/TestCaseForm';
import TestCaseList from '../components/TestCaseList';
import Statistics from '../components/Statistics';

function GeneratePage({
  testCases,
  stats,
  loading,
  groqStatus,
  onGenerate,
  onDelete,
  onExport,
  onRetryGroq,
}) {
  const scenarios = testCases.filter((tc) => tc.workItemType === 'Test Case').length;
  const types = new Set(testCases.map((tc) => tc.scenarioType).filter(Boolean)).size;

  return (
    <>
      <div className="gen-layout">
        <TestCaseForm
          onGenerate={onGenerate}
          loading={loading}
          groqStatus={groqStatus}
          onRetryGroq={onRetryGroq}
        />

        <aside className="gen-rail" aria-label="Guidance">
          <div className="card rail-card">
            <h3 className="section-title">How it works</h3>
            <ol className="rail-steps">
              <li>
                <span className="rail-step-n">1</span>
                <div>
                  <strong>Describe the criteria</strong>
                  <p>Paste acceptance criteria or a user story. Detail maps to depth.</p>
                </div>
              </li>
              <li>
                <span className="rail-step-n">2</span>
                <div>
                  <strong>AI builds scenarios</strong>
                  <p>Positive, negative, boundary and edge cases with steps.</p>
                </div>
              </li>
              <li>
                <span className="rail-step-n">3</span>
                <div>
                  <strong>Export and run</strong>
                  <p>Take CSV, JSON, Markdown — or a runnable Playwright spec.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="card rail-card">
            <h3 className="section-title">This session</h3>
            <div className="rail-stats">
              <div className="rail-stat">
                <FaLayerGroup />
                <div>
                  <span className="mono rail-stat-v">{scenarios}</span>
                  <span className="rail-stat-l">Scenarios</span>
                </div>
              </div>
              <div className="rail-stat">
                <FaListOl />
                <div>
                  <span className="mono rail-stat-v">{testCases.length}</span>
                  <span className="rail-stat-l">Rows</span>
                </div>
              </div>
              <div className="rail-stat">
                <FaTags />
                <div>
                  <span className="mono rail-stat-v">{types}</span>
                  <span className="rail-stat-l">Types</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {testCases.length > 0 && (
        <div className="card export-bar">
          <div className="export-bar-left">
            <FaDownload className="export-bar-icon" />
            <div>
              <h3>Export results</h3>
              <p>{scenarios} scenarios · {testCases.length} rows</p>
            </div>
          </div>
          <div className="export-bar-actions">
            <button className="btn btn-ghost" onClick={() => onExport('csv', testCases)}>
              <FaFileCsv /> CSV
            </button>
            <button className="btn btn-ghost" onClick={() => onExport('json', testCases)}>
              <FaFileCode /> JSON
            </button>
            <button className="btn btn-ghost" onClick={() => onExport('markdown', testCases)}>
              <FaMarkdown /> Markdown
            </button>
            <button className="btn btn-primary" onClick={() => onExport('playwright', testCases)}>
              <FaFlask /> Playwright .spec.ts
            </button>
          </div>
        </div>
      )}

      {testCases.length > 0 && (
        <TestCaseList
          testCases={testCases}
          onDelete={onDelete}
          title="Session Results"
        />
      )}

      {stats.total > 0 && <Statistics stats={stats} />}
    </>
  );
}

export default GeneratePage;
