import React, { useState } from 'react';
import './ExportButtons.css';
import { exportAsCSV, exportAsJSON, exportAsExcel } from '../services/api';
import { FaFileExport, FaFileCsv, FaFileCode, FaFileExcel } from 'react-icons/fa';

const ExportButtons = ({ testCases }) => {
  const [exporting, setExporting] = useState(null);

  const handleExport = async (type) => {
    if (!testCases || testCases.length === 0) {
      alert('No test cases to export!');
      return;
    }

    const testCaseIds = testCases.map((tc) => tc._id);

    try {
      setExporting(type);

      switch (type) {
        case 'csv':
          await exportAsCSV(testCaseIds);
          break;
        case 'json':
          await exportAsJSON(testCaseIds);
          break;
        case 'excel':
          await exportAsExcel(testCaseIds);
          break;
        default:
          break;
      }

      // Success message
      alert(`Successfully exported ${testCases.length} test cases as ${type.toUpperCase()}!`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export: ${error.message || 'Unknown error'}`);
    } finally {
      setExporting(null);
    }
  };

  if (!testCases || testCases.length === 0) {
    return null;
  }

  return (
    <div className="export-buttons-container">
      <div className="export-header">
        <FaFileExport className="export-icon" />
        <h3>Export Test Cases</h3>
        <span className="export-count">{testCases.length} available</span>
      </div>

      <div className="export-buttons">
        <button
          className="export-btn csv-btn"
          onClick={() => handleExport('csv')}
          disabled={exporting !== null}
        >
          <FaFileCsv />
          <span>Export as CSV</span>
          {exporting === 'csv' && <div className="btn-loader"></div>}
        </button>

        <button
          className="export-btn json-btn"
          onClick={() => handleExport('json')}
          disabled={exporting !== null}
        >
          <FaFileCode />
          <span>Export as JSON</span>
          {exporting === 'json' && <div className="btn-loader"></div>}
        </button>

        <button
          className="export-btn excel-btn"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FaFileExcel />
          <span>Export for Excel</span>
          {exporting === 'excel' && <div className="btn-loader"></div>}
        </button>
      </div>
    </div>
  );
};

export default ExportButtons;