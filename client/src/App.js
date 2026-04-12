import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaDownload, 
  FaFileCsv, 
  FaFileCode, 
  FaMarkdown, 
  FaTimes,
  FaMicrochip, // Changed from FaCpu to FaMicrochip
  FaTerminal,
  FaGithub
} from 'react-icons/fa';
import './App.css';

// Components
import Header from './components/Header';
import TestCaseForm from './components/TestCaseForm';
import TestCaseList from './components/TestCaseList';
import TestCaseHistory from './components/TestCaseHistory';
import Statistics from './components/Statistics';
import SplashScreen from './components/SplashScreen';
import LoadingOverlay from './components/LoadingOverlay';

const API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

function App() {
  const [page, setPage] = useState('generate');
  const [testCases, setTestCases] = useState([]);
  const [allTestCases, setAllTestCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, byScenarioType: {}, byPriority: {} });
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Splash screen timer
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(t);
  }, []);

  // Fetch all data from backend
  const fetchAll = useCallback(async () => {
    try {
      const [casesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/testcases`),
        axios.get(`${API_URL}/testcases/statistics`),
      ]);
      setAllTestCases(casesRes.data || []);
      setStats({
        total: statsRes.data.total || 0,
        byScenarioType: statsRes.data.byScenarioType || {},
        byPriority: statsRes.data.byPriority || {},
      });
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  useEffect(() => {
    if (!showSplash) fetchAll();
  }, [showSplash, fetchAll]);

  // Auto-clear success messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Handle test case generation
  const handleGenerate = async (formData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    setTestCases([]);

    try {
      const res = await axios.post(`${API_URL}/testcases/generate`, formData);
      if (res.data?.testCases?.length > 0) {
        setTestCases(res.data.testCases);
        await fetchAll();
        const scenarios = res.data.scenarios || 0;
        const total = res.data.count || 0;
        const modeTag = res.data.mode === 'comprehensive'
          ? ' (Comprehensive Mode)'
          : '';
        setSuccess(`Successfully generated ${scenarios} test scenarios totalling ${total} rows${modeTag}`);
        return { success: true };
      } else {
        throw new Error('No test cases were generated. Please refine your criteria.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Generation process failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // Delete a specific row
  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this specific row?')) return;
    try {
      await axios.delete(`${API_URL}/testcases/${index}`);
      setTestCases(prev => prev.filter((_, i) => i !== index));
      await fetchAll();
      setSuccess('Record successfully removed');
    } catch (err) {
      setError('Unable to delete the requested record');
    }
  };

  // Clear entire history
  const handleClearAll = async () => {
    if (!window.confirm('This will permanently delete ALL test cases. Continue?')) return;
    try {
      await axios.delete(`${API_URL}/testcases`);
      setTestCases([]);
      setAllTestCases([]);
      await fetchAll();
      setSuccess('All test history has been cleared');
    } catch (err) {
      setError('Failed to clear history');
    }
  };

  // Export Logic
  const handleExport = (format, data) => {
    const exportData = data?.length ? data : testCases;
    if (!exportData?.length) { 
        alert('There is no data available for export'); 
        return; 
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const headers = ['ID','Work Item Type','Title','Test Step','Step Action','Step Expected','Area Path','Assigned To','State','Scenario Type'];
      const rows = exportData.map(tc =>
        [tc.id||'', tc.workItemType||'', tc.title||'', tc.testStep||'',
         tc.stepAction||'', tc.stepExpected||'', tc.areaPath||'',
         tc.assignedTo||'', tc.state||'', tc.scenarioType||'']
          .map(v => `"${String(v).replace(/"/g,'""')}"`)
          .join(',')
      );
      
      const csvContent = [headers.join(','), ...rows].join('');
      download(csvContent, 'text/csv', `test-cases-${timestamp}.csv`);

    } else if (format === 'json') {
      const jsonContent = JSON.stringify({ 
        exportDate: new Date().toISOString(), 
        total: exportData.length, 
        testCases: exportData 
      }, null, 2);
      download(jsonContent, 'application/json', `test-cases-${timestamp}.json`);

    } else if (format === 'markdown') {
      const headers = ['ID','Type','Title','Step','Action','Expected','Area','Assigned'];
      let md = `# Test Case Export — ${timestamp}

**Total Rows:** ${exportData.length}

`;
      md += `| ${headers.join(' | ')} |
| ${headers.map(()=>'---').join(' | ')} |
`;
      
      exportData.forEach(tc => {
        md += `| ${[
            tc.id||'', 
            tc.workItemType||'', 
            (tc.title||'').replace(/\|/g,'\\|'),
            tc.testStep||'', 
            (tc.stepAction||'').replace(/\|/g,'\\|'),
            (tc.stepExpected||'').replace(/\|/g,'\\|'), 
            tc.areaPath||'', 
            tc.assignedTo||''
        ].join(' | ')} |
`;
      });
      download(md, 'text/markdown', `test-cases-${timestamp}.md`);
    }

    setSuccess(`Exported ${exportData.length} records as ${format.toUpperCase()}`);
  };

  const download = (content, mime, filename) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (showSplash) return <SplashScreen />;

  return (
    <div className="App">
      {loading && <LoadingOverlay />}

      <Header
        currentPage={page}
        onPageChange={setPage}
        historyCount={allTestCases.length}
      />

      <main className="app-main">
        <div className="container">

          {/* Professional Status Banners */}
          {error && (
            <div className="message-banner error-banner">
              <FaExclamationTriangle className="banner-icon" />
              <span className="banner-text">{error}</span>
              <button className="banner-close" onClick={() => setError('')}>
                <FaTimes />
              </button>
            </div>
          )}
          {success && (
            <div className="message-banner success-banner">
              <FaCheckCircle className="banner-icon" />
              <span className="banner-text">{success}</span>
              <button className="banner-close" onClick={() => setSuccess('')}>
                <FaTimes />
              </button>
            </div>
          )}

          {/* Generate View */}
          {page === 'generate' && (
            <>
              <TestCaseForm
                onGenerate={handleGenerate}
                loading={loading}
              />

              {testCases.length > 0 && (
                <div className="export-section">
                  <div className="export-section-header">
                    <div className="export-section-title">
                      <FaDownload className="export-title-icon" />
                      <h3>Export Generated Results</h3>
                    </div>
                    <span className="export-section-badge">{testCases.length} Rows</span>
                  </div>
                  <div className="export-buttons-grid">
                    <button className="export-action-btn csv" onClick={() => handleExport('csv', testCases)}>
                      <FaFileCsv /> Export CSV
                    </button>
                    <button className="export-action-btn json" onClick={() => handleExport('json', testCases)}>
                      <FaFileCode /> Export JSON
                    </button>
                    <button className="export-action-btn markdown" onClick={() => handleExport('markdown', testCases)}>
                      <FaMarkdown /> Export Markdown
                    </button>
                  </div>
                </div>
              )}

              {testCases.length > 0 && (
                <TestCaseList
                  testCases={testCases}
                  onDelete={handleDelete}
                  title="Session Results"
                />
              )}

              {stats.total > 0 && <Statistics stats={stats} />}
            </>
          )}

          {/* History View */}
          {page === 'history' && (
            <TestCaseHistory
              testCases={allTestCases}
              onDelete={handleDelete}
              onClearAll={handleClearAll}
              onExport={handleExport}
            />
          )}

          {/* Insights View */}
          {page === 'statistics' && (
            <Statistics stats={stats} fullPage />
          )}

        </div>
      </main>

      <footer className="app-footer">
        <div className="container footer-content">
          <div className="footer-brand">
            <span className="copyright">© 2026</span>
            <span className="brand-name">TestForge <span className="crimson">AI</span></span>
            <span className="footer-divider">|</span>
            <span className="engine-info">
              <FaMicrochip className="footer-icon" /> Powered by <strong>Groq (Llama-3.3-70b)</strong>
            </span>
          </div>
          <div className="footer-links">
            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="footer-link">
              <FaTerminal className="link-icon" /> Groq Console
            </a>
            <a href="https://github.com/justforstories1998-eng/testforge-ai" target="_blank" rel="noopener noreferrer" className="footer-link">
              <FaGithub className="link-icon" /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;