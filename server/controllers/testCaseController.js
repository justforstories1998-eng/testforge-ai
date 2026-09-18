const TestCase = require('../models/TestCase');
const { generateTestCasesWithGroq, generateComprehensiveTestCases, getRateLimitStatus: getGroqRateLimitStatus, checkGroqConnection } = require('../services/groqService');

// @desc    Check whether the Groq AI backend is reachable
// @route   GET /api/testcases/groq-status
// @access  Public
exports.getGroqStatus = async (req, res) => {
  try {
    const status = await checkGroqConnection({ force: req.query.fresh === '1' });
    res.status(200).json({ success: true, ...status });
  } catch (error) {
    console.error('Error checking Groq status:', error);
    res.status(200).json({
      success: true,
      connected: false,
      reason: 'unreachable',
      message: `Groq AI is unreachable: ${error.message}`,
      model: null,
      latencyMs: 0,
      rateLimited: false,
      checkedAt: new Date().toISOString(),
    });
  }
};

// @desc    Generate test cases using AI
// @route   POST /api/testcases/generate
// @access  Public
exports.generateTestCases = async (req, res) => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📨 Generate Test Cases Request');
    console.log('═══════════════════════════════════════════════════════════');

    const {
      acceptanceCriteria,
      scenarioType = 'Positive',
      priority = 'High',
      numberOfScenarios = 3,
      numberOfSteps = 4,
      environment = 'Testing',
      platforms = ['Web'],
      state = 'New',
      assignedTo = 'Unassigned',
      areaPath = 'Subscription/Billing/Data'
    } = req.body;

    // Check if comprehensive mode (All scenarios)
    const isComprehensiveMode = scenarioType === 'All';

    console.log('📋 Parameters:', {
      scenarioType,
      isComprehensiveMode,
      numberOfScenarios: isComprehensiveMode ? 'auto' : numberOfScenarios,
      numberOfSteps: isComprehensiveMode ? 'auto' : numberOfSteps,
      priority,
      environment,
      areaPath,
      assignedTo,
      state,
      criteriaLength: acceptanceCriteria?.length || 0
    });

    // Validation
    if (!acceptanceCriteria || acceptanceCriteria.trim().length === 0) {
      return res.status(400).json({ error: 'Acceptance criteria is required' });
    }

    if (acceptanceCriteria.length < 10) {
      return res.status(400).json({ error: 'Acceptance criteria must be at least 10 characters' });
    }

    // Gate: refuse generation when we positively know the AI backend is down.
    // Uses the cached ping (no extra API call) — a stale "unknown" still
    // attempts generation, and generation errors are reported normally.
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: 'Groq AI is not connected (API key missing). Generation is disabled.',
        isConnectionError: true,
      });
    }

    console.log('🤖 Generating test cases with Groq AI...');
    
    let generatedTestCases;
    try {
      if (isComprehensiveMode) {
        // Use comprehensive generation that analyzes all points
        console.log('🎯 Comprehensive Mode: Analyzing all acceptance criteria points...');
        generatedTestCases = await generateComprehensiveTestCases(acceptanceCriteria, {
          priority,
          environment,
          platforms,
          areaPath,
          assignedTo,
          state
        });
      } else {
        // Use standard generation
        generatedTestCases = await generateTestCasesWithGroq(acceptanceCriteria, {
          scenarioType,
          numberOfScenarios: parseInt(numberOfScenarios),
          numberOfSteps: parseInt(numberOfSteps),
          environment,
          platforms,
          areaPath,
          assignedTo,
          state
        });
      }
    } catch (groqError) {
      console.error('❌ Groq generation failed:', groqError.message);
      
      // Check if it's a rate limit error
      if (groqError.message.includes('Rate limit')) {
        return res.status(429).json({ 
          error: groqError.message,
          isRateLimitError: true
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to generate test cases. Please try again.',
        details: groqError.message 
      });
    }

    if (!generatedTestCases || generatedTestCases.length === 0) {
      console.error('❌ No test cases generated');
      return res.status(500).json({ error: 'No test cases were generated. Please try again.' });
    }

    console.log(`✅ Generated ${generatedTestCases.length} test case rows`);

    // Save to in-memory storage
    const savedTestCases = [];
    for (const tcData of generatedTestCases) {
      const testCase = new TestCase({
        ...tcData,
        scenarioType: tcData.scenarioType || scenarioType,
        priority,
        environment,
        platforms
      });
      const saved = await testCase.save();
      savedTestCases.push(saved);
    }

    // Calculate actual scenarios (header rows)
    const headerRows = generatedTestCases.filter(tc => tc.workItemType === 'Test Case').length;
    
    console.log(`💾 Saved ${savedTestCases.length} rows (${headerRows} scenarios)`);
    console.log('═══════════════════════════════════════════════════════════');

    // Return the generated test cases
    res.status(201).json({
      success: true,
      message: `Generated ${headerRows} test case scenarios with ${generatedTestCases.length} total rows`,
      testCases: generatedTestCases,
      count: generatedTestCases.length,
      scenarios: headerRows,
      mode: isComprehensiveMode ? 'comprehensive' : 'standard'
    });

  } catch (error) {
    console.error('❌ Error generating test cases:', error);
    res.status(500).json({
      error: 'An unexpected error occurred while generating test cases',
      details: error.message
    });
  }
};

