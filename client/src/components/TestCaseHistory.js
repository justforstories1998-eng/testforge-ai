import React, { useState } from 'react';
import { 
  FaHistory, 
  FaTrashAlt, 
  FaSearch, 
  FaFileCsv, 
  FaFileCode, 
  FaMarkdown, 
  FaFileExport,
  FaInbox
} from 'react-icons/fa';
import './TestCaseHistory.css';
import TestCaseList from './TestCaseList';

function TestCaseHistory({ testCases, onDelete, onClearAll, onExport }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTestCases = (testCases || []).filter(tc => {
    const searchStr = searchTerm.toLowerCase();
    return (
      (tc.title || '').toLowerCase().includes(searchStr) ||
      (tc.id || '').toLowerCase().includes(searchStr) ||
      (tc.assignedTo || '').toLowerCase().includes(searchStr) ||
      (tc.areaPath || '').toLowerCase().includes(searchStr)
    );
  });

  return (
    <div className="repo-container">
      {/* Header Section */}
      <div className="repo-header">
        <div className="repo-header-left">
          <div className="repo-icon-bg">
            <FaHistory />
          </div>
          <div className="repo-header-text">
            <h2>Test Case Repository</h2>
            <p>Review and manage historical test generations</p>
          </div>
        </div>
        <button className="repo-clear-btn" onClick={onClearAll}>
          <FaTrashAlt /> Clear All
        </button>
      </div>

      {/* Export Section - Redesigned to look like a premium card */}
      {testCases.length > 0 && (
        <div className="repo-export-card">
          <div className="repo-export-header">
            <FaFileExport className="repo-export-icon" />
            <h3>Export Repository Data</h3>
          </div>
          
          <div className="repo-export-actions">
            <button className="repo-btn-secondary" onClick={() => onExport('csv', testCases)}>
              <FaFileCsv className="icon-csv" /> Export CSV
            </button>
            <button className="repo-btn-secondary" onClick={() => onExport('json', testCases)}>
              <FaFileCode className="icon-json" /> Export JSON
            </button>
            <button className="repo-btn-secondary" onClick={() => onExport('markdown', testCases)}>
              <FaMarkdown className="icon-md" /> Export Markdown
            </button>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="repo-search-area">
        <div className="repo-search-input-wrapper">
          <FaSearch className="repo-search-icon" />
          <input 
            type="text" 
            placeholder="Search by ID, title, area, or owner..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List Section */}
      <div className="repo-list-wrapper">
        {filteredTestCases.length > 0 ? (
          <TestCaseList 
            testCases={filteredTestCases} 
            onDelete={onDelete} 
            title={`Displaying ${filteredTestCases.length} Results`}
          />
        ) : (
          <div className="repo-empty-state">
            <FaInbox />
            <p>{searchTerm ? "No records found matching your query." : "The repository is currently empty."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestCaseHistory;