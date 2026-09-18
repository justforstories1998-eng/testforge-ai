import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaDownload, 
  FaFileCsv, 
  FaFileCode, 
  FaMarkdown, 
  FaTimes,
  FaFlask,
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
import LoadingOverlay from './components/LoadingOverlay';
import PlaywrightExportModal from './components/PlaywrightExportModal';
import LandingPage from './components/LandingPage';
import { getGroqStatus } from './services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// URL <-> view mapping. Browser back/forward works because every
// view change pushes a real history entry.
const PATH_FOR_PAGE = {
  landing: '/',
  generate: '/generate',
  history: '/repository',
  statistics: '/insights',
};
const PAGE_FOR_PATH = {
  '/': 'landing',
  '/generate': 'generate',
  '/repository': 'history',
  '/insights': 'statistics',
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<Shell />} />
      </Routes>
    </BrowserRouter>
  );
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = PAGE_FOR_PATH[location.pathname] || null;
  const setPage = useCallback(
    (p) => navigate(PATH_FOR_PAGE[p] || '/'),
    [navigate]
  );
  const [testCases, setTestCases] = useState([]);
  const [allTestCases, setAllTestCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, byScenarioType: {}, byPriority: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwExportData, setPwExportData] = useState([]);
  const [groq, setGroq] = useState({ state: 'checking' });

  // Fetch all data from backend
const fetchAll = useCallback(async () => {
  try {
    const [casesRes, statsRes] = await Promise.all([
      axios.get(`${API_URL}/testcases`),
      axios.get(`${API_URL}/testcases/statistics`),
    ]);

    // Ensure we are setting an array. If casesRes.data is not an array, set empty [].
    const data = Array.isArray(casesRes.data) ? casesRes.data : [];
    setAllTestCases(data);
    
    setStats({
      total: statsRes.data.total || 0,
      byScenarioType: statsRes.data.byScenarioType || {},
      byPriority: statsRes.data.byPriority || {},
    });
  } catch (err) {
    console.error('Fetch error:', err);
    setAllTestCases([]); // Set to empty array on error
  }
}, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Groq AI connection check — gates test-case generation.
  const checkGroq = useCallback(async (fresh = false) => {
    setGroq(prev => ({ ...prev, state: 'checking' }));
    const status = await getGroqStatus(fresh);
    setGroq({
      state: status?.connected ? 'connected' : 'disconnected',
      model: status?.model || null,
      message: status?.message || '',
      rateLimited: !!status?.rateLimited,
      latencyMs: status?.latencyMs ?? null,
      checkedAt: status?.checkedAt || null,
    });
    return status;
  }, []);

  useEffect(() => {
    checkGroq(false);
    const t = setInterval(() => checkGroq(false), 60000);
    return () => clearInterval(t);
  }, [checkGroq]);

  // Start each view at the top (route changes preserve scroll otherwise).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Auto-clear success messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Handle test case generation (allowed only when Groq AI is connected)
  const handleGenerate = async (formData) => {
    // Re-check live before spending a generation call, unless we already
    // know we're connected.
    if (groq.state !== 'connected') {
      const status = await checkGroq(true);
      if (!status?.connected) {
        const msg = status?.message || 'Groq AI is not connected. Generation is disabled until the connection is restored.';
        setError(msg);
        return { success: false, message: msg };
      }
    }

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
      if (err.response?.data?.isConnectionError) checkGroq(true);
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

    // Playwright opens the editable preview modal instead of downloading directly
    if (format === 'playwright') {
      setPwExportData(exportData);
      setShowPwModal(true);
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
      
      const csvContent = [headers.join(','), ...rows].join('\n');
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

  // Unknown URL — bounce home instead of rendering a blank view.
  if (!page) return <Navigate to="/" replace />;

  // Cinematic landing — nav + hero only, no extra chrome.
  if (page === 'landing') {
    return (
      <div className="App">
        <LandingPage onNavigate={setPage} />
      </div>
    );
  }

  return (
    <div className="App">
      {loading && <LoadingOverlay />}

      <Header
        currentPage={page}
        onPageChange={setPage}
        historyCount={allTestCases.length}
        onBrandClick={() => setPage('landing')}
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
                groqStatus={groq}
                onRetryGroq={() => checkGroq(true)}
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
                    <button className="export-action-btn playwright" onClick={() => handleExport('playwright', testCases)}>
                      <FaFlask /> Export Playwright .spec.ts
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
            <span className="brand-name">Test-Case<span className="crimson">AI</span></span>
            <span className="footer-divider">|</span>
            <span className="engine-info">
              <FaMicrochip className="footer-icon" /> Powered by <strong>Groq AI</strong>
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

      {showPwModal && (
        <PlaywrightExportModal
          testCases={pwExportData}
          onClose={() => setShowPwModal(false)}
          onDownloaded={(scenarios, steps) =>
            setSuccess(`Exported ${scenarios} scenario(s) / ${steps} step(s) as Playwright spec.ts`)
          }
        />
      )}
    </div>
  );
}

export default App;