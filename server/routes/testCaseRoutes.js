const express = require('express');
const router = express.Router();
const {
  generateTestCases,
  getAllTestCases,
  getTestCaseById,
  updateTestCase,
  deleteTestCase,
  getStatistics,
  deleteAllTestCases,
  getRateLimitStatus,
  getGroqStatus,
  getSupportedModels,
  chatWithAI
} = require('../controllers/testCaseController');

// Generate test cases with AI
router.post('/generate', generateTestCases);

// AI chat (criteria-aware or solo, optional image)
router.post('/chat', chatWithAI);

// Supported AI models — MUST be before /:id route
router.get('/models', getSupportedModels);

// Groq AI connection status — MUST be before /:id route
router.get('/groq-status', getGroqStatus);

// Get rate limit status
router.get('/rate-limit', getRateLimitStatus);

// Get statistics - MUST be before /:id route
router.get('/statistics', getStatistics);

// Get all test cases
router.get('/', getAllTestCases);

// Get single test case by ID
router.get('/:id', getTestCaseById);

// Update test case
router.put('/:id', updateTestCase);

// Delete single test case
router.delete('/:id', deleteTestCase);

// Delete all test cases
router.delete('/', deleteAllTestCases);

module.exports = router;