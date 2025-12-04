const Groq = require('groq-sdk');

// In-memory storage
let testCases = [];
let idCounter = 1;

// Rate limiter state
let rateLimiter = {
  minuteRequests: 0,
  dayRequests: 0,
  lastMinuteReset: Date.now(),
  lastDayReset: Date.now(),
  MAX_PER_MINUTE: 25,
  MAX_PER_DAY: 14000
};

// Initialize Groq client
let groq = null;
const getGroqClient = () => {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
};

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  
  try {
    // Parse sub-path
    let subPath = '';
    if (url) {
      const urlWithoutQuery = url.split('?')[0];
      const match = urlWithoutQuery.match(/\/api\/testcases\/?(.*)$/);
      if (match) subPath = match[1] || '';
    }

    console.log(`📨 ${method} /api/testcases/${subPath || '(root)'}`);

    // Route handling
    if ((subPath === 'generate' || subPath === '') && method === 'POST') {
      return await handleGenerate(req, res);
    }
    if (subPath === 'statistics' && method === 'GET') {
      return handleStatistics(req, res);
    }
    if (subPath === 'rate-limit' && method === 'GET') {
      return handleRateLimit(req, res);
    }
    if (subPath === '' && method === 'GET') {
      return handleGetAll(req, res);
    }
    if (subPath === '' && method === 'DELETE') {
      return handleDeleteAll(req, res);
    }
    if (subPath && !['generate', 'statistics', 'rate-limit'].includes(subPath) && method === 'GET') {
      return handleGetById(req, res, subPath);
    }
    if (subPath && method === 'PUT') {
      return handleUpdate(req, res, subPath);
    }
    if (subPath && method === 'DELETE') {
      return handleDeleteById(req, res, subPath);
    }

    return res.status(404).json({ error: 'Route not found', path: url });
  } catch (error) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════

async function handleGenerate(req, res) {
  try {
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
    } = req.body || {};

    if (!acceptanceCriteria || acceptanceCriteria.trim().length < 10) {
      return res.status(400).json({ error: 'Acceptance criteria must be at least 10 characters' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ error: rateLimitCheck.message, isRateLimitError: true });
    }

    const isComprehensiveMode = scenarioType === 'All';
    let generatedTestCases;

    if (isComprehensiveMode) {
      generatedTestCases = await generateComprehensiveTestCases(acceptanceCriteria, { areaPath, assignedTo, state });
    } else {
      generatedTestCases = await generateStandardTestCases(acceptanceCriteria, {
        scenarioType, numberOfScenarios: parseInt(numberOfScenarios), numberOfSteps: parseInt(numberOfSteps),
        areaPath, assignedTo, state
      });
    }

    if (!generatedTestCases || generatedTestCases.length === 0) {
      return res.status(500).json({ error: 'No test cases generated' });
    }

    // Save to storage
    const timestamp = Date.now();
    generatedTestCases.forEach((tc, i) => {
      tc._id = `tc-${timestamp}-${idCounter++}`;
      tc.createdAt = new Date().toISOString();
      tc.priority = priority;
      tc.environment = environment;
      tc.platforms = platforms;
      testCases.push(tc);
    });

    const headerRows = generatedTestCases.filter(tc => tc.workItemType === 'Test Case').length;

    return res.status(201).json({
      success: true,
      message: `Generated ${headerRows} test scenarios`,
      testCases: generatedTestCases,
      count: generatedTestCases.length,
      scenarios: headerRows,
      mode: isComprehensiveMode ? 'comprehensive' : 'standard'
    });
  } catch (error) {
    console.error('❌ Generate error:', error);
    return res.status(500).json({ error: 'Failed to generate test cases', details: error.message });
  }
}

function handleGetAll(req, res) {
  const sorted = [...testCases].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return res.status(200).json(sorted);
}

function handleStatistics(req, res) {
  const byScenarioType = {};
  const byPriority = {};
  testCases.forEach(tc => {
    if (tc.scenarioType) byScenarioType[tc.scenarioType] = (byScenarioType[tc.scenarioType] || 0) + 1;
    if (tc.priority) byPriority[tc.priority] = (byPriority[tc.priority] || 0) + 1;
  });
  return res.status(200).json({
    total: testCases.length,
    byScenarioType,
    byPriority,
    headerCount: testCases.filter(tc => tc.workItemType === 'Test Case').length,
    stepCount: testCases.filter(tc => !tc.workItemType).length
  });
}

function handleRateLimit(req, res) {
  const now = Date.now();
  return res.status(200).json({
    success: true,
    minuteRequests: rateLimiter.minuteRequests,
    dayRequests: rateLimiter.dayRequests,
    minuteRemaining: Math.max(0, rateLimiter.MAX_PER_MINUTE - rateLimiter.minuteRequests),
    dayRemaining: Math.max(0, rateLimiter.MAX_PER_DAY - rateLimiter.dayRequests),
    minuteLimit: rateLimiter.MAX_PER_MINUTE,
    dayLimit: rateLimiter.MAX_PER_DAY
  });
}

function handleGetById(req, res, id) {
  const testCase = testCases.find(tc => tc._id === id);
  if (!testCase) return res.status(404).json({ error: 'Test case not found' });
  return res.status(200).json(testCase);
}

function handleUpdate(req, res, id) {
  const index = testCases.findIndex(tc => tc._id === id);
  if (index === -1) return res.status(404).json({ error: 'Test case not found' });
  testCases[index] = { ...testCases[index], ...req.body, _id: testCases[index]._id, updatedAt: new Date().toISOString() };
  return res.status(200).json(testCases[index]);
}

function handleDeleteById(req, res, id) {
  let index = !isNaN(id) && !id.startsWith('tc-') ? parseInt(id) : testCases.findIndex(tc => tc._id === id);
  if (index < 0 || index >= testCases.length) return res.status(404).json({ error: 'Test case not found' });
  testCases.splice(index, 1);
  return res.status(200).json({ success: true, message: 'Deleted' });
}

function handleDeleteAll(req, res) {
  const count = testCases.length;
  testCases = [];
  idCounter = 1;
  return res.status(200).json({ success: true, deletedCount: count });
}

// ═══════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════
function checkRateLimit() {
  const now = Date.now();
  if (now - rateLimiter.lastMinuteReset > 60000) { rateLimiter.minuteRequests = 0; rateLimiter.lastMinuteReset = now; }
  if (now - rateLimiter.lastDayReset > 86400000) { rateLimiter.dayRequests = 0; rateLimiter.lastDayReset = now; }
  if (rateLimiter.minuteRequests >= rateLimiter.MAX_PER_MINUTE) {
    return { allowed: false, message: `Rate limit. Wait ${Math.ceil((60000 - (now - rateLimiter.lastMinuteReset)) / 1000)}s` };
  }
  if (rateLimiter.dayRequests >= rateLimiter.MAX_PER_DAY) {
    return { allowed: false, message: 'Daily limit reached' };
  }
  rateLimiter.minuteRequests++;
  rateLimiter.dayRequests++;
  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════
// AI GENERATION
// ═══════════════════════════════════════════════════════════
async function generateStandardTestCases(criteria, options) {
  const { scenarioType, numberOfScenarios, numberOfSteps, areaPath, assignedTo, state } = options;

  const prompt = `Generate ${numberOfScenarios} ${scenarioType} test cases for: "${criteria}"
Each with ${numberOfSteps} steps. Title starts with "Verify". Return ONLY JSON array:
[{"title":"Verify...","steps":[{"action":"...","expected":"..."}]}]`;

  try {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'Output ONLY valid JSON arrays. No markdown.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 4000
    });

    const parsed = parseJson(response.choices[0]?.message?.content || '');
    return formatTestCases(parsed, scenarioType, areaPath, assignedTo, state);
  } catch (error) {
    console.error('Groq error:', error);
    return fallbackTestCases(criteria, scenarioType, numberOfScenarios, numberOfSteps, areaPath, assignedTo, state);
  }
}

async function generateComprehensiveTestCases(criteria, options) {
  const { areaPath, assignedTo, state } = options;

  const prompt = `Generate comprehensive test cases for: "${criteria}"
Include: Positive (2-3), Negative (2-3), Boundary (1-2), Edge (1-2).
Each with scenarioType field, 4-6 steps. Return ONLY JSON:
[{"title":"Verify...","scenarioType":"Positive","steps":[{"action":"...","expected":"..."}]}]`;

  try {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'Output ONLY valid JSON arrays.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 6000
    });

    const parsed = parseJson(response.choices[0]?.message?.content || '');
    return formatTestCases(parsed, null, areaPath, assignedTo, state, true);
  } catch (error) {
    console.error('Comprehensive error:', error);
    return comprehensiveFallback(criteria, areaPath, assignedTo, state);
  }
}

function parseJson(content) {
  let cleaned = content.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  const start = cleaned.indexOf('['), end = cleaned.lastIndexOf(']');
  if (start !== -1 && end > start) cleaned = cleaned.substring(start, end + 1);
  return JSON.parse(cleaned);
}

function formatTestCases(parsed, defaultType, areaPath, assignedTo, state, isComprehensive = false) {
  const result = [];
  for (const tc of parsed) {
    const scenarioType = tc.scenarioType || defaultType || 'Positive';
    result.push({
      id: '', workItemType: 'Test Case',
      title: tc.title?.startsWith('Verify') ? tc.title : `Verify ${tc.title}`,
      testStep: '', stepAction: '', stepExpected: '',
      areaPath, assignedTo, state, scenarioType
    });
    (tc.steps || []).forEach((step, i) => {
      result.push({
        id: '', workItemType: '', title: '',
        testStep: String(i + 1),
        stepAction: step.action || `Action ${i + 1}`,
        stepExpected: step.expected || `Expected ${i + 1}`,
        areaPath, assignedTo, state, scenarioType
      });
    });
  }
  return result;
}

function fallbackTestCases(criteria, type, num, steps, areaPath, assignedTo, state) {
  const result = [];
  for (let i = 0; i < num; i++) {
    result.push({ id: '', workItemType: 'Test Case', title: `Verify ${type} scenario ${i + 1}`, testStep: '', stepAction: '', stepExpected: '', areaPath, assignedTo, state, scenarioType: type });
    for (let j = 0; j < steps; j++) {
      result.push({ id: '', workItemType: '', title: '', testStep: String(j + 1), stepAction: `Action ${j + 1}`, stepExpected: `Expected ${j + 1}`, areaPath, assignedTo, state, scenarioType: type });
    }
  }
  return result;
}

function comprehensiveFallback(criteria, areaPath, assignedTo, state) {
  const result = [];
  ['Positive', 'Negative', 'Boundary', 'Edge'].forEach(type => {
    result.push({ id: '', workItemType: 'Test Case', title: `Verify ${type} scenario`, testStep: '', stepAction: '', stepExpected: '', areaPath, assignedTo, state, scenarioType: type });
    for (let j = 0; j < 4; j++) {
      result.push({ id: '', workItemType: '', title: '', testStep: String(j + 1), stepAction: `${type} action ${j + 1}`, stepExpected: `${type} expected ${j + 1}`, areaPath, assignedTo, state, scenarioType: type });
    }
  });
  return result;
}