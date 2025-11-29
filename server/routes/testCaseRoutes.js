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
  getRateLimitStatus
} = require('../controllers/testCaseController');

// Generate test cases with AI
router.post('/generate', generateTestCases);

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