// @desc    Get all test cases
// @route   GET /api/testcases
// @access  Public
exports.getAllTestCases = async (req, res) => {
  try {
    const testCases = await TestCase.find().sort({ createdAt: -1 });
    res.status(200).json(testCases);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
};

// @desc    Get single test case by ID
// @route   GET /api/testcases/:id
// @access  Public
exports.getTestCaseById = async (req, res) => {
  try {
    const testCase = await TestCase.findById(req.params.id);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.status(200).json(testCase);
  } catch (error) {
    console.error('Error fetching test case:', error);
    res.status(500).json({ error: 'Failed to fetch test case' });
  }
};

// @desc    Update test case
// @route   PUT /api/testcases/:id
// @access  Public
exports.updateTestCase = async (req, res) => {
  try {
    const testCase = await TestCase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    console.log(`✅ Updated test case: ${req.params.id}`);
    res.status(200).json(testCase);
  } catch (error) {
    console.error('Error updating test case:', error);
    res.status(400).json({ error: 'Failed to update test case' });
  }
};

// @desc    Delete single test case
// @route   DELETE /api/testcases/:id
// @access  Public
exports.deleteTestCase = async (req, res) => {
  try {
    const testCase = await TestCase.findByIdAndDelete(req.params.id);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    console.log(`🗑️ Deleted test case: ${req.params.id}`);
    res.status(200).json({
      success: true,
      message: 'Test case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({ error: 'Failed to delete test case' });
  }
};

// @desc    Get statistics
// @route   GET /api/testcases/statistics
// @access  Public
exports.getStatistics = async (req, res) => {
  try {
    const total = await TestCase.countDocuments();
    const scenarioStats = await TestCase.aggregate([
      { $group: { _id: '$scenarioType', count: { $sum: 1 } } }
    ]);
    const priorityStats = await TestCase.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const byScenarioType = {};
    scenarioStats.forEach(stat => {
      if (stat._id) {
        byScenarioType[stat._id] = stat.count;
      }
    });

    const byPriority = {};
    priorityStats.forEach(stat => {
      if (stat._id) {
        byPriority[stat._id] = stat.count;
      }
    });

    console.log('📊 Statistics:', { total, byScenarioType, byPriority });

    res.status(200).json({
      total,
      byScenarioType,
      byPriority
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(200).json({ 
      total: 0,
      byScenarioType: {},
      byPriority: {}
    });
  }
};

// @desc    Delete all test cases
// @route   DELETE /api/testcases
// @access  Public
exports.deleteAllTestCases = async (req, res) => {
  try {
    const result = await TestCase.deleteMany({});
    console.log(`🗑️ Deleted all test cases: ${result.deletedCount}`);
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} test cases deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting test cases:', error);
    res.status(500).json({ error: 'Failed to delete test cases' });
  }
};

// @desc    Get rate limit status
// @route   GET /api/testcases/rate-limit
// @access  Public
exports.getRateLimitStatus = async (req, res) => {
  try {
    const status = getGroqRateLimitStatus();
    res.status(200).json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get rate limit status' 
    });
  }
};