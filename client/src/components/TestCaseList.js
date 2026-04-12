import React from 'react';
import { FaTrashAlt, FaListAlt } from 'react-icons/fa';
import './TestCaseList.css';

function TestCaseList({ testCases, onDelete, title }) {
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
    </div>
  );
}

export default TestCaseList;