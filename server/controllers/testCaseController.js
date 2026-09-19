const TestCase = require('../models/TestCase');
const {
  generateTestCasesWithGroq,
  generateComprehensiveTestCases,
  getRateLimitStatus: getGroqRateLimitStatus,
  checkGroqConnection,
  chatWithGroq,
  validateChatImage,
  extractTestCasesJson,
  formatChatTestCases,
  getSupportedModels: getModelList,
  resolveModel,
  modelSupportsVision,
  resolveReasoning,
  reasoningRequestParams,
} = require('../services/groqService');

// @desc    List supported AI models
// @route   GET /api/testcases/models
// @access  Public
exports.getSupportedModels = async (req, res) => {
  try {
    res.status(200).json({ success: true, ...getModelList() });
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({ success: false, error: 'Failed to list models' });
  }
};

// @desc    Check whether the Groq AI backend is reachable
// @route   GET /api/testcases/groq-status
// @access  Public
exports.getGroqStatus = async (req, res) => {
  try {
    let model;
    try {
      model = resolveModel(req.query.model);
    } catch (modelError) {
      return res.status(400).json({ success: false, error: modelError.message });
    }
    const status = await checkGroqConnection({ force: req.query.fresh === '1', model });
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

// @desc    Chat with the AI assistant (criteria-aware or solo, optional image)
// @route   POST /api/testcases/chat
// @access  Public
exports.chatWithAI = async (req, res) => {
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

    // Model validation
    let model;
    try {
      model = resolveModel(requestedModel);
    } catch (modelError) {
      return res.status(400).json({ success: false, error: modelError.message });
    }

    let reasoning;
    try {
      reasoning = resolveReasoning(req.body.reasoning);
    } catch (reasoningError) {
      return res.status(400).json({ success: false, error: reasoningError.message });
    }

    if (!['criteria', 'solo'].includes(mode)) {
      return res.status(400).json({ success: false, error: 'mode must be "criteria" or "solo"' });
    }

    const cleanText = String(text || '').slice(0, 8000);
    if (!cleanText.trim() && !image) {
      return res.status(400).json({ success: false, error: 'Send a message or attach an image.' });
    }

    // Image validation + vision gating
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

    const criteria = String(acceptanceCriteria || '').slice(0, 20000);
    const cleanHistory = (Array.isArray(history) ? history : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: String(m.content || '').slice(0, 8000),
        hadImage: !!m.hadImage,
      }));

    const systemPrompt =
      mode === 'solo' ? buildSoloPrompt() : buildCriteriaPrompt(criteria, !!image);

    // Qwen exposes reasoning as on/off on Groq; Low/Medium/High refine depth
    // through this instruction (gpt-oss gets a native reasoning_effort param).
    const { promptHint } = reasoningRequestParams(model, reasoning);
    const groqMessages = [
      { role: 'system', content: promptHint ? `${systemPrompt}\n\nStyle: ${promptHint}` : systemPrompt },
    ];
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

    let result;
    try {
      result = await chatWithGroq(groqMessages, {
        model,
        temperature: mode === 'solo' ? 0.7 : 0.5,
        maxTokens: 6000,
        reasoning,
      });
    } catch (groqError) {
      if (/rate limit|429|rate_limit|request too large|quota/i.test(groqError.message || '')) {
        return res.status(429).json({ success: false, error: groqError.message, isRateLimitError: true });
      }
      throw groqError;
    }

    // In criteria mode, test-case output is extracted, formatted into the
    // app's flat row shape, saved, and loaded into the session results —
    // no reformatting needed by the user.
    let rows = null;
    let reply = result.content;
    if (mode === 'criteria') {
      const parsed = extractTestCasesJson(result.content);
      if (parsed) {
        rows = formatChatTestCases(parsed, {
          areaPath: meta.areaPath || '',
          assignedTo: meta.assignedTo || '',
          state: meta.state || '',
          priority: meta.priority || '',
        });
        for (const tcData of rows) {
          const saved = new TestCase({
            ...tcData,
            scenarioType: tcData.scenarioType || 'Positive',
            environment: 'Testing',
            platforms: ['Web'],
          });
          await saved.save();
        }
        const headerRows = rows.filter((tc) => tc.workItemType === 'Test Case').length;
        reply = result.content.replace(
          /```testcases-json[\s\S]*?```/gi,
          `> ✅ Generated ${headerRows} test scenario(s) — loaded into Session Results below.`
        );
        return res.status(200).json({
          success: true,
          model: result.model,
          reasoning,
          reply,
          testCases: rows,
          count: rows.length,
          scenarios: headerRows,
        });
      }
    }

    return res.status(200).json({
      success: true,
      model: result.model,
      reasoning,
      reply,
      testCases: null,
      count: 0,
      scenarios: 0,
    });
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ success: false, error: 'Chat failed. Please try again.', details: error.message });
  }
};

function buildSoloPrompt() {
  return `You are Test-CaseAI, a general-purpose AI assistant inside a QA test-management app.
Answer directly and helpfully. Use Markdown formatting (headings, bullets, code fences) where it improves readability.
Keep answers focused and reasonably concise. You are NOT restricted to any project context in this mode.`;
}

function buildCriteriaPrompt(criteria, hasImage) {
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

    // Model + reasoning selection (validated against the registry)
    let model;
    try {
      model = resolveModel(req.body.model);
    } catch (modelError) {
      return res.status(400).json({ error: modelError.message });
    }
    let reasoning;
    try {
      reasoning = resolveReasoning(req.body.reasoning);
    } catch (reasoningError) {
      return res.status(400).json({ error: reasoningError.message });
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
          state,
          model,
          reasoning
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
          state,
          model,
          reasoning
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
      mode: isComprehensiveMode ? 'comprehensive' : 'standard',
      model,
      reasoning
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