import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import TestCaseForm from './components/TestCaseForm';
import TestCaseList from './components/TestCaseList';
import TestCaseHistory from './components/TestCaseHistory';
import Statistics from './components/Statistics';
import SplashScreen from './components/SplashScreen';
import Logo from './components/Logo';

const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Use relative path in production
  : 'http://localhost:5000/api';  // Use localhost in development;

function App() {
  const [currentPage, setCurrentPage] = useState('generate');
  const [testCases, setTestCases] = useState([]);
  const [allTestCases, setAllTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [stats, setStats] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showSplash) {
      fetchAllTestCases();
      fetchStatistics();
    }
  }, [showSplash]);

  const fetchAllTestCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/testcases`);
      setAllTestCases(response.data);
    } catch (err) {
      console.error('Error fetching test cases:', err);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/testcases/statistics`);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const handleGenerateTestCases = async (formData) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setTestCases([]);
    
    try {
      console.log('Generating test cases with:', formData);
      
      const response = await axios.post(`${API_URL}/testcases/generate`, formData);
      
      if (response.data && response.data.testCases) {
        setTestCases(response.data.testCases);
        await fetchAllTestCases();
        await fetchStatistics();
        
        const scenarioCount = Math.floor(response.data.testCases.length / (parseInt(formData.numberOfSteps) + 1));
        setSuccessMessage(`✅ Successfully generated ${scenarioCount} test scenarios with ${response.data.testCases.length} total rows!`);
        
        return { success: true, message: response.data.message };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error generating test cases:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate test cases';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTestCase = async (index) => {
    if (!window.confirm('Are you sure you want to delete this test case row?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/testcases/${index}`);
      
      setTestCases(prev => prev.filter((_, i) => i !== index));
      
      await fetchAllTestCases();
      await fetchStatistics();
      
      setSuccessMessage('✅ Test case row deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting test case:', err);
      setError('Failed to delete test case');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL test cases? This cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/testcases`);
      setTestCases([]);
      setAllTestCases([]);
      await fetchStatistics();
      setSuccessMessage('✅ All test cases cleared successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error clearing test cases:', err);
      setError('Failed to clear test cases');
    }
  };

  const handleExportTestCases = (format, casesToExport) => {
    try {
      const exportData = casesToExport && casesToExport.length > 0 ? casesToExport : testCases;
      
      if (!exportData || exportData.length === 0) {
        alert('No test cases to export');
        return;
      }

      if (format === 'csv') {
        exportAsCSV(exportData);
      } else if (format === 'json') {
        exportAsJSON(exportData);
      } else if (format === 'markdown') {
        exportAsMarkdown(exportData);
      }
      
      setSuccessMessage(`✅ Exported ${exportData.length} rows as ${format.toUpperCase()}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export test cases');
    }
  };

  const exportAsCSV = (data) => {
    const headers = ['ID', 'Work Item Type', 'Title', 'Test Step', 'Step Action', 'Step Expected', 'Area Path', 'Assigned To', 'State'];
    
    const rows = data.map(tc => [
      tc.id || '',
      tc.workItemType || '',
      tc.title || '',
      tc.testStep || '',
      tc.stepAction || '',
      tc.stepExpected || '',
      tc.areaPath || '',
      tc.assignedTo || '',
      tc.state || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'text/csv', 'test-cases.csv');
  };

  const exportAsJSON = (data) => {
    const dataStr = JSON.stringify(data, null, 2);
    downloadFile(dataStr, 'application/json', 'test-cases.json');
  };

  const exportAsMarkdown = (data) => {
    const headers = ['ID', 'Work Item Type', 'Title', 'Test Step', 'Step Action', 'Step Expected', 'Area Path', 'Assigned To', 'State'];
    
    let markdown = '| ' + headers.join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    data.forEach(tc => {
      markdown += `| ${tc.id || ''} | ${tc.workItemType || ''} | ${tc.title || ''} | ${tc.testStep || ''} | ${tc.stepAction || ''} | ${tc.stepExpected || ''} | ${tc.areaPath || ''} | ${tc.assignedTo || ''} | ${tc.state || ''} |\n`;
    });

    downloadFile(markdown, 'text/markdown', 'test-cases.md');
  };

  const downloadFile = (content, mimeType, filename) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <Logo size="small" />
          </div>
          <nav className="header-nav">
            <button 
              className={`nav-btn ${currentPage === 'generate' ? 'active' : ''}`}
              onClick={() => setCurrentPage('generate')}
            >
              <span>✨</span> Generate
            </button>
            <button 
              className={`nav-btn ${currentPage === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentPage('history')}
            >
              <span>📚</span> History ({allTestCases.length})
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {error && (
            <div className="message-banner error-banner">
              <span>⚠️ {error}</span>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {successMessage && (
            <div className="message-banner success-banner">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage('')}>×</button>
            </div>
          )}

          {currentPage === 'generate' ? (
            <>
              <TestCaseForm 
                onGenerate={handleGenerateTestCases} 
                loading={loading}
              />

              {stats && <Statistics stats={stats} />}

              {testCases.length > 0 && (
                <>
                  <div className="export-section">
                    <div className="export-header">
                      <h3>📥 Export Current Results</h3>
                      <p>Export {testCases.length} rows from current generation</p>
                    </div>
                    <div className="export-buttons">
                      <button 
                        className="export-btn csv-btn"
                        onClick={() => handleExportTestCases('csv', testCases)}
                      >
                        <span className="btn-icon">📄</span>
                        <span className="btn-text">Export CSV</span>
                      </button>
                      <button 
                        className="export-btn json-btn"
                        onClick={() => handleExportTestCases('json', testCases)}
                      >
                        <span className="btn-icon">📋</span>
                        <span className="btn-text">Export JSON</span>
                      </button>
                      <button 
                        className="export-btn markdown-btn"
                        onClick={() => handleExportTestCases('markdown', testCases)}
                      >
                        <span className="btn-icon">📝</span>
                        <span className="btn-text">Export Markdown</span>
                      </button>
                    </div>
                  </div>

                  <TestCaseList 
                    testCases={testCases}
                    onDelete={handleDeleteTestCase}
                    title="Current Generation Results"
                  />
                </>
              )}
            </>
          ) : (
            <TestCaseHistory 
              testCases={allTestCases}
              onDelete={handleDeleteTestCase}
              onClearAll={handleClearAll}
              onExport={handleExportTestCases}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2024 TestForge AI</p>
          <p>Powered by <strong>Groq AI</strong> | Built for <strong>Azure DevOps</strong></p>
        </div>
      </footer>
    </div>
  );
}

export default App;