const TestCase = require('../models/TestCase');
const { generateTestCasesWithGroq } = require('../services/groqService');

exports.generateTestCases = async (req, res) => {
  try {
    console.log('📨 Received request:', req.body);

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

    if (!acceptanceCriteria || acceptanceCriteria.trim().length === 0) {
      return res.status(400).json({ error: 'Acceptance criteria is required' });
    }

    if (acceptanceCriteria.length < 10) {
      return res.status(400).json({ error: 'Acceptance criteria must be at least 10 characters' });
    }

    // Check if "All" mode
    const isAllMode = scenarioType === 'All';

    console.log('🤖 Generating test cases with Groq AI...');
    console.log(`📍 Mode: ${isAllMode ? 'ALL (Comprehensive)' : scenarioType}`);
    console.log(`📍 Using: Area Path="${areaPath}", Assigned To="${assignedTo}", State="${state}"`);
    
    let generatedTestCases;
    try {
      generatedTestCases = await generateTestCasesWithGroq(acceptanceCriteria, {
        scenarioType,
        // For "All" mode, these will be ignored by the service
        numberOfScenarios: isAllMode ? 'auto' : parseInt(numberOfScenarios),
        numberOfSteps: isAllMode ? 'auto' : parseInt(numberOfSteps),
        environment,
        platforms,
        areaPath,
        assignedTo,
        state
      });
    } catch (groqError) {
      console.error('❌ Groq generation failed:', groqError.message);
      return res.status(500).json({ 
        error: 'Failed to generate test cases. Please try again with different criteria.',
        details: groqError.message 
      });
    }

    if (!generatedTestCases || generatedTestCases.length === 0) {
      return res.status(500).json({ error: 'No test cases were generated. Please try again.' });
    }

    console.log(`✅ Groq generated ${generatedTestCases.length} test case rows`);

    const savedTestCases = [];
    for (const tcData of generatedTestCases) {
      const testCase = new TestCase({
        ...tcData,
        scenarioType: tcData.scenarioType || scenarioType,
        priority,
        environment,
        platforms,
        areaPath: tcData.areaPath,
        assignedTo: tcData.assignedTo,
        state: tcData.state
      });
      const saved = await testCase.save();
      savedTestCases.push(saved);
    }

    // Calculate scenarios - for "All" mode, count unique titles
    let actualScenarios;
    if (isAllMode) {
      actualScenarios = savedTestCases.filter(tc => tc.workItemType === 'Test Case').length;
    } else {
      const totalRowsPerScenario = 1 + parseInt(numberOfSteps);
      actualScenarios = Math.floor(savedTestCases.length / totalRowsPerScenario);
    }

    console.log(`💾 Saved ${savedTestCases.length} test case rows (${actualScenarios} scenarios)`);

    // Group by scenario type for "All" mode
    let scenarioBreakdown = {};
    if (isAllMode) {
      savedTestCases.forEach(tc => {
        if (tc.workItemType === 'Test Case' && tc.scenarioType) {
          scenarioBreakdown[tc.scenarioType] = (scenarioBreakdown[tc.scenarioType] || 0) + 1;
        }
      });
    }

    res.status(201).json({
      success: true,
      message: isAllMode 
        ? `Generated comprehensive test coverage: ${actualScenarios} scenarios across all types`
        : `Generated ${actualScenarios} test case scenarios with ${savedTestCases.length} total rows`,
      testCases: savedTestCases,
      count: savedTestCases.length,
      scenarios: actualScenarios,
      isComprehensive: isAllMode,
      scenarioBreakdown: isAllMode ? scenarioBreakdown : undefined
    });

  } catch (error) {
    console.error('❌ Error generating test cases:', error);
    res.status(500).json({
      error: 'An unexpected error occurred while generating test cases',
      details: error.message
    });
  }
};

exports.getAllTestCases = async (req, res) => {
  try {
    const testCases = await TestCase.find().sort({ createdAt: -1 });
    res.status(200).json(testCases);
  } catch (error) {
    console.error('Error fetching test cases:', error);
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
};

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
    console.log(`✅ Updated test case at index ${req.params.id}:`, req.body);
    res.status(200).json(testCase);
  } catch (error) {
    console.error('Error updating test case:', error);
    res.status(400).json({ error: 'Failed to update test case' });
  }
};

exports.deleteTestCase = async (req, res) => {
  try {
    const testCase = await TestCase.findByIdAndDelete(req.params.id);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Test case deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting test case:', error);
    res.status(500).json({ error: 'Failed to delete test case' });
  }
};

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
      byScenarioType[stat._id] = stat.count;
    });

    const byPriority = {};
    priorityStats.forEach(stat => {
      byPriority[stat._id] = stat.count;
    });

    res.status(200).json({
      total,
      byScenarioType,
      byPriority
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

exports.deleteAllTestCases = async (req, res) => {
  try {
    const result = await TestCase.deleteMany({});
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