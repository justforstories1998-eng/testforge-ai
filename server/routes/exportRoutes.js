const express = require('express');
const router = express.Router();
const MemoryStorage = require('../storage/memoryStorage');

// @route   POST /api/export/csv
// @desc    Export test cases as CSV
// @access  Public
router.post('/csv', async (req, res) => {
  try {
    const { testCaseIds } = req.body;

    if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'testCaseIds array is required'
      });
    }

    console.log(`📥 Exporting ${testCaseIds.length} test cases as CSV...`);

    // Get all test cases
    const allTestCases = MemoryStorage.getAllData();
    
    // Filter by IDs
    const testCases = allTestCases.filter(tc => testCaseIds.includes(tc._id));

    if (testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No test cases found with provided IDs'
      });
    }

    // Create CSV header
    let csv = 'ID,Work Item Type,Title,Scenario Type,Step Number,Step Action,Step Expected,Step Data,Area Path,Assigned To,State,Priority,Environment,Platforms,Created At\n';

    // Add test cases
    testCases.forEach(tc => {
      if (tc.testSteps.length === 0) {
        const row = [
          escapeCSV(tc.id),
          escapeCSV(tc.workItemType),
          escapeCSV(tc.title),
          escapeCSV(tc.scenarioType),
          '',
          '',
          '',
          '',
          escapeCSV(tc.areaPath),
          escapeCSV(tc.assignedTo),
          escapeCSV(tc.state),
          escapeCSV(tc.priority),
          escapeCSV(tc.environment),
          escapeCSV(tc.platforms.join('; ')),
          escapeCSV(new Date(tc.createdAt).toISOString())
        ].join(',');
        csv += row + '\n';
      } else {
        tc.testSteps.forEach(step => {
          const row = [
            escapeCSV(tc.id),
            escapeCSV(tc.workItemType),
            escapeCSV(tc.title),
            escapeCSV(tc.scenarioType),
            step.stepNumber,
            escapeCSV(step.action),
            escapeCSV(step.expected),
            escapeCSV(step.data),
            escapeCSV(tc.areaPath),
            escapeCSV(tc.assignedTo),
            escapeCSV(tc.state),
            escapeCSV(tc.priority),
            escapeCSV(tc.environment),
            escapeCSV(tc.platforms.join('; ')),
            escapeCSV(new Date(tc.createdAt).toISOString())
          ].join(',');
          csv += row + '\n';
        });
      }
    });

    console.log(`✅ CSV export completed: ${testCases.length} test cases`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=test-cases-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Error exporting CSV:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// @route   POST /api/export/json
// @desc    Export test cases as JSON
// @access  Public
router.post('/json', async (req, res) => {
  try {
    const { testCaseIds } = req.body;

    if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'testCaseIds array is required'
      });
    }

    console.log(`📥 Exporting ${testCaseIds.length} test cases as JSON...`);

    const allTestCases = MemoryStorage.getAllData();
    const testCases = allTestCases.filter(tc => testCaseIds.includes(tc._id));

    if (testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No test cases found with provided IDs'
      });
    }

    console.log(`✅ JSON export completed: ${testCases.length} test cases`);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=test-cases-${Date.now()}.json`);
    res.json({
      exportDate: new Date().toISOString(),
      totalTestCases: testCases.length,
      testCases: testCases
    });

  } catch (error) {
    console.error('❌ Error exporting JSON:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// @route   POST /api/export/excel
// @desc    Export test cases as Excel-compatible CSV
// @access  Public
router.post('/excel', async (req, res) => {
  try {
    const { testCaseIds } = req.body;

    if (!testCaseIds || !Array.isArray(testCaseIds) || testCaseIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'testCaseIds array is required'
      });
    }

    console.log(`📥 Exporting ${testCaseIds.length} test cases for Excel...`);

    const allTestCases = MemoryStorage.getAllData();
    const testCases = allTestCases.filter(tc => testCaseIds.includes(tc._id));

    if (testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No test cases found with provided IDs'
      });
    }

    // Create Excel-friendly CSV with UTF-8 BOM
    let csv = '\uFEFF';
    csv += 'ID\tWork Item Type\tTitle\tScenario Type\tStep #\tAction\tExpected Result\tTest Data\tArea Path\tAssigned To\tState\tPriority\tEnvironment\tPlatforms\tCreated Date\n';

    testCases.forEach(tc => {
      if (tc.testSteps.length === 0) {
        const row = [
          tc.id,
          tc.workItemType,
          tc.title,
          tc.scenarioType,
          '',
          '',
          '',
          '',
          tc.areaPath,
          tc.assignedTo,
          tc.state,
          tc.priority,
          tc.environment,
          tc.platforms.join('; '),
          new Date(tc.createdAt).toLocaleDateString()
        ].join('\t');
        csv += row + '\n';
      } else {
        tc.testSteps.forEach(step => {
          const row = [
            tc.id,
            tc.workItemType,
            tc.title,
            tc.scenarioType,
            step.stepNumber,
            step.action.replace(/\t/g, ' '),
            step.expected.replace(/\t/g, ' '),
            step.data.replace(/\t/g, ' '),
            tc.areaPath,
            tc.assignedTo,
            tc.state,
            tc.priority,
            tc.environment,
            tc.platforms.join('; '),
            new Date(tc.createdAt).toLocaleDateString()
          ].join('\t');
          csv += row + '\n';
        });
      }
    });

    console.log(`✅ Excel export completed: ${testCases.length} test cases`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=test-cases-excel-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('❌ Error exporting for Excel:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Helper function
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

module.exports = router;