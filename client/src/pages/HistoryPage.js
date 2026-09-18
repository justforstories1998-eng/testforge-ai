import React from 'react';
import TestCaseHistory from '../components/TestCaseHistory';

function HistoryPage({ testCases, onDelete, onClearAll, onExport }) {
  return (
    <TestCaseHistory
      testCases={testCases}
      onDelete={onDelete}
      onClearAll={onClearAll}
      onExport={onExport}
    />
  );
}

export default HistoryPage;
