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