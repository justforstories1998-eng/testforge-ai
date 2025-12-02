import React, { useState } from 'react';
import './TestCaseResults.css';

const TestCaseResults = ({ testCases, onClear }) => {
  const [expandedCases, setExpandedCases] = useState({});

  // Group test cases by title (separate headers from steps)
  const groupedTestCases = [];
  let currentTestCase = null;

  testCases.forEach((row) => {
    if (row.workItemType === 'Test Case') {
      if (currentTestCase) {
        groupedTestCases.push(currentTestCase);
      }
      currentTestCase = {
        title: row.title,
        scenarioType: row.scenarioType,
        areaPath: row.areaPath,
        assignedTo: row.assignedTo,
        state: row.state,
        steps: []
      };
    } else if (currentTestCase && row.testStep) {
      currentTestCase.steps.push({
        stepNumber: row.testStep,
        action: row.stepAction,
        expected: row.stepExpected
      });
    }
  });

  if (currentTestCase) {
    groupedTestCases.push(currentTestCase);
  }

  const toggleExpand = (index) => {
    setExpandedCases(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    groupedTestCases.forEach((_, index) => {
      allExpanded[index] = true;
    });
    setExpandedCases(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCases({});
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'ID',
      'Work Item Type',
      'Title',
      'Test Step',
      'Step Action',
      'Step Expected',
      'Area Path',
      'Assigned To',
      'State',
      'Scenario Type'
    ];

    const csvRows = [headers.join(',')];

    testCases.forEach(row => {
      const values = [
        row.id || '',
        row.workItemType || '',
        `"${(row.title || '').replace(/"/g, '""')}"`,
        row.testStep || '',
        `"${(row.stepAction || '').replace(/"/g, '""')}"`,
        `"${(row.stepExpected || '').replace(/"/g, '""')}"`,
        row.areaPath || '',
        row.assignedTo || '',
        row.state || '',
        row.scenarioType || ''
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `test-cases-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScenarioTypeColor = (type) => {
    const colors = {
      'Positive': '#10b981',
      'Negative': '#ef4444',
      'Boundary': '#f59e0b',
      'Edge': '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="test-case-results">
      {/* Results Header */}
      <div className="results-header">
        <div className="results-title">
          <h2>
            <span className="title-icon">📋</span>
            Generated Test Cases
          </h2>
          <span className="results-count">{groupedTestCases.length} test cases</span>
        </div>

        <div className="results-actions">
          <button className="action-btn secondary" onClick={expandAll}>
            Expand All
          </button>
          <button className="action-btn secondary" onClick={collapseAll}>
            Collapse All
          </button>
          <button className="action-btn primary" onClick={exportToCSV}>
            <span>📥</span> Export CSV
          </button>
          <button className="action-btn danger" onClick={onClear}>
            <span>🗑️</span> Clear
          </button>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="test-cases-list">
        {groupedTestCases.map((tc, index) => (
          <div key={index} className="test-case-card">
            {/* Card Header */}
            <div 
              className="card-header"
              onClick={() => toggleExpand(index)}
            >
              <div className="card-header-left">
                <span 
                  className="scenario-badge"
                  style={{ backgroundColor: getScenarioTypeColor(tc.scenarioType) }}
                >
                  {tc.scenarioType}
                </span>
                <h3 className="card-title">{tc.title}</h3>
              </div>
              <div className="card-header-right">
                <span className="step-count">{tc.steps.length} steps</span>
                <span className={`expand-icon ${expandedCases[index] ? 'expanded' : ''}`}>
                  ▼
                </span>
              </div>
            </div>

            {/* Card Body (Expandable) */}
            {expandedCases[index] && (
              <div className="card-body">
                {/* Meta Info */}
                <div className="meta-info">
                  <span className="meta-item">
                    <strong>Area Path:</strong> {tc.areaPath}
                  </span>
                  <span className="meta-item">
                    <strong>Assigned To:</strong> {tc.assignedTo || 'Unassigned'}
                  </span>
                  <span className="meta-item">
                    <strong>State:</strong> {tc.state}
                  </span>
                </div>

                {/* Steps Table */}
                <table className="steps-table">
                  <thead>
                    <tr>
                      <th className="step-num-col">#</th>
                      <th className="action-col">Action</th>
                      <th className="expected-col">Expected Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tc.steps.map((step, stepIndex) => (
                      <tr key={stepIndex}>
                        <td className="step-num">{step.stepNumber}</td>
                        <td className="step-action">{step.action}</td>
                        <td className="step-expected">{step.expected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestCaseResults;