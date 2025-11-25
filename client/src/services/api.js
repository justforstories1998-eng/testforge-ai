import axios from 'axios';

// Base URL for API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ===================================
// TEST CASE APIs
// ===================================

/**
 * Generate test cases from acceptance criteria
 */
export const generateTestCases = async (data) => {
  try {
    const response = await api.post('/testcases/generate', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to generate test cases' };
  }
};

/**
 * Get all test cases
 */
export const getAllTestCases = async (filters = {}) => {
  try {
    const response = await api.get('/testcases', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch test cases' };
  }
};

/**
 * Get single test case by ID
 */
export const getTestCaseById = async (id) => {
  try {
    const response = await api.get(`/testcases/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch test case' };
  }
};

/**
 * Update test case
 */
export const updateTestCase = async (id, data) => {
  try {
    const response = await api.put(`/testcases/${id}`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to update test case' };
  }
};

/**
 * Delete test case
 */
export const deleteTestCase = async (id) => {
  try {
    const response = await api.delete(`/testcases/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to delete test case' };
  }
};

/**
 * Delete all test cases
 */
export const deleteAllTestCases = async () => {
  try {
    const response = await api.delete('/testcases/all/delete');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to delete all test cases' };
  }
};

/**
 * Get statistics
 */
export const getStatistics = async () => {
  try {
    const response = await api.get('/testcases/statistics');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch statistics' };
  }
};

// ===================================
// EXPORT APIs
// ===================================

/**
 * Export test cases as CSV
 */
export const exportAsCSV = async (testCaseIds) => {
  try {
    const response = await api.post('/export/csv', 
      { testCaseIds },
      { responseType: 'blob' }
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `test-cases-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true, message: 'CSV exported successfully' };
  } catch (error) {
    throw error.response?.data || { error: 'Failed to export CSV' };
  }
};

/**
 * Export test cases as JSON
 */
export const exportAsJSON = async (testCaseIds) => {
  try {
    const response = await api.post('/export/json', 
      { testCaseIds },
      { responseType: 'blob' }
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `test-cases-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true, message: 'JSON exported successfully' };
  } catch (error) {
    throw error.response?.data || { error: 'Failed to export JSON' };
  }
};

/**
 * Export test cases for Excel
 */
export const exportAsExcel = async (testCaseIds) => {
  try {
    const response = await api.post('/export/excel', 
      { testCaseIds },
      { responseType: 'blob' }
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `test-cases-excel-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true, message: 'Excel file exported successfully' };
  } catch (error) {
    throw error.response?.data || { error: 'Failed to export Excel' };
  }
};

// ===================================
// HEALTH CHECK
// ===================================

/**
 * Check API health
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Health check failed' };
  }
};

export default api;