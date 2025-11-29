import axios from 'axios';

// Use relative URL for Vercel deployment
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

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