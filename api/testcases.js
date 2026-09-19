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

// NOTE: `llama-3.3-70b-versatile` was shut down by Groq on 2026-08-16.
// Groq's recommended production replacement is `openai/gpt-oss-120b`.
// Override per-environment with the GROQ_MODEL env var.
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Model registry — mirrors server/services/groqService.js (keep in sync).
const SUPPORTED_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', vision: false, maxOutput: 6000 },
  // qwen tier caps output tokens per minute (~1000 OTPM) — keep requests small.
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', vision: true, maxOutput: 900 },
];

function maxOutputFor(modelId) {
  const found = SUPPORTED_MODELS.find((m) => m.id === modelId);
  return found?.maxOutput || 4000;
}

function getSupportedModels() {
  const fallback = SUPPORTED_MODELS.some((m) => m.id === GROQ_MODEL)
    ? GROQ_MODEL
    : SUPPORTED_MODELS[0].id;
  return { models: SUPPORTED_MODELS, defaultModel: process.env.GROQ_MODEL || fallback };
}

function resolveModel(requested) {
  if (!requested) return getSupportedModels().defaultModel;
  const found = SUPPORTED_MODELS.find((m) => m.id === requested);
  if (!found) {
    throw new Error(`Unsupported model "${requested}". Supported: ${SUPPORTED_MODELS.map((m) => m.id).join(', ')}`);
  }
  return found.id;
}

function modelSupportsVision(modelId) {
  const found = SUPPORTED_MODELS.find((m) => m.id === modelId);
  return !!found?.vision;
}

