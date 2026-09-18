import React, { useMemo } from 'react';
import { FaTrashAlt, FaListAlt } from 'react-icons/fa';
import './TestCaseList.css';

// Group flat rows (header + steps) into scenarios for the mobile card view.
// Each entry keeps its flat-list index so per-row delete keeps working.
function groupRows(rows) {
  const groups = [];
  let current = null;
  (rows || []).forEach((row, index) => {
    if (row.workItemType === 'Test Case') {
      current = { header: row, headerIndex: index, steps: [] };
      groups.push(current);
    } else if (current) {
      current.steps.push({ row, index });
    } else {
      current = { header: null, headerIndex: -1, steps: [{ row, index }] };
      groups.push(current);
    }
  });
  return groups;
}

function TestCaseList({ testCases, onDelete, title }) {
  const groups = useMemo(() => groupRows(testCases), [testCases]);

  if (!testCases || testCases.length === 0) return null;

  return (
    <div className="list-container">
      <div className="list-header-area">
        <div className="list-title-group">
          <FaListAlt className="list-icon" />
          <h2>{title || 'Session Results'}</h2>
        </div>
        <span className="list-count-badge">{testCases.length} Rows</span>
      </div>

      <div className="table-responsive-wrapper">
        <table className="tc-data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Work Item Type</th>
              <th>Title</th>
              <th>Step</th>
              <th>Step Action</th>
              <th>Step Expected</th>
              <th>Area Path</th>
              <th>Assigned</th>
              <th>State</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((tc, index) => {
              const isHeader = tc.workItemType === 'Test Case';
              return (
                <tr key={index} className={isHeader ? 'row-header' : 'row-step'}>
                  <td className="col-id">{tc.id || ''}</td>
                  <td className="col-type">
                    {isHeader && <span className="type-tag">Test Case</span>}
                  </td>
                  <td className="col-title">
                    <div className="text-truncate-multiline">{tc.title || ''}</div>
                  </td>
                  <td className="col-step text-center">{tc.testStep || ''}</td>
                  <td className="col-action">
                    <div className="text-content">{tc.stepAction || ''}</div>
                  </td>
                  <td className="col-expected">
                    <div className="text-content">{tc.stepExpected || ''}</div>
                  </td>
                  <td className="col-area">{tc.areaPath || ''}</td>
                  <td className="col-assigned">{tc.assignedTo || ''}</td>
                  <td className="col-state">
                    {tc.state && (
                      <span className={`state-pill ${tc.state.toLowerCase()}`}>
                        {tc.state}
                      </span>
                    )}
                  </td>
                  <td className="col-delete text-center">
                    <button 
                      onClick={() => onDelete(index)} 
                      className="row-delete-btn"
                      title="Remove Row"
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="tc-cards">
        {groups.map((g, gi) => (
          <article className="tc-card" key={gi}>
            <div className="tc-card-head">
              <span className="type-tag">{g.header ? 'Test Case' : 'Steps'}</span>
              {g.header?.scenarioType && (
                <span className="pill">{g.header.scenarioType}</span>
              )}
              <span className="tc-card-spacer" />
              {g.headerIndex >= 0 && (
                <button
                  onClick={() => onDelete(g.headerIndex)}
                  className="row-delete-btn row-delete-sm"
                  title="Remove scenario header"
                  aria-label="Remove scenario header"
                >
                  <FaTrashAlt />
                </button>
              )}
            </div>

            {g.header?.title && <h3 className="tc-card-title">{g.header.title}</h3>}

            {g.header && (
              <p className="tc-card-meta">
                {[g.header.areaPath, g.header.assignedTo].filter(Boolean).join(' · ')}
                {g.header.state && (
                  <span className={`state-pill ${g.header.state.toLowerCase()}`}>
                    {g.header.state}
                  </span>
                )}
              </p>
            )}

            {g.steps.length > 0 ? (
              <ol className="tc-card-steps">
                {g.steps.map((s) => (
                  <li key={s.index} className="tc-card-step">
                    <div className="tc-card-step-top">
                      <span className="mono tc-step-n">
                        {s.row.testStep ? `Step ${s.row.testStep}` : 'Step'}
                      </span>
                      <button
                        onClick={() => onDelete(s.index)}
                        className="row-delete-btn row-delete-sm"
                        title="Remove step"
                        aria-label="Remove step"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                    {s.row.stepAction && (
                      <p className="tc-card-action">{s.row.stepAction}</p>
                    )}
                    {s.row.stepExpected && (
                      <p className="tc-card-expected">
                        <span>Expected · </span>
                        {s.row.stepExpected}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tc-card-empty">No steps in this scenario yet.</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export default TestCaseList;