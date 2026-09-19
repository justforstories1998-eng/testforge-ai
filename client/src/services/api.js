import axios from 'axios';

// Use relative URL for Vercel deployment
// Determine API URL based on environment
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

// Generate test cases
export const generateTestCases = async (data) => {
  try {
    const response = await api.post('/testcases', data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// Download a server-generated export file (csv / json / excel / playwright)
const downloadExportFile = async (format, testCaseIds, fallbackFilename) => {
  const response = await api.post(`/export/${format}`, { testCaseIds }, { responseType: 'blob' });
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const exportAsCSV = (testCaseIds) =>
  downloadExportFile('csv', testCaseIds, `test-cases-${Date.now()}.csv`);

export const exportAsJSON = (testCaseIds) =>
  downloadExportFile('json', testCaseIds, `test-cases-${Date.now()}.json`);

export const exportAsExcel = (testCaseIds) =>
  downloadExportFile('excel', testCaseIds, `test-cases-excel-${Date.now()}.csv`);

export const exportAsPlaywright = (testCaseIds, options = {}) =>
  api.post('/export/playwright', { testCaseIds, ...options }, { responseType: 'blob' }).then((response) => {
    const blob = new Blob([response.data], { type: 'text/typescript' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-caseai-generated-${Date.now()}.spec.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  });

// Fallback model list if the backend is unreachable. The backend
// registry (GET /testcases/models) is the source of truth when online.
export const SUPPORTED_MODELS_FALLBACK = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', vision: false },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', vision: true },
];

export const DEFAULT_MODEL = 'openai/gpt-oss-120b';

// List supported AI models from the backend registry.
export const getModels = async () => {
  try {
    const response = await api.get('/testcases/models', { timeout: 15000 });
    return response.data;
  } catch (error) {
    console.error('Models fetch failed:', error);
    return {
      success: false,
      models: SUPPORTED_MODELS_FALLBACK,
      defaultModel: DEFAULT_MODEL,
    };
  }
};

// Chat with the AI assistant. Supports abort via AbortSignal (Stop button).
// Payload: { model, mode, acceptanceCriteria, meta, history, text, image }
export const chatWithAI = async (payload, { signal } = {}) => {
  try {
    const response = await api.post('/testcases/chat', payload, {
      timeout: 120000,
      signal,
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
      const canceled = new Error('Request canceled');
      canceled.canceled = true;
      throw canceled;
    }
    console.error('Chat API Error:', error);
    throw error.response?.data || { message: error.message };
  }
};

// Check whether the Groq AI backend is reachable.
// Used to gate test-case generation. Short timeout so an offline
// backend fails fast instead of hanging the UI.
export const getGroqStatus = async (fresh = false, model) => {
  try {
    const params = new URLSearchParams();
    if (fresh) params.set('fresh', '1');
    if (model) params.set('model', model);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/testcases/groq-status${qs}`, {
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    console.error('Groq status check failed:', error);
    return {
      success: false,
      connected: false,
      reason: 'unreachable',
      message: 'Backend unreachable. Is the API server running?',
      model: null,
      rateLimited: false,
    };
  }
};

// Wake a sleeping host (e.g. Render free tier spins down when idle and
// needs up to ~a minute for a cold start). Polls the cheap /health
// endpoint until the backend answers or the budget runs out.
export const wakeBackend = async ({
  budgetMs = 100000,
  attemptTimeoutMs = 12000,
  intervalMs = 3000,
  onTick,
} = {}) => {
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      const res = await api.get('/health', { timeout: attemptTimeoutMs });
      if (res.status === 200) {
        return { ok: true, attempts: attempt, elapsedMs: Date.now() - started };
      }
    } catch (e) {
      /* asleep / booting / network blip — keep polling */
    }
    const elapsedMs = Date.now() - started;
    if (elapsedMs >= budgetMs) {
      return { ok: false, attempts: attempt, elapsedMs };
    }
    if (onTick) {
      try {
        onTick({ attempt, elapsedMs });
      } catch {
        /* ignore listener errors */
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
};

// Get rate limit status
export const getRateLimitStatus = async () => {
  try {
    const response = await api.get('/testcases');
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error.response?.data || { message: error.message };
  }
};

export default api;