function validateChatImage(dataUrl) {
  if (typeof dataUrl !== 'string') throw new Error('Image must be a data URL string.');
  const match = dataUrl.match(/^data:(image\/(png|jpe?g|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Image must be a PNG, JPEG, GIF or WebP data URL.');
  const approxBytes = Math.floor((match[3].length * 3) / 4);
  if (approxBytes > 6 * 1024 * 1024) throw new Error('Image is too large. Maximum size is 6 MB.');
  return { mime: match[1], approxBytes };
}

// Extract a testcases-json fenced block; null when the model wrote prose.
function extractTestCasesJson(text) {
  if (!text) return null;
  const fence = text.match(/```testcases-json\s*([\s\S]*?)\s*```/i)
    || text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!fence) return null;
  let parsed;
  try { parsed = JSON.parse(fence[1].trim()); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const allowed = ['Positive', 'Negative', 'Boundary', 'Edge'];
  const cleaned = [];
  for (const item of parsed) {
    if (!item || typeof item.title !== 'string' || !Array.isArray(item.steps)) continue;
    const steps = item.steps
      .filter((s) => s && (s.action || s.expected))
      .map((s) => ({
        action: String(s.action || 'Perform the test action.'),
        expected: String(s.expected || 'Verify the expected outcome.'),
      }));
    if (steps.length === 0) continue;
    cleaned.push({
      title: item.title.trim().toLowerCase().startsWith('verify') ? item.title.trim() : `Verify ${item.title.trim()}`,
      scenarioType: allowed.includes(item.scenarioType) ? item.scenarioType : 'Positive',
      steps,
    });
  }
  return cleaned.length > 0 ? cleaned : null;
}

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
    if (subPath === 'groq-status' && method === 'GET') {
      return await handleGroqStatus(req, res);
    }
    if (subPath === 'models' && method === 'GET') {
      return res.status(200).json({ success: true, ...getSupportedModels() });
    }
    if (subPath === 'chat' && method === 'POST') {
      return await handleChat(req, res);
    }
    if (subPath === '' && method === 'GET') {
      return handleGetAll(req, res);
    }
    if (subPath === '' && method === 'DELETE') {
      return handleDeleteAll(req, res);
    }
    if (subPath && !['generate', 'statistics', 'rate-limit', 'groq-status', 'models', 'chat'].includes(subPath) && method === 'GET') {
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
      return res.status(503).json({
        error: 'Groq AI is not connected (API key missing). Generation is disabled.',
        isConnectionError: true
      });
    }

    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ error: rateLimitCheck.message, isRateLimitError: true });
    }

    let model;
    try {
      model = resolveModel((req.body || {}).model);
    } catch (modelError) {
      return res.status(400).json({ error: modelError.message });
    }

    const isComprehensiveMode = scenarioType === 'All';
    let generatedTestCases;

    if (isComprehensiveMode) {
      generatedTestCases = await generateComprehensiveTestCases(acceptanceCriteria, { areaPath, assignedTo, state, model });
    } else {
      generatedTestCases = await generateStandardTestCases(acceptanceCriteria, {
        scenarioType, numberOfScenarios: parseInt(numberOfScenarios), numberOfSteps: parseInt(numberOfSteps),
        areaPath, assignedTo, state, model
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
      mode: isComprehensiveMode ? 'comprehensive' : 'standard',
      model
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

async function handleChat(req, res) {
  try {
    const {
      model: requestedModel,
      mode = 'criteria',
      acceptanceCriteria = '',
      meta = {},
      history = [],
      text = '',
      image = null,
    } = req.body || {};

    let model;
    try {
      model = resolveModel(requestedModel);
    } catch (modelError) {
      return res.status(400).json({ success: false, error: modelError.message });
    }

    if (!['criteria', 'solo'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'mode must be "criteria" or "solo"' });
    }

    const cleanText = String(text || '').slice(0, 8000);
    if (!cleanText.trim() && !image) {
      return res.status(400).json({ success: false, error: 'Send a message or attach an image.' });
    }

    if (image) {
      try {
        validateChatImage(image);
      } catch (imgError) {
        return res.status(400).json({ success: false, error: imgError.message });
      }
      if (!modelSupportsVision(model)) {
        return res.status(400).json({
          success: false,
          error: `Model "${model}" does not support images. Switch to a vision-capable model to send images.`,
        });
      }
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Groq AI is not connected (API key missing).',
        isConnectionError: true,
      });
    }

    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ success: false, error: rateLimitCheck.message, isRateLimitError: true });
    }

    const criteria = String(acceptanceCriteria || '').slice(0, 20000);
    const cleanHistory = (Array.isArray(history) ? history : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: String(m.content || '').slice(0, 8000),
        hadImage: !!m.hadImage,
      }));

    const groqMessages = [{ role: 'system', content: buildChatSystemPrompt(mode, criteria, !!image) }];
    for (const m of cleanHistory) {
      groqMessages.push({
        role: m.role,
        content: m.hadImage
          ? `${m.content}\n[An image was attached to this earlier message. Only the latest message carries image data.]`
          : m.content,
      });
    }
    if (image) {
      groqMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: cleanText || 'Analyze this image.' },
          { type: 'image_url', image_url: { url: image } },
        ],
      });
    } else {
      groqMessages.push({ role: 'user', content: cleanText });
    }

    const client = getGroqClient();
    let content;
    try {
      const response = await client.chat.completions.create({
        messages: groqMessages,
        model,
        temperature: mode === 'solo' ? 0.7 : 0.5,
        max_tokens: Math.min(6000, maxOutputFor(model)),
      });
      content = response.choices[0]?.message?.content || '';
    } catch (groqError) {
      if (/rate limit|429|rate_limit|request too large|quota/i.test(groqError.message || '')) {
        return res.status(429).json({ success: false, error: groqError.message, isRateLimitError: true });
      }
      throw groqError;
    }

    let rows = null;
    let reply = content;
    if (mode === 'criteria') {
      const parsed = extractTestCasesJson(content);
      if (parsed) {
        rows = formatTestCases(parsed, null, meta.areaPath || '', meta.assignedTo || '', meta.state || '', true);
        const timestamp = Date.now();
        rows.forEach((tc) => {
          tc._id = `tc-${timestamp}-${idCounter++}`;
          tc.createdAt = new Date().toISOString();
          if (meta.priority) tc.priority = meta.priority;
          testCases.push(tc);
        });
        const headerRows = rows.filter((tc) => tc.workItemType === 'Test Case').length;
        reply = content.replace(
          /```testcases-json[\s\S]*?```/gi,
          `> ✅ Generated ${headerRows} test scenario(s) — loaded into Session Results below.`
        );
        return res.status(200).json({
          success: true, model, reply, testCases: rows, count: rows.length, scenarios: headerRows,
        });
      }
    }

    return res.status(200).json({
      success: true, model, reply, testCases: null, count: 0, scenarios: 0,
    });
  } catch (error) {
    console.error('❌ Chat error:', error);
    return res.status(500).json({ success: false, error: 'Chat failed. Please try again.', details: error.message });
  }
}

