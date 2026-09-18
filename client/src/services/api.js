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

// Check whether the Groq AI backend is reachable.
// Used to gate test-case generation. Short timeout so an offline
// backend fails fast instead of hanging the UI.
export const getGroqStatus = async (fresh = false) => {
  try {
    const response = await api.get(`/testcases/groq-status${fresh ? '?fresh=1' : ''}`, {
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