import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import TestCaseForm from './components/TestCaseForm';
import TestCaseList from './components/TestCaseList';
import TestCaseHistory from './components/TestCaseHistory';
import Statistics from './components/Statistics';
import SplashScreen from './components/SplashScreen';
import Logo from './components/Logo';

// Determine API URL based on environment
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

function App() {
  const [currentPage, setCurrentPage] = useState('generate');
  const [testCases, setTestCases] = useState([]);
  const [allTestCases, setAllTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    byScenarioType: {},
    byPriority: {}
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Hide splash screen after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch data after splash screen
  useEffect(() => {
    if (!showSplash) {
      fetchAllTestCases();
      fetchStatistics();
    }
  }, [showSplash]);

  // Fetch all test cases from API
  const fetchAllTestCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/testcases`);
      setAllTestCases(response.data || []);
    } catch (err) {
      console.error('Error fetching test cases:', err);
      setAllTestCases([]);
    }
  };

  // Fetch statistics from API
  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/testcases/statistics`);
      console.log('📊 Statistics response:', response.data);
      
      setStats({
        total: response.data.total || 0,
        byScenarioType: response.data.byScenarioType || {},
        byPriority: response.data.byPriority || {}
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setStats({
        total: 0,
        byScenarioType: {},
        byPriority: {}
      });
    }
  };

  // Handle test case generation
  const handleGenerateTestCases = async (formData) => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setTestCases([]);
    
    try {
      console.log('Generating test cases with:', formData);
      
      // Check if comprehensive mode
      const isComprehensive = formData.scenarioType === 'All';
      
      const response = await axios.post(`${API_URL}/testcases/generate`, formData);
      
      console.log('📦 Response:', response.data);
      
      if (response.data && response.data.testCases && response.data.testCases.length > 0) {
        setTestCases(response.data.testCases);
        await fetchAllTestCases();
        await fetchStatistics();
        
        // Calculate scenarios correctly
        const scenarioCount = response.data.scenarios || 
          response.data.testCases.filter(tc => tc.workItemType === 'Test Case').length;
        const totalRows = response.data.count || response.data.testCases.length;
        
        // Build success message
        let modeText = '';
        if (isComprehensive) {
          modeText = ' covering Positive, Negative, Boundary & Edge cases';
        }
        
        setSuccessMessage(`✅ Successfully generated ${scenarioCount} test scenarios with ${totalRows} total rows!${modeText}`);
        
        return { success: true, message: response.data.message };
      } else {
        throw new Error('No test cases were generated. Please try again.');
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

  // Handle single test case deletion
  const handleDeleteTestCase = async (index) => {
    if (!window.confirm('Are you sure you want to delete this test case row?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/testcases/${index}`);
      
      // Update local state
      setTestCases(prev => prev.filter((_, i) => i !== index));
      
      // Refresh data
      await fetchAllTestCases();
      await fetchStatistics();
      
      setSuccessMessage('✅ Test case row deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting test case:', err);
      setError('Failed to delete test case');
    }
  };

  // Handle clear all test cases
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

  // Handle export functionality
  const handleExportTestCases = (format, casesToExport) => {
    try {
      const exportData = casesToExport && casesToExport.length > 0 ? casesToExport : testCases;
      
      if (!exportData || exportData.length === 0) {
        alert('No test cases to export');
        return;
      }

      switch (format) {
        case 'csv':
          exportAsCSV(exportData);
          break;
        case 'json':
          exportAsJSON(exportData);
          break;
        case 'markdown':
          exportAsMarkdown(exportData);
          break;
        default:
          console.error('Unknown export format:', format);
          return;
      }
      
      setSuccessMessage(`✅ Exported ${exportData.length} rows as ${format.toUpperCase()}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export test cases');
    }
  };

  // Export as CSV
  const exportAsCSV = (data) => {
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
    
    const rows = data.map(tc => [
      tc.id || '',
      tc.workItemType || '',
      tc.title || '',
      tc.testStep || '',
      tc.stepAction || '',
      tc.stepExpected || '',
      tc.areaPath || '',
      tc.assignedTo || '',
      tc.state || '',
      tc.scenarioType || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'text/csv', 'test-cases.csv');
  };

  // Export as JSON
  const exportAsJSON = (data) => {
    const exportObj = {
      exportDate: new Date().toISOString(),
      totalRows: data.length,
      testCases: data
    };
    const dataStr = JSON.stringify(exportObj, null, 2);
    downloadFile(dataStr, 'application/json', 'test-cases.json');
  };

  // Export as Markdown
  const exportAsMarkdown = (data) => {
    const headers = [
      'ID',
      'Work Item Type',
      'Title',
      'Test Step',
      'Step Action',
      'Step Expected',
      'Area Path',
      'Assigned To',
      'State'
    ];
    
    let markdown = '# Test Cases Export\n\n';
    markdown += `**Export Date:** ${new Date().toLocaleString()}\n\n`;
    markdown += `**Total Rows:** ${data.length}\n\n`;
    markdown += '---\n\n';
    markdown += '| ' + headers.join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    data.forEach(tc => {
      const row = [
        tc.id || '',
        tc.workItemType || '',
        (tc.title || '').replace(/\|/g, '\\|'),
        tc.testStep || '',
        (tc.stepAction || '').replace(/\|/g, '\\|'),
        (tc.stepExpected || '').replace(/\|/g, '\\|'),
        tc.areaPath || '',
        tc.assignedTo || '',
        tc.state || ''
      ];
      markdown += '| ' + row.join(' | ') + ' |\n';
    });

    downloadFile(markdown, 'text/markdown', 'test-cases.md');
  };

  // Download file helper
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

  // Show splash screen
  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="App">
      {/* Header */}
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

      {/* Main Content */}
      <main className="app-main">
        <div className="container">
          {/* Error Banner */}
          {error && (
            <div className="message-banner error-banner">
              <span>⚠️ {error}</span>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="message-banner success-banner">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage('')}>×</button>
            </div>
          )}

          {/* Generate Page */}
          {currentPage === 'generate' ? (
            <>
              {/* Test Case Form */}
              <TestCaseForm 
                onGenerate={handleGenerateTestCases} 
                loading={loading}
              />

              {/* Statistics */}
              {stats && <Statistics stats={stats} />}

              {/* Generated Test Cases */}
              {testCases.length > 0 && (
                <>
                  {/* Export Section */}
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

                  {/* Test Case List */}
                  <TestCaseList 
                    testCases={testCases}
                    onDelete={handleDeleteTestCase}
                    title="Current Generation Results"
                  />
                </>
              )}
            </>
          ) : (
            /* History Page */
            <TestCaseHistory 
              testCases={allTestCases}
              onDelete={handleDeleteTestCase}
              onClearAll={handleClearAll}
              onExport={handleExportTestCases}
            />
          )}
        </div>
      </main>

      {/* Footer */}
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