function buildChatSystemPrompt(mode, criteria, hasImage) {
  if (mode === 'solo') {
    return `You are Test-CaseAI, a general-purpose AI assistant inside a QA test-management app.
Answer directly and helpfully. Use Markdown formatting (headings, bullets, code fences) where it improves readability.
Keep answers focused and reasonably concise. You are NOT restricted to any project context in this mode.`;
  }
  const context = criteria && criteria.trim()
    ? `The user is working with THIS acceptance criteria (help generate, improve, analyse, or modify it and related user stories):\n"""\n${criteria.trim()}\n"""`
    : `No acceptance criteria has been written yet — if the user needs criteria help, ask them to describe the feature first (unless they attached an image to derive it from).`;
  return `You are Test-CaseAI, an expert QA assistant embedded in a test-management app.
${context}
${hasImage ? 'An image is attached to the latest message — analyse it directly (UI, requirements, error text, whatever it shows) and ground your answer in what you see.' : ''}

How this app represents test cases (follow this exactly — never invent another format):
- Flat rows. A scenario header row has workItemType "Test Case" and a title starting with "Verify".
- scenarioType is exactly one of: Positive, Negative, Boundary, Edge.
- Each header is followed by step rows: numbered testStep, concrete stepAction, concrete stepExpected.
- Test data lives inside the step text. Priority/area/owner are row metadata you don't need to emit.

When the user asks for TEST CASES (including "from this image"), output them in ONE fenced block, exactly like:
\`\`\`testcases-json
[{"title":"Verify ...","scenarioType":"Positive","steps":[{"action":"...","expected":"..."}]}]
\`\`\`
Rules: every title starts with "Verify"; 3-6 concrete steps per scenario; brief prose OUTSIDE the fence only.
For criteria/user-story requests, answer in clear Markdown the user can insert back into the form.`;
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

async function handleGroqStatus(req, res) {
  let model;
  try {
    const url = new URL(req.url || '', 'http://localhost');
    model = resolveModel(url.searchParams.get('model') || (req.query && req.query.model));
  } catch (modelError) {
    return res.status(400).json({ success: false, error: modelError.message });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(200).json({
      success: true,
      connected: false,
      reason: 'missing_key',
      message: 'GROQ_API_KEY is not configured on the server.',
      model: null,
      latencyMs: 0,
      rateLimited: false,
      checkedAt: new Date().toISOString()
    });
  }

  const started = Date.now();
  try {
    const client = getGroqClient();
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Groq ping timed out after 10s')), 10000)
    );
    const ping = client.chat.completions.create({
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      model,
      temperature: 0,
      max_tokens: 5
    });
    const response = await Promise.race([ping, timeout]);
    return res.status(200).json({
      success: true,
      connected: true,
      reason: 'ok',
      message: 'Groq AI is connected and responding.',
      model: response?.model || model,
      latencyMs: Date.now() - started,
      rateLimited: false,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    const msg = error?.message || 'Unknown error';
    const isRateLimit = /rate limit|429|rate_limit/i.test(msg);
    const isBadModel = /model_not_found|does not exist|model.+not.+found|404/i.test(msg);
    const friendly = isBadModel
      ? `Groq rejected the model "${model}" (retired or no access). Set a valid GROQ_MODEL env var — see https://console.groq.com/docs/models. Details: ${msg}`
      : `Groq AI is unreachable: ${msg}`;
    return res.status(200).json({
      success: true,
      connected: isRateLimit,
      reason: isRateLimit ? 'rate_limited' : 'unreachable',
      message: isRateLimit ? msg : friendly,
      model: null,
      latencyMs: Date.now() - started,
      rateLimited: isRateLimit,
      checkedAt: new Date().toISOString()
    });
  }
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
  const { scenarioType, numberOfScenarios, numberOfSteps, areaPath, assignedTo, state, model } = options;

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
      model: model || GROQ_MODEL,
      temperature: 0.5,
      max_tokens: Math.min(4000, maxOutputFor(model))
    });

    const parsed = parseJson(response.choices[0]?.message?.content || '');
    return formatTestCases(parsed, scenarioType, areaPath, assignedTo, state);
  } catch (error) {
    console.error('Groq error:', error);
    return fallbackTestCases(criteria, scenarioType, numberOfScenarios, numberOfSteps, areaPath, assignedTo, state);
  }
}

async function generateComprehensiveTestCases(criteria, options) {
  const { areaPath, assignedTo, state, model } = options;

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
      model: model || GROQ_MODEL,
      temperature: 0.4,
      max_tokens: Math.min(6000, maxOutputFor(model))
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