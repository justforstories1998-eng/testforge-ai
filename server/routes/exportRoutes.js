const express = require('express');
const router = express.Router();
const TestCase = require('../models/TestCase');
const { buildPlaywrightSpec } = require('../utils/playwrightSpec');

// @route   POST /api/export/csv
// @desc    Export test cases as CSV
// @access  Public
router.post('/csv', async (req, res) => {
  try {
    const { testCaseIds } = req.body;

    console.log(`📥 Exporting as CSV...`);

    // Get all test cases
    const allTestCases = await TestCase.find().sort({ createdAt: -1 });
    
    // Filter by IDs if provided
    let testCases = allTestCases;
    if (testCaseIds && Array.isArray(testCaseIds) && testCaseIds.length > 0) {
      testCases = allTestCases.filter(tc => testCaseIds.includes(tc._id || tc.id));
    }

    if (testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No test cases found'
      });
    }

    // Create CSV header
    let csv = 'ID,Work Item Type,Title,Test Step,Step Action,Step Expected,Area Path,Assigned To,State,Scenario Type,Priority\n';

    // Add test cases
    testCases.forEach(tc => {
      const row = [
        escapeCSV(tc.id || ''),
        escapeCSV(tc.workItemType || ''),
        escapeCSV(tc.title || ''),
        escapeCSV(tc.testStep || ''),
        escapeCSV(tc.stepAction || ''),
        escapeCSV(tc.stepExpected || ''),
        escapeCSV(tc.areaPath || ''),
        escapeCSV(tc.assignedTo || ''),
        escapeCSV(tc.state || ''),
        escapeCSV(tc.scenarioType || ''),
        escapeCSV(tc.priority || '')
      ].join(',');
      csv += row + '\n';
    });

    console.log(`✅ CSV export completed: ${testCases.length} rows`);

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

    console.log(`📥 Exporting as JSON...`);

    const allTestCases = await TestCase.find().sort({ createdAt: -1 });
    
    let testCases = allTestCases;
    if (testCaseIds && Array.isArray(testCaseIds) && testCaseIds.length > 0) {
      testCases = allTestCases.filter(tc => testCaseIds.includes(tc._id || tc.id));
    }

    if (testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No test cases found'
      });
    }

    console.log(`✅ JSON export completed: ${testCases.length} rows`);

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

    console.log(`📥 Exporting for Excel...`);

    const allTestCases = await TestCase.find().sort({ createdAt: -1 });
    
    let testCases = allTestCases;
    if (testCaseIds && Array.isArray(testCaseIds) && testCaseIds.length > 0) {
      testCases = allTestCases.filter(tc => testCaseIds.includes(tc._id || tc.id));
    }

    if (testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No test cases found'
      });
    }

    // Create Excel-friendly CSV with UTF-8 BOM
    let csv = '\uFEFF';
    csv += 'ID\tWork Item Type\tTitle\tTest Step\tStep Action\tStep Expected\tArea Path\tAssigned To\tState\tScenario Type\tPriority\n';

    testCases.forEach(tc => {
      const row = [
        tc.id || '',
        tc.workItemType || '',
        tc.title || '',
        tc.testStep || '',
        (tc.stepAction || '').replace(/\t/g, ' ').replace(/\n/g, ' '),
        (tc.stepExpected || '').replace(/\t/g, ' ').replace(/\n/g, ' '),
        tc.areaPath || '',
        tc.assignedTo || '',
        tc.state || '',
        tc.scenarioType || '',
        tc.priority || ''
      ].join('\t');
      csv += row + '\n';
    });

    console.log(`✅ Excel export completed: ${testCases.length} rows`);

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

// @route   POST /api/export/playwright
// @desc    Export test cases as an editable Playwright TypeScript spec file
// @access  Public
router.post('/playwright', async (req, res) => {
  try {
    const { testCaseIds, baseURL = '/', describeTitle = 'Test-CaseAI — Generated Suite' } = req.body || {};

    console.log('📥 Exporting as Playwright spec...');

    const allTestCases = await TestCase.find().sort({ createdAt: -1 });

    let testCases = allTestCases;
    if (testCaseIds && Array.isArray(testCaseIds) && testCaseIds.length > 0) {
      testCases = allTestCases.filter(tc => testCaseIds.includes(tc._id || tc.id));
    }

    if (testCases.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No test cases found'
      });
    }

    const spec = buildPlaywrightSpec(testCases, { baseURL, describeTitle });
    const filename = `test-caseai-generated-${Date.now()}.spec.ts`;

    console.log(`✅ Playwright export completed: ${testCases.length} rows`);

    res.setHeader('Content-Type', 'text/typescript; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(spec);
  } catch (error) {
    console.error('❌ Error exporting Playwright spec:', error);
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