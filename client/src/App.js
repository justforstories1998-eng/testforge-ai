import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaMicrochip,
  FaGithub
} from 'react-icons/fa';
import './App.css';

// Shell
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import GroqStatus from './components/GroqStatus';

// Pages
import GeneratePage from './pages/GeneratePage';
import HistoryPage from './pages/HistoryPage';
import InsightsPage from './pages/InsightsPage';

// Overlays
import LoadingOverlay from './components/LoadingOverlay';
import PlaywrightExportModal from './components/PlaywrightExportModal';
import LandingPage from './components/LandingPage';
import { getGroqStatus, wakeBackend, getModels, DEFAULT_MODEL, SUPPORTED_MODELS_FALLBACK } from './services/api';

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

const TOPBAR_META = {
  generate: {
    title: 'Generate test cases',
    sub: 'Turn acceptance criteria into full test suites',
  },
  history: {
    title: 'Repository',
    sub: 'Every generation, searchable in one place',
  },
  statistics: {
    title: 'Insights',
    sub: 'Distribution across your test library',
  },
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
  const [navOpen, setNavOpen] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState(SUPPORTED_MODELS_FALLBACK);
  const [reasoning, setReasoning] = useState('medium');
  const [chatExport, setChatExport] = useState(null);
  // Ref mirror so stable callbacks always read the selected model.
  const modelRef = useRef(DEFAULT_MODEL);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

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
  // Accepts a model override so the pill always reflects the SELECTED model.
  const checkGroq = useCallback(async (fresh = false, modelOverride) => {
    const activeModel = modelOverride || modelRef.current;
    setGroq(prev => ({ ...prev, state: 'checking' }));
    const status = await getGroqStatus(fresh, activeModel);
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

  // Retry with host wake-up: free-tier backends (Render) sleep when idle
  // and need up to ~a minute to boot. Wake first, then run the fresh check.
  const retryGroqConnection = useCallback(async () => {
    setGroq({ state: 'waking', attempts: 0, elapsedMs: 0 });
    const wake = await wakeBackend({
      onTick: ({ attempt, elapsedMs }) =>
        setGroq({ state: 'waking', attempts: attempt, elapsedMs }),
    });
    if (!wake.ok) {
      const message = `Backend did not respond within ${Math.round(wake.elapsedMs / 1000)}s. It may still be starting — wait a moment and retry.`;
      setGroq({
        state: 'disconnected',
        model: null,
        message,
        rateLimited: false,
        latencyMs: null,
        checkedAt: null,
      });
      return { connected: false, message };
    }
    return checkGroq(true);
  }, [checkGroq]);

  useEffect(() => {
    checkGroq(false);
    const t = setInterval(() => checkGroq(false), 60000);
    return () => clearInterval(t);
  }, [checkGroq]);

  // Load the backend model registry once; fall back to the built-in list.
  useEffect(() => {
    let cancelled = false;
    getModels().then((res) => {
      if (cancelled) return;
      if (res?.models?.length > 0) {
        setModels(res.models);
        if (res.defaultModel) {
          setModel(res.defaultModel);
          checkGroq(false, res.defaultModel);
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check (cached, cheap) whenever the selected model changes.
  useEffect(() => {
    checkGroq(false, model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  // Start each view at the top and close the mobile drawer.
  useEffect(() => {
    window.scrollTo(0, 0);
    setNavOpen(false);
  }, [location.pathname]);

  // Auto-clear success messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const modelLabel = (id) => {
    const found = models.find((m) => m.id === (id || model));
    return found ? found.label || found.id : id || model;
  };

  // Handle test case generation (allowed only when Groq AI is connected)
  const handleGenerate = async (formData) => {
    // Re-check live before spending a generation call, unless we already
    // know we're connected. Wakes a sleeping host first.
    if (groq.state !== 'connected') {
      const status = await retryGroqConnection();
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
        const usedModel = res.data?.model || formData?.model || model;
        const usedReasoning = res.data?.reasoning || formData?.reasoning || reasoning;
        setSuccess(
          `Successfully generated ${scenarios} test scenarios totalling ${total} rows${modeTag} with ${modelLabel(usedModel)} · ${usedReasoning} reasoning`
        );
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

  // Chat-generated test cases land in the session results, exactly like
  // form-generated ones (same row shape, already saved server-side).
  // A "continue / more / next" follow-up APPENDS instead of replacing.
  const handleChatTestCases = useCallback(
    async (chatTestCases, info = {}) => {
      if (!chatTestCases?.length) return;
      const append = !!info.append;
      setTestCases((prev) => (append ? [...prev, ...chatTestCases] : chatTestCases));
      setChatExport((prev) => {
        if (append && prev?.testCases?.length) {
          const merged = [...prev.testCases, ...chatTestCases];
          return {
            testCases: merged,
            scenarios: (prev.scenarios || 0) + (info.scenarios || 0),
            count: merged.length,
            model: info.model || modelRef.current,
          };
        }
        return {
          testCases: chatTestCases,
          scenarios: info.scenarios || 0,
          count: info.count || chatTestCases.length,
          model: info.model || modelRef.current,
        };
      });
      await fetchAll();
      const usedModel = info.model || modelRef.current;
      const found = models.find((m) => m.id === usedModel);
      const verb = append ? 'appended' : 'generated';
      setSuccess(
        `Chat ${verb} ${info.scenarios || 0} test scenario(s) totalling ${info.count || chatTestCases.length} rows with ${found?.label || usedModel}`
      );
    },
    [fetchAll, models]
  );

  // Export the chat-generated rows via the standard export pipeline.
  const handleExportChat = useCallback(
    (format) => {
      if (!chatExport?.testCases?.length) {
        setError('No chat-generated test cases to export yet.');
        return;
      }
      handleExport(format, chatExport.testCases);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatExport]
  );

  const handleClearChat = useCallback(() => {
    setChatExport(null);
  }, []);

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

  // Cinematic landing — nav + hero only, no app chrome.
  if (page === 'landing') {
    return (
      <div className="App">
        <LandingPage onNavigate={setPage} />
      </div>
    );
  }

  const meta = TOPBAR_META[page] || TOPBAR_META.generate;

  return (
    <div className={`App app-shell ${navOpen ? 'nav-open' : ''}`}>
      {loading && <LoadingOverlay />}

      <Sidebar
        currentPage={page}
        historyCount={allTestCases.length}
        groq={groq}
        onNavigate={(p) => {
          setPage(p);
          setNavOpen(false);
        }}
      />
      {navOpen && (
        <div
          className="nav-scrim"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="app-main-col">
        <Topbar
          title={meta.title}
          sub={meta.sub}
          navOpen={navOpen}
          onMenu={() => setNavOpen((v) => !v)}
          right={<GroqStatus status={groq} compact onRetry={retryGroqConnection} />}
        />

        <main className="page">

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
            <GeneratePage
              testCases={testCases}
              stats={stats}
              loading={loading}
              groqStatus={groq}
              model={model}
              models={models}
              onModelChange={setModel}
              reasoning={reasoning}
              onReasoningChange={setReasoning}
              onGenerate={handleGenerate}
              onDelete={handleDelete}
              onExport={handleExport}
              onRetryGroq={retryGroqConnection}
              onChatTestCases={handleChatTestCases}
              chatExport={chatExport}
              onExportChat={handleExportChat}
              onClearChat={handleClearChat}
              notify={setSuccess}
            />
          )}

          {/* History View */}
          {page === 'history' && (
            <HistoryPage
              testCases={allTestCases}
              onDelete={handleDelete}
              onClearAll={handleClearAll}
              onExport={handleExport}
            />
          )}

          {/* Insights View */}
          {page === 'statistics' && <InsightsPage stats={stats} />}

        </main>

        <footer className="app-footer">
          <span className="foot-brand">
            © 2026 <strong>Test-Case<em>AI</em></strong>
          </span>
          <span className="foot-meta mono">
            <FaMicrochip /> Groq AI
          </span>
          <a
            href="https://github.com/justforstories1998-eng/testforge-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="foot-link"
          >
            <FaGithub /> GitHub
          </a>
        </footer>
      </div>

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