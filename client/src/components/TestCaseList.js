import React from 'react';
import './TestCaseList.css';

function TestCaseList({ testCases, onDelete, title }) {
  if (!testCases || testCases.length === 0) {
    return (
      <div className="no-test-cases">
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h3>No Test Cases Yet</h3>
          <p>Generate test cases to see them appear here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="test-case-list">
      <div className="list-header">
        <h2>{title || '📋 Test Cases'}</h2>
        <div className="header-actions">
          <span className="count-badge">{testCases.length} Rows</span>
        </div>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table className="test-case-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Work Item Type</th>
                <th>Title</th>
                <th>Test Step</th>
                <th>Step Action</th>
                <th>Step Expected</th>
                <th>Area Path</th>
                <th>Assigned To</th>
                <th>State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((tc, index) => (
                <tr 
                  key={`${index}-${tc.testStep || 'header'}`} 
                  className={tc.workItemType ? 'header-row' : 'detail-row'}
                >
                  <td className="id-cell">{tc.id || ''}</td>
                  <td className="type-cell">{tc.workItemType || ''}</td>
                  <td className="title-cell">{tc.title || ''}</td>
                  <td className="step-cell">{tc.testStep || ''}</td>
                  <td className="action-cell">{tc.stepAction || ''}</td>
                  <td className="expected-cell">{tc.stepExpected || ''}</td>
                  <td className="area-cell">{tc.areaPath || ''}</td>
                  <td className="assigned-cell">{tc.assignedTo || ''}</td>
                  <td className="state-cell">
                    {tc.state && (
                      <span className={`state-badge state-${(tc.state || '').toLowerCase()}`}>
                        {tc.state}
                      </span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button 
                      onClick={() => onDelete(index)} 
                      className="delete-btn"
                      title="Delete Row"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TestCaseList;