import React, { useState } from 'react';
import './TestCaseHistory.css';
import TestCaseList from './TestCaseList';

function TestCaseHistory({ testCases, onDelete, onClearAll, onExport }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Ensure testCases is an array
  const safeTestCases = testCases || [];

  const filteredTestCases = safeTestCases.filter(tc => {
    const matchesSearch = 
      (tc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tc.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tc.stepAction || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tc.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterType === 'all' ? true :
      filterType === 'header' ? tc.workItemType === 'Test Case' :
      filterType === 'detail' ? tc.workItemType === '' || !tc.workItemType :
      true;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="test-case-history">
      <div className="history-header">
        <div className="header-top">
          <div className="header-title">
            <h2>📚 Test Case History</h2>
            <p>View and manage all generated test cases</p>
          </div>
          <button className="clear-all-btn" onClick={onClearAll}>
            <span>🗑️</span> Clear All
          </button>
        </div>

        <div className="history-filters">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title, ID, action, or assigned person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                ×
              </button>
            )}
          </div>

          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({safeTestCases.length})
            </button>
            <button 
              className={`filter-btn ${filterType === 'header' ? 'active' : ''}`}
              onClick={() => setFilterType('header')}
            >
              Headers ({safeTestCases.filter(tc => tc.workItemType).length})
            </button>
            <button 
              className={`filter-btn ${filterType === 'detail' ? 'active' : ''}`}
              onClick={() => setFilterType('detail')}
            >
              Details ({safeTestCases.filter(tc => !tc.workItemType).length})
            </button>
          </div>
        </div>
      </div>

      {safeTestCases.length > 0 && (
        <div className="export-section-history">
          <h3>📥 Export All History</h3>
          <div className="export-buttons">
            <button 
              className="export-btn csv-btn"
              onClick={() => onExport('csv', safeTestCases)}
            >
              <span className="btn-icon">📄</span>
              <span className="btn-text">Export CSV</span>
            </button>
            <button 
              className="export-btn json-btn"
              onClick={() => onExport('json', safeTestCases)}
            >
              <span className="btn-icon">📋</span>
              <span className="btn-text">Export JSON</span>
            </button>
            <button 
              className="export-btn markdown-btn"
              onClick={() => onExport('markdown', safeTestCases)}
            >
              <span className="btn-icon">📝</span>
              <span className="btn-text">Export Markdown</span>
            </button>
          </div>
        </div>
      )}

      {filteredTestCases.length > 0 ? (
        <TestCaseList 
          testCases={filteredTestCases}
          onDelete={onDelete}
          title={`${filterType === 'all' ? 'All' : filterType === 'header' ? 'Header' : 'Detail'} Rows (${filteredTestCases.length})`}
        />
      ) : (
        <div className="no-results">
          <span className="no-results-icon">🔍</span>
          <h3>No Results Found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}

export default TestCaseHistory;