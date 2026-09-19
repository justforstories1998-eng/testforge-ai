const Groq = require('groq-sdk');
const rateLimiter = require('./rateLimiter');

// NOTE: `llama-3.3-70b-versatile` was shut down by Groq on 2026-08-16.
// Groq's recommended production replacement is `openai/gpt-oss-120b`.
// Override per-environment with the GROQ_MODEL env var.
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// ═══════════════════════════════════════════════════════════
// MODEL REGISTRY — single source of truth for supported models.
// `vision: true` models accept image_url content parts.
// ═══════════════════════════════════════════════════════════
const SUPPORTED_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', vision: false, maxOutput: 6000, reasoning: 'effort' },
  // qwen tier caps output tokens per minute (~1000 OTPM) — keep requests small.
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B', vision: true, maxOutput: 900, reasoning: 'toggle' },
];

// Reasoning levels offered in the UI for every model.
const REASONING_LEVELS = ['off', 'low', 'medium', 'high'];

function resolveReasoning(requested) {
  if (!requested) return 'medium';
  const lvl = String(requested).toLowerCase();
  if (!REASONING_LEVELS.includes(lvl)) {
    throw new Error(`Invalid reasoning level "${requested}". Use: ${REASONING_LEVELS.join(', ')}`);
  }
  return lvl;
}

/**
 * Map a UI reasoning level to real Groq request params.
 * Groq reality (console.groq.com/docs/reasoning):
 * - gpt-oss family: reasoning_effort low/medium/high (omit = model default).
 * - Qwen family: reasoning_effort accepts ONLY "none" (off) or "default" (on).
 *   Low/Medium/High still differ via `promptHint` — an instruction appended
 *   to the system prompt that genuinely changes answer depth.
 */
function reasoningRequestParams(modelId, level = 'medium') {
  const lvl = REASONING_LEVELS.includes(level) ? level : 'medium';
  const isGptOss = String(modelId || '').startsWith('openai/gpt-oss');
  if (isGptOss) {
    return {
      apiParams: lvl === 'off' ? {} : { reasoning_effort: lvl },
      promptHint: '',
    };
  }
  const hints = {
    off: '',
    low: 'Be concise: minimal elaboration, shortest correct answer.',
    medium: '',
    high: 'Reason step by step internally before answering; be thorough and precise.',
  };
  return {
    apiParams: { reasoning_effort: lvl === 'off' ? 'none' : 'default' },
    promptHint: hints[lvl] || '',
  };
}

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

function modelSupportsVision(modelId) {
  const found = SUPPORTED_MODELS.find((m) => m.id === modelId);
  return !!found?.vision;
}

// Validated model id or throws (controller maps to 400).
function resolveModel(requested) {
  if (!requested) {
    return getSupportedModels().defaultModel;
  }
  const found = SUPPORTED_MODELS.find((m) => m.id === requested);
  if (!found) {
    throw new Error(
      `Unsupported model "${requested}". Supported: ${SUPPORTED_MODELS.map((m) => m.id).join(', ')}`
    );
  }
  return found.id;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Helper function to make rate-limited API calls
async function makeGroqRequest(messages, options = {}) {
  rateLimiter.checkLimit();
  
  const {
    model = GROQ_MODEL,
    temperature = 0.5,
    maxTokens = 2000,
    reasoning = 'medium'
  } = options;

  const completion = await groq.chat.completions.create({
    messages,
    model,
    temperature,
    max_tokens: Math.min(maxTokens, maxOutputFor(model)),
    ...reasoningRequestParams(model, reasoning).apiParams,
  });

  return completion.choices[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════
// COMPREHENSIVE TEST CASE GENERATION (All Scenarios Mode)
// ═══════════════════════════════════════════════════════════

async function generateComprehensiveTestCases(acceptanceCriteria, options = {}) {
  const {
    priority = 'High',
    environment = 'Testing',
    platforms = ['Web'],
    areaPath = 'Subscription/Billing/Data',
    assignedTo = 'Unassigned',
    state = 'New',
    model,
    reasoning
  } = options;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 COMPREHENSIVE MODE: Deep Analysis of Acceptance Criteria');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 Acceptance Criteria:', acceptanceCriteria);
  console.log('📊 Rate Limit Status:', rateLimiter.getStatus());
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Step 1: Deep analysis of acceptance criteria
    console.log('\n📖 STEP 1: Performing deep analysis...');
    const analysis = await performDeepAnalysis(acceptanceCriteria, options.model, options.reasoning);
    
    if (!analysis) {
      throw new Error('Failed to analyze acceptance criteria');
    }

    console.log('\n📊 ANALYSIS COMPLETE:');
    console.log(`   📌 Requirements Found: ${analysis.requirements.length}`);
    console.log(`   ✓ Positive Scenarios: ${analysis.positiveScenarios.length}`);
    console.log(`   ✗ Negative Scenarios: ${analysis.negativeScenarios.length}`);
    console.log(`   ⚡ Boundary Scenarios: ${analysis.boundaryScenarios.length}`);
    console.log(`   🔍 Edge Cases: ${analysis.edgeCases.length}`);

    // Step 2: Generate all test cases based on analysis
    console.log('\n📝 STEP 2: Generating comprehensive test cases...');
    
    const allTestCases = [];

    // Generate Positive Test Cases
    if (analysis.positiveScenarios.length > 0) {
      console.log('\n   ✓ Generating Positive test cases...');
      const positiveTests = await generateTestCasesFromScenarios(
        analysis.positiveScenarios,
        'Positive',
        acceptanceCriteria,
        { areaPath, assignedTo, state, model, reasoning }
      );
      allTestCases.push(...positiveTests);
      console.log(`   ✓ Generated ${positiveTests.filter(t => t.workItemType === 'Test Case').length} Positive scenarios`);
    }

    // Generate Negative Test Cases
    if (analysis.negativeScenarios.length > 0) {
      console.log('\n   ✗ Generating Negative test cases...');
      const negativeTests = await generateTestCasesFromScenarios(
        analysis.negativeScenarios,
        'Negative',
        acceptanceCriteria,
        { areaPath, assignedTo, state, model, reasoning }
      );
      allTestCases.push(...negativeTests);
      console.log(`   ✗ Generated ${negativeTests.filter(t => t.workItemType === 'Test Case').length} Negative scenarios`);
    }

    // Generate Boundary Test Cases
    if (analysis.boundaryScenarios.length > 0) {
      console.log('\n   ⚡ Generating Boundary test cases...');
      const boundaryTests = await generateTestCasesFromScenarios(
        analysis.boundaryScenarios,
        'Boundary',
        acceptanceCriteria,
        { areaPath, assignedTo, state, model, reasoning }
      );
      allTestCases.push(...boundaryTests);
      console.log(`   ⚡ Generated ${boundaryTests.filter(t => t.workItemType === 'Test Case').length} Boundary scenarios`);
    }

    // Generate Edge Case Test Cases
    if (analysis.edgeCases.length > 0) {
      console.log('\n   🔍 Generating Edge Case test cases...');
      const edgeTests = await generateTestCasesFromScenarios(
        analysis.edgeCases,
        'Edge',
        acceptanceCriteria,
        { areaPath, assignedTo, state, model, reasoning }
      );
      allTestCases.push(...edgeTests);
      console.log(`   🔍 Generated ${edgeTests.filter(t => t.workItemType === 'Test Case').length} Edge Case scenarios`);
    }

    const totalScenarios = allTestCases.filter(t => t.workItemType === 'Test Case').length;
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`✅ COMPREHENSIVE GENERATION COMPLETE`);
    console.log(`   Total Scenarios: ${totalScenarios}`);
    console.log(`   Total Rows: ${allTestCases.length}`);
    console.log('📊 Rate Limit Status:', rateLimiter.getStatus());
    console.log('═══════════════════════════════════════════════════════════');

    return allTestCases;

  } catch (error) {
    console.error('❌ Error in comprehensive generation:', error.message);
    
    // Check if it's a rate limit error
    if (error.message.includes('Rate limit') || error.message.includes('rate limit')) {
      throw error; // Re-throw rate limit errors
    }
    
    console.log('🔄 Falling back to manual analysis...');
    return generateComprehensiveFallback(acceptanceCriteria, areaPath, assignedTo, state);
  }
}

async function performDeepAnalysis(acceptanceCriteria, model, reasoning) {
  const prompt = `You are an expert QA analyst. Analyze this acceptance criteria THOROUGHLY and identify ALL possible test scenarios.

READ EVERY SINGLE WORD CAREFULLY:
"""
${acceptanceCriteria}
"""

Extract and categorize ALL testable scenarios:

1. REQUIREMENTS: List every single requirement/feature mentioned (what the system MUST do)
2. POSITIVE SCENARIOS: Happy path tests (valid inputs, correct user flows, successful operations)
3. NEGATIVE SCENARIOS: Error handling tests (invalid inputs, unauthorized access, failed operations)
4. BOUNDARY SCENARIOS: Limit tests (min/max values, character limits, empty/full states)
5. EDGE CASES: Unusual but valid scenarios (concurrent users, special characters, timezone issues)

For each scenario, provide a SPECIFIC test scenario description.

Return ONLY this JSON structure (no markdown, no explanation):
{
  "requirements": [
    "requirement 1 extracted from criteria",
    "requirement 2 extracted from criteria"
  ],
  "positiveScenarios": [
    "Verify user can successfully login with valid email and password",
    "Verify user is redirected to dashboard after successful login"
  ],
  "negativeScenarios": [
    "Verify system shows error when user enters invalid email format",
    "Verify system blocks login after 3 failed attempts"
  ],
  "boundaryScenarios": [
    "Verify system accepts email with exactly 254 characters (max length)",
    "Verify system rejects password with less than 8 characters (min length)"
  ],
  "edgeCases": [
    "Verify login works when user has special characters in password",
    "Verify session handling when user opens multiple browser tabs"
  ]
}

IMPORTANT:
- Read EVERY word in the acceptance criteria
- Do NOT miss any requirement or condition
- Each scenario should be SPECIFIC and TESTABLE
- Minimum 2 scenarios per category
- All scenarios must start with "Verify"`;

  try {
    const response = await makeGroqRequest(
      [
        {
          role: 'system',
          content: 'You are an expert QA analyst who thoroughly analyzes requirements. Output ONLY valid JSON. No markdown code blocks. No explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      { temperature: 0.4, maxTokens: 4000, model, reasoning }
    );

    console.log('\n📄 Raw Analysis Response (first 500 chars):', response.substring(0, 500));
    
    // Clean the response
    const cleaned = cleanJsonResponse(response);
    const analysis = JSON.parse(cleaned);
    
    // Validate and ensure all arrays exist with minimum content
    const validated = {
      requirements: ensureArray(analysis.requirements, 1),
      positiveScenarios: ensureArray(analysis.positiveScenarios, 2),
      negativeScenarios: ensureArray(analysis.negativeScenarios, 2),
      boundaryScenarios: ensureArray(analysis.boundaryScenarios, 1),
      edgeCases: ensureArray(analysis.edgeCases, 1)
    };

    // If we got very few scenarios, enhance with manual extraction
    if (validated.positiveScenarios.length < 2) {
      const manualAnalysis = extractScenariosManually(acceptanceCriteria);
      validated.positiveScenarios = [...validated.positiveScenarios, ...manualAnalysis.positiveScenarios];
      validated.negativeScenarios = [...validated.negativeScenarios, ...manualAnalysis.negativeScenarios];
    }

    return validated;

  } catch (error) {
    console.error('❌ Error in deep analysis:', error.message);
    
    // Check if it's a rate limit error
    if (error.message.includes('Rate limit')) {
      throw error;
    }
    
    // Fall back to manual extraction
    return extractScenariosManually(acceptanceCriteria);
  }
}

function extractScenariosManually(acceptanceCriteria) {
  console.log('📝 Performing manual scenario extraction...');
  
  const text = acceptanceCriteria.toLowerCase();
  const sentences = acceptanceCriteria.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
  
  const requirements = sentences.map(s => s.trim());
  
  const positiveScenarios = [];
  const negativeScenarios = [];
  const boundaryScenarios = [];
  const edgeCases = [];

  // Extract keywords and generate scenarios
  const keywords = {
    login: ['Verify user can login with valid credentials', 'Verify successful authentication redirects to dashboard'],
    register: ['Verify user can register with valid details', 'Verify registration confirmation is sent'],
    password: ['Verify password validation accepts valid passwords', 'Verify password change functionality works'],
    email: ['Verify email validation accepts valid email format', 'Verify email notification is sent'],
    submit: ['Verify form submission with valid data succeeds', 'Verify submission confirmation is displayed'],
    save: ['Verify data is saved correctly', 'Verify save confirmation message appears'],
    delete: ['Verify item can be deleted successfully', 'Verify deletion confirmation is required'],
    update: ['Verify item can be updated successfully', 'Verify update reflects immediately'],
    search: ['Verify search returns correct results', 'Verify search works with partial keywords'],
    filter: ['Verify filter narrows results correctly', 'Verify multiple filters work together'],
    upload: ['Verify file upload succeeds with valid file', 'Verify upload progress is displayed'],
    download: ['Verify file download works correctly', 'Verify downloaded file is not corrupted'],
    display: ['Verify information is displayed correctly', 'Verify display updates in real-time'],
    validate: ['Verify validation works for all required fields', 'Verify validation messages are clear'],
    error: ['Verify error messages are user-friendly', 'Verify errors are logged properly'],
    access: ['Verify authorized users can access the feature', 'Verify access permissions are enforced'],
    user: ['Verify user actions are tracked', 'Verify user preferences are saved'],
    data: ['Verify data integrity is maintained', 'Verify data is encrypted properly'],
    api: ['Verify API responds with correct status codes', 'Verify API handles errors gracefully'],
    button: ['Verify button click triggers correct action', 'Verify button states change appropriately'],
    form: ['Verify form accepts valid input', 'Verify form validation prevents invalid submission'],
    page: ['Verify page loads within acceptable time', 'Verify page elements render correctly'],
    message: ['Verify success messages are displayed', 'Verify messages disappear after timeout'],
    notification: ['Verify notifications are sent', 'Verify notification preferences are respected']
  };

  // Generate scenarios based on keywords found
  for (const [keyword, scenarios] of Object.entries(keywords)) {
    if (text.includes(keyword)) {
      positiveScenarios.push(...scenarios);
      negativeScenarios.push(`Verify system handles invalid ${keyword} gracefully`);
      negativeScenarios.push(`Verify appropriate error message for failed ${keyword}`);
    }
  }

  // Add scenarios from sentences
  sentences.forEach((sentence, index) => {
    const cleanSentence = sentence.trim();
    if (cleanSentence.length > 15) {
      if (cleanSentence.toLowerCase().includes('should') || 
          cleanSentence.toLowerCase().includes('must') ||
          cleanSentence.toLowerCase().includes('can')) {
        positiveScenarios.push(`Verify ${cleanSentence.replace(/^(the |a |an )/i, '').substring(0, 100)}`);
      }
      
      if (cleanSentence.toLowerCase().includes('valid') ||
          cleanSentence.toLowerCase().includes('required') ||
          cleanSentence.toLowerCase().includes('must')) {
        negativeScenarios.push(`Verify system rejects invalid input for: ${cleanSentence.substring(0, 60)}`);
      }
    }
  });

  // Add boundary scenarios
  if (text.includes('length') || text.includes('limit') || text.includes('max') || text.includes('min')) {
    boundaryScenarios.push('Verify system accepts minimum allowed input length');
    boundaryScenarios.push('Verify system accepts maximum allowed input length');
    boundaryScenarios.push('Verify system rejects input exceeding maximum length');
  } else {
    boundaryScenarios.push('Verify system handles empty input appropriately');
    boundaryScenarios.push('Verify system handles very long input appropriately');
  }

  // Add edge cases
  edgeCases.push('Verify system handles special characters in input');
  edgeCases.push('Verify system handles concurrent user actions');
  if (text.includes('time') || text.includes('date')) {
    edgeCases.push('Verify system handles different timezone scenarios');
  }

  return {
    requirements: [...new Set(requirements)].slice(0, 10),
    positiveScenarios: [...new Set(positiveScenarios)].slice(0, 8),
    negativeScenarios: [...new Set(negativeScenarios)].slice(0, 6),
    boundaryScenarios: [...new Set(boundaryScenarios)].slice(0, 4),
    edgeCases: [...new Set(edgeCases)].slice(0, 4)
  };
}

async function generateTestCasesFromScenarios(scenarios, scenarioType, acceptanceCriteria, options) {
  const { areaPath, assignedTo, state, model, reasoning } = options;
  const allTestCases = [];

  for (const scenario of scenarios) {
    try {
      const steps = await generateStepsForScenario(scenario, scenarioType, acceptanceCriteria, model, reasoning);
      
      allTestCases.push({
        id: '',
        workItemType: 'Test Case',
        title: ensureVerifyPrefix(scenario),
        testStep: '',
        stepAction: '',
        stepExpected: '',
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: scenarioType
      });

      steps.forEach((step, index) => {
        allTestCases.push({
          id: '',
          workItemType: '',
          title: '',
          testStep: String(index + 1),
          stepAction: step.action,
          stepExpected: step.expected,
          areaPath: areaPath,
          assignedTo: assignedTo,
          state: state,
          scenarioType: scenarioType
        });
      });

    } catch (error) {
      console.error(`   ⚠️ Error generating steps for: ${scenario.substring(0, 50)}...`);
      
      // Check if rate limit error
      if (error.message.includes('Rate limit')) {
        // Use fallback steps without API call
        const fallbackSteps = getContextualSteps(scenario, scenarioType);
        
        allTestCases.push({
          id: '',
          workItemType: 'Test Case',
          title: ensureVerifyPrefix(scenario),
          testStep: '',
          stepAction: '',
          stepExpected: '',
          areaPath: areaPath,
          assignedTo: assignedTo,
          state: state,
          scenarioType: scenarioType
        });

        fallbackSteps.forEach((step, index) => {
          allTestCases.push({
            id: '',
            workItemType: '',
            title: '',
            testStep: String(index + 1),
            stepAction: step.action,
            stepExpected: step.expected,
            areaPath: areaPath,
            assignedTo: assignedTo,
            state: state,
            scenarioType: scenarioType
          });
        });
      } else {
        // Use fallback steps
        const fallbackSteps = getFallbackStepsForType(scenarioType);
        
        allTestCases.push({
          id: '',
          workItemType: 'Test Case',
          title: ensureVerifyPrefix(scenario),
          testStep: '',
          stepAction: '',
          stepExpected: '',
          areaPath: areaPath,
          assignedTo: assignedTo,
          state: state,
          scenarioType: scenarioType
        });

        fallbackSteps.forEach((step, index) => {
          allTestCases.push({
            id: '',
            workItemType: '',
            title: '',
            testStep: String(index + 1),
            stepAction: step.action,
            stepExpected: step.expected,
            areaPath: areaPath,
            assignedTo: assignedTo,
            state: state,
            scenarioType: scenarioType
          });
        });
      }
    }
  }

  return allTestCases;
}

async function generateStepsForScenario(scenario, scenarioType, acceptanceCriteria, model, reasoning) {
  const prompt = `Generate detailed test steps for this specific test case:

TEST CASE: "${scenario}"
SCENARIO TYPE: ${scenarioType}
CONTEXT: "${acceptanceCriteria.substring(0, 300)}"

Create 4-6 SPECIFIC and DETAILED test steps. Each step must have:
- action: EXACTLY what the tester should do (be specific with UI elements, data, clicks)
- expected: EXACTLY what should happen after the action (be specific with messages, states, behaviors)

${scenarioType === 'Positive' ? 'Steps should verify the happy path works correctly.' : ''}
${scenarioType === 'Negative' ? 'Steps should verify errors are handled properly.' : ''}
${scenarioType === 'Boundary' ? 'Steps should test limits and thresholds.' : ''}
${scenarioType === 'Edge' ? 'Steps should test unusual but valid scenarios.' : ''}

Return ONLY this JSON array (no markdown, no explanation):
[
  {"action": "Navigate to login page by clicking Login button in header", "expected": "Login page displays with email field, password field, and Submit button"},
  {"action": "Enter valid email 'user@example.com' in email field", "expected": "Email is accepted, no validation error shown"}
]`;

  try {
    const response = await makeGroqRequest(
      [
        {
          role: 'system',
          content: 'You are an expert QA engineer. Generate specific, detailed test steps. Output ONLY valid JSON array. No markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      { temperature: 0.5, maxTokens: 2000, model, reasoning }
    );

    const cleaned = cleanJsonResponse(response);
    const steps = JSON.parse(cleaned);
    
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('Invalid steps array');
    }

    return steps.map((step, index) => ({
      action: step.action || `Step ${index + 1}: Perform test action`,
      expected: step.expected || `Expected result for step ${index + 1}`
    }));

  } catch (error) {
    console.error('   ⚠️ Step generation error, using contextual fallback');
    return getContextualSteps(scenario, scenarioType);
  }
}

function getContextualSteps(scenario, scenarioType) {
  const scenarioLower = scenario.toLowerCase();
  
  // Login related
  if (scenarioLower.includes('login') || scenarioLower.includes('sign in') || scenarioLower.includes('authenticate')) {
    if (scenarioType === 'Positive') {
      return [
        { action: 'Navigate to the login page', expected: 'Login page loads with email and password fields visible' },
        { action: 'Enter valid email address in the email field', expected: 'Email is accepted without validation errors' },
        { action: 'Enter valid password in the password field', expected: 'Password is masked and accepted' },
        { action: 'Click the Login/Submit button', expected: 'Form is submitted, loading indicator appears' },
        { action: 'Wait for authentication to complete', expected: 'User is logged in and redirected to dashboard' }
      ];
    } else if (scenarioType === 'Negative') {
      return [
        { action: 'Navigate to the login page', expected: 'Login page loads successfully' },
        { action: 'Enter invalid email format (e.g., "notanemail")', expected: 'Validation error appears for email field' },
        { action: 'Enter incorrect password', expected: 'Password field accepts input' },
        { action: 'Click the Login/Submit button', expected: 'Error message displays: "Invalid credentials"' },
        { action: 'Verify user remains on login page', expected: 'User is not logged in, login form is still visible' }
      ];
    }
  }

  // Registration related
  if (scenarioLower.includes('register') || scenarioLower.includes('sign up') || scenarioLower.includes('create account')) {
    if (scenarioType === 'Positive') {
      return [
        { action: 'Navigate to the registration page', expected: 'Registration form loads with all required fields' },
        { action: 'Enter valid name in the name field', expected: 'Name is accepted' },
        { action: 'Enter valid email in the email field', expected: 'Email format is validated and accepted' },
        { action: 'Enter valid password meeting all requirements', expected: 'Password strength indicator shows acceptable' },
        { action: 'Click Register/Submit button', expected: 'Account is created, confirmation message appears' }
      ];
    }
  }

  // Form submission related
  if (scenarioLower.includes('submit') || scenarioLower.includes('form') || scenarioLower.includes('save')) {
    if (scenarioType === 'Positive') {
      return [
        { action: 'Navigate to the form page', expected: 'Form loads with all fields visible' },
        { action: 'Fill in all required fields with valid data', expected: 'All fields accept the input' },
        { action: 'Fill in optional fields if needed', expected: 'Optional fields accept input' },
        { action: 'Click Submit/Save button', expected: 'Form is submitted successfully' },
        { action: 'Verify confirmation', expected: 'Success message appears, data is saved' }
      ];
    } else if (scenarioType === 'Negative') {
      return [
        { action: 'Navigate to the form page', expected: 'Form loads successfully' },
        { action: 'Leave required fields empty', expected: 'Fields are empty' },
        { action: 'Click Submit button', expected: 'Validation errors appear for required fields' },
        { action: 'Enter invalid data in fields', expected: 'Field-specific validation errors appear' },
        { action: 'Verify form is not submitted', expected: 'User remains on form, no data saved' }
      ];
    }
  }

  // Search related
  if (scenarioLower.includes('search') || scenarioLower.includes('find') || scenarioLower.includes('filter')) {
    return [
      { action: 'Navigate to the page with search functionality', expected: 'Search field/bar is visible' },
      { action: 'Enter search query in the search field', expected: 'Query is accepted in the field' },
      { action: 'Click Search button or press Enter', expected: 'Search is initiated, loading indicator may appear' },
      { action: 'Wait for results to load', expected: 'Search results are displayed' },
      { action: 'Verify results match search criteria', expected: 'Results are relevant to the search query' }
    ];
  }

  // CRUD operations
  if (scenarioLower.includes('create') || scenarioLower.includes('add') || scenarioLower.includes('new')) {
    return [
      { action: 'Navigate to the creation page/form', expected: 'Create/Add form is displayed' },
      { action: 'Enter all required information', expected: 'Information is accepted in all fields' },
      { action: 'Click Create/Add/Save button', expected: 'Item is created successfully' },
      { action: 'Verify the new item appears in the list', expected: 'New item is visible with correct data' }
    ];
  }

  if (scenarioLower.includes('delete') || scenarioLower.includes('remove')) {
    return [
      { action: 'Navigate to the item to be deleted', expected: 'Item is visible with delete option' },
      { action: 'Click Delete/Remove button', expected: 'Confirmation dialog appears' },
      { action: 'Confirm the deletion', expected: 'Item is deleted, success message appears' },
      { action: 'Verify item is removed from list', expected: 'Item no longer appears in the list' }
    ];
  }

  if (scenarioLower.includes('update') || scenarioLower.includes('edit') || scenarioLower.includes('modify')) {
    return [
      { action: 'Navigate to the item to be edited', expected: 'Item details are displayed with edit option' },
      { action: 'Click Edit button', expected: 'Edit form opens with current values' },
      { action: 'Modify the desired fields', expected: 'Changes are reflected in the form' },
      { action: 'Click Save/Update button', expected: 'Changes are saved, success message appears' },
      { action: 'Verify changes are persisted', expected: 'Updated values are displayed correctly' }
    ];
  }

  // Default steps based on scenario type
  return getFallbackStepsForType(scenarioType);
}

function getFallbackStepsForType(scenarioType) {
  const stepsByType = {
    'Positive': [
      { action: 'Navigate to the relevant page/feature', expected: 'Page loads successfully with all elements visible' },
      { action: 'Perform the prerequisite setup if needed', expected: 'System is in the correct state' },
      { action: 'Execute the main action with valid inputs', expected: 'Action is accepted without errors' },
      { action: 'Complete the workflow/process', expected: 'Process completes successfully' },
      { action: 'Verify the expected outcome', expected: 'Success message appears, expected result is achieved' }
    ],
    'Negative': [
      { action: 'Navigate to the relevant page/feature', expected: 'Page loads successfully' },
      { action: 'Attempt action with invalid/missing inputs', expected: 'System detects invalid input' },
      { action: 'Submit or execute the action', expected: 'Appropriate error message is displayed' },
      { action: 'Verify system prevents the invalid action', expected: 'Action is blocked, no unintended changes occur' },
      { action: 'Confirm user can correct and retry', expected: 'User can fix errors and try again' }
    ],
    'Boundary': [
      { action: 'Navigate to the feature being tested', expected: 'Feature is accessible' },
      { action: 'Test with minimum allowed value/length', expected: 'Minimum value is accepted' },
      { action: 'Test with maximum allowed value/length', expected: 'Maximum value is accepted' },
      { action: 'Test with value just below minimum', expected: 'Value is rejected with appropriate message' },
      { action: 'Test with value just above maximum', expected: 'Value is rejected with appropriate message' }
    ],
    'Edge': [
      { action: 'Set up the edge case preconditions', expected: 'System is in required state' },
      { action: 'Trigger the edge case scenario', expected: 'System handles the edge case' },
      { action: 'Verify system behavior under edge conditions', expected: 'No errors or crashes occur' },
      { action: 'Check data integrity after edge case', expected: 'Data remains valid and consistent' },
      { action: 'Verify recovery if applicable', expected: 'System can return to normal operation' }
    ]
  };

  return stepsByType[scenarioType] || stepsByType['Positive'];
}

function generateComprehensiveFallback(acceptanceCriteria, areaPath, assignedTo, state) {
  console.log('🔄 Generating comprehensive fallback...');
  
  const analysis = extractScenariosManually(acceptanceCriteria);
  const allTestCases = [];

  const typeConfigs = [
    { type: 'Positive', scenarios: analysis.positiveScenarios },
    { type: 'Negative', scenarios: analysis.negativeScenarios },
    { type: 'Boundary', scenarios: analysis.boundaryScenarios },
    { type: 'Edge', scenarios: analysis.edgeCases }
  ];

  for (const config of typeConfigs) {
    for (const scenario of config.scenarios) {
      const steps = getContextualSteps(scenario, config.type);
      
      allTestCases.push({
        id: '',
        workItemType: 'Test Case',
        title: ensureVerifyPrefix(scenario),
        testStep: '',
        stepAction: '',
        stepExpected: '',
        areaPath,
        assignedTo,
        state,
        scenarioType: config.type
      });

      steps.forEach((step, index) => {
        allTestCases.push({
          id: '',
          workItemType: '',
          title: '',
          testStep: String(index + 1),
          stepAction: step.action,
          stepExpected: step.expected,
          areaPath,
          assignedTo,
          state,
          scenarioType: config.type
        });
      });
    }
  }

  return allTestCases;
}

// ═══════════════════════════════════════════════════════════
// STANDARD TEST CASE GENERATION (Single Scenario Type)
// ═══════════════════════════════════════════════════════════

async function generateTestCasesWithGroq(acceptanceCriteria, options = {}) {
  const {
    scenarioType = 'Positive',
    numberOfScenarios = 3,
    numberOfSteps = 4,
    environment = 'Testing',
    platforms = ['Web'],
    areaPath = 'Subscription/Billing/Data',
    assignedTo = 'Unassigned',
    state = 'New',
    model,
    reasoning
  } = options;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 STANDARD MODE: Generating Test Cases');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📊 Scenario Type: ${scenarioType}`);
  console.log(`📊 Number of Scenarios: ${numberOfScenarios}`);
  console.log(`📊 Steps per Scenario: ${numberOfSteps}`);
  console.log('📊 Rate Limit Status:', rateLimiter.getStatus());
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const titles = await generateTitlesForType(acceptanceCriteria, scenarioType, numberOfScenarios, platforms, model, reasoning);
    
    if (!titles || titles.length === 0) {
      throw new Error('Failed to generate test case titles');
    }

    console.log(`\n📝 Generated ${titles.length} titles`);

    const allTestCases = [];
    
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      console.log(`   ${i + 1}. ${title.substring(0, 60)}...`);
      
      const steps = await generateStepsForScenario(title, scenarioType, acceptanceCriteria, model, reasoning);
      const limitedSteps = steps.slice(0, numberOfSteps);
      
      while (limitedSteps.length < numberOfSteps) {
        const fallbackSteps = getFallbackStepsForType(scenarioType);
        limitedSteps.push(fallbackSteps[limitedSteps.length % fallbackSteps.length]);
      }
      
      allTestCases.push({
        id: '',
        workItemType: 'Test Case',
        title: title,
        testStep: '',
        stepAction: '',
        stepExpected: '',
        areaPath,
        assignedTo,
        state,
        scenarioType
      });
      
      limitedSteps.forEach((step, index) => {
        allTestCases.push({
          id: '',
          workItemType: '',
          title: '',
          testStep: String(index + 1),
          stepAction: step.action,
          stepExpected: step.expected,
          areaPath,
          assignedTo,
          state,
          scenarioType
        });
      });
    }
    
    console.log(`\n✅ Generated ${allTestCases.length} total rows`);
    console.log('📊 Rate Limit Status:', rateLimiter.getStatus());
    return allTestCases;
    
  } catch (error) {
    console.error('❌ Error in standard generation:', error.message);
    
    if (error.message.includes('Rate limit')) {
      throw error;
    }
    
    return generateStandardFallback(acceptanceCriteria, scenarioType, numberOfScenarios, numberOfSteps, areaPath, assignedTo, state);
  }
}

async function generateTitlesForType(acceptanceCriteria, scenarioType, count, platforms, model, reasoning) {
  const typeDescriptions = {
    'Positive': 'successful/valid/working scenarios where everything works as expected',
    'Negative': 'error handling/invalid input/failure scenarios where the system should reject or handle errors',
    'Boundary': 'limit testing/min-max values/threshold scenarios',
    'Edge': 'unusual but valid/corner case/rare scenarios'
  };

  const prompt = `Generate exactly ${count} ${scenarioType} test case titles for this acceptance criteria:

"${acceptanceCriteria}"

SCENARIO TYPE: ${scenarioType}
FOCUS: ${typeDescriptions[scenarioType] || 'general testing scenarios'}
PLATFORMS: ${platforms.join(', ')}

REQUIREMENTS:
1. Each title MUST start with "Verify"
2. Each title must be SPECIFIC and DETAILED
3. Each title must be DIFFERENT (test different aspects)
4. Maximum 120 characters per title
5. Titles must be relevant to the acceptance criteria

Return ONLY a JSON array of strings:
["Verify title 1", "Verify title 2", "Verify title 3"]`;

  try {
    const response = await makeGroqRequest(
      [
        {
          role: 'system',
          content: 'You are an expert QA engineer. Output ONLY valid JSON arrays. No markdown, no explanation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      { temperature: 0.6, maxTokens: 2000, model, reasoning }
    );

    const cleaned = cleanJsonResponse(response);
    const titles = JSON.parse(cleaned);
    
    return titles.slice(0, count).map(title => {
      let cleanTitle = String(title).trim();
      cleanTitle = ensureVerifyPrefix(cleanTitle);
      return cleanTitle.length > 120 ? cleanTitle.substring(0, 117) + '...' : cleanTitle;
    });
    
  } catch (error) {
    console.error('❌ Error generating titles:', error.message);
    
    if (error.message.includes('Rate limit')) {
      throw error;
    }
    
    return generateFallbackTitles(acceptanceCriteria, scenarioType, count);
  }
}

function generateFallbackTitles(acceptanceCriteria, scenarioType, count) {
  const shortCriteria = acceptanceCriteria.length > 40 
    ? acceptanceCriteria.substring(0, 40).trim() + '...'
    : acceptanceCriteria;

  const prefixes = {
    'Positive': [
      'Verify successful',
      'Verify user can',
      'Verify system correctly',
      'Verify valid',
      'Verify proper'
    ],
    'Negative': [
      'Verify error handling for',
      'Verify system rejects',
      'Verify validation fails for',
      'Verify invalid input is blocked for',
      'Verify error message when'
    ],
    'Boundary': [
      'Verify minimum limit for',
      'Verify maximum limit for',
      'Verify boundary handling for',
      'Verify threshold behavior for',
      'Verify limit validation for'
    ],
    'Edge': [
      'Verify edge case handling for',
      'Verify unusual scenario for',
      'Verify corner case for',
      'Verify special condition for',
      'Verify rare scenario for'
    ]
  };

  const typePrefixes = prefixes[scenarioType] || prefixes['Positive'];
  const titles = [];

  for (let i = 0; i < count; i++) {
    const prefix = typePrefixes[i % typePrefixes.length];
    titles.push(`${prefix} ${shortCriteria}`);
  }

  return titles;
}

function generateStandardFallback(acceptanceCriteria, scenarioType, numberOfScenarios, numberOfSteps, areaPath, assignedTo, state) {
  console.log('🔄 Generating standard fallback...');
  
  const titles = generateFallbackTitles(acceptanceCriteria, scenarioType, numberOfScenarios);
  const allTestCases = [];

  for (const title of titles) {
    const steps = getFallbackStepsForType(scenarioType).slice(0, numberOfSteps);
    
    allTestCases.push({
      id: '',
      workItemType: 'Test Case',
      title,
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath,
      assignedTo,
      state,
      scenarioType
    });

    steps.forEach((step, index) => {
      allTestCases.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(index + 1),
        stepAction: step.action,
        stepExpected: step.expected,
        areaPath,
        assignedTo,
        state,
        scenarioType
      });
    });
  }

  return allTestCases;
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function cleanJsonResponse(response) {
  let cleaned = response.trim();
  
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  
  const arrayStart = cleaned.indexOf('[');
  const objectStart = cleaned.indexOf('{');
  const arrayEnd = cleaned.lastIndexOf(']');
  const objectEnd = cleaned.lastIndexOf('}');
  
  let startIndex, endIndex;
  
  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    startIndex = arrayStart;
    endIndex = arrayEnd;
  } else if (objectStart !== -1) {
    startIndex = objectStart;
    endIndex = objectEnd;
  } else {
    return cleaned;
  }
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }
  
  return cleaned;
}

function ensureArray(arr, minLength = 0) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => item && String(item).trim().length > 0);
}

function ensureVerifyPrefix(title) {
  let cleanTitle = String(title).trim();
  if (!cleanTitle.toLowerCase().startsWith('verify')) {
    cleanTitle = 'Verify ' + cleanTitle;
  }
  if (cleanTitle.startsWith('Verify ') && cleanTitle.length > 7) {
    cleanTitle = 'Verify ' + cleanTitle.charAt(7).toUpperCase() + cleanTitle.slice(8);
  }
  return cleanTitle;
}

// Export rate limiter status function
function getRateLimitStatus() {
  return rateLimiter.getStatus();
}

// ═══════════════════════════════════════════════════════════
// GROQ CONNECTION CHECK
// Lightweight ping used by the UI to decide whether generation
// is allowed. Results are cached briefly so status polling and
// the pre-generate guard don't burn API quota.
// ═══════════════════════════════════════════════════════════

const GROQ_STATUS_CACHE_MS = 30000;
// Status cache is keyed by model id — each model is pinged independently.
let groqStatusCache = {};

async function checkGroqConnection(options = {}) {
  const { force = false, model: requestedModel } = options;
  const model = requestedModel || getSupportedModels().defaultModel;
  const now = Date.now();
  const cached = groqStatusCache[model];

  if (!force && cached && now - cached.checkedAt < GROQ_STATUS_CACHE_MS) {
    return cached.result;
  }

  if (!process.env.GROQ_API_KEY) {
    return cacheAndReturn(model, {
      connected: false,
      reason: 'missing_key',
      message: 'GROQ_API_KEY is not configured on the server.',
      model: null,
      latencyMs: 0,
      rateLimited: false,
      checkedAt: new Date().toISOString(),
    });
  }

  // If our own limiter is exhausted we know the key exists and the
  // service was reachable — report connected but rate-limited
  // without spending another API call.
  try {
    rateLimiter.checkLimit();
    // Undo the increment above: a status check must not consume quota.
    rateLimiter.minuteRequests = Math.max(0, rateLimiter.minuteRequests - 1);
    rateLimiter.dayRequests = Math.max(0, rateLimiter.dayRequests - 1);
  } catch (limitError) {
    return cacheAndReturn(model, {
      connected: true,
      reason: 'rate_limited',
      message: limitError.message,
      model,
      latencyMs: 0,
      rateLimited: true,
      checkedAt: new Date().toISOString(),
    });
  }

  const started = Date.now();
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Groq ping timed out after 10s')), 10000)
    );
    const ping = groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      model,
      temperature: 0,
      max_tokens: 5,
    });
    const response = await Promise.race([ping, timeout]);
    return cacheAndReturn(model, {
      connected: true,
      reason: 'ok',
      message: 'Groq AI is connected and responding.',
      model: response?.model || model,
      latencyMs: Date.now() - started,
      rateLimited: false,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error?.message || 'Unknown error';
    const isRateLimit = /rate limit|429|rate_limit/i.test(msg);
    const isBadModel = /model_not_found|does not exist|model.+not.+found|404/i.test(msg);
    const friendly = isBadModel
      ? `Groq rejected the model "${model}" (retired or no access). Set a valid GROQ_MODEL env var — see https://console.groq.com/docs/models. Details: ${msg}`
      : `Groq AI is unreachable: ${msg}`;
    return cacheAndReturn(model, {
      connected: isRateLimit, // key works, quota exhausted — generation fallbacks can still run
      reason: isRateLimit ? 'rate_limited' : 'unreachable',
      message: isRateLimit ? msg : friendly,
      model: null,
      latencyMs: Date.now() - started,
      rateLimited: isRateLimit,
      checkedAt: new Date().toISOString(),
    });
  }
}

function cacheAndReturn(model, result) {
  groqStatusCache[model] = { checkedAt: Date.now(), result };
  return result;
}

// ═══════════════════════════════════════════════════════════
// AI CHAT — multimodal-capable conversation helper.
// `messages` use OpenAI content-parts; the caller builds them.
// ═══════════════════════════════════════════════════════════

async function chatWithGroq(messages, options = {}) {
  const { model: requestedModel, temperature = 0.5, maxTokens = 4000, reasoning = 'medium' } = options;
  const model = resolveModel(requestedModel);
  rateLimiter.checkLimit();

  const completion = await groq.chat.completions.create({
    messages,
    model,
    temperature,
    max_tokens: Math.min(maxTokens, maxOutputFor(model)),
    ...reasoningRequestParams(model, reasoning).apiParams,
  });

  return {
    model,
    content: completion.choices[0]?.message?.content || '',
  };
}

// Validate an incoming chat image data URL. Returns approximate byte size.
function validateChatImage(dataUrl) {
  if (typeof dataUrl !== 'string') {
    throw new Error('Image must be a data URL string.');
  }
  const match = dataUrl.match(/^data:(image\/(png|jpe?g|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('Image must be a PNG, JPEG, GIF or WebP data URL.');
  }
  const approxBytes = Math.floor((match[3].length * 3) / 4);
  const MAX_BYTES = 6 * 1024 * 1024;
  if (approxBytes > MAX_BYTES) {
    throw new Error('Image is too large. Maximum size is 6 MB.');
  }
  return { mime: match[1], approxBytes };
}

// Extract a testcases-json fenced block from free-form model output.
// Returns a validated [{ title, scenarioType, steps: [{action, expected}] }]
// array, or null when the model produced plain prose.
function extractTestCasesJson(text) {
  if (!text) return null;
  const fence =
    text.match(/```testcases-json\s*([\s\S]*?)\s*```/i) ||
    text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!fence) return null;
  let parsed;
  try {
    parsed = JSON.parse(fence[1].trim());
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
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
    const allowed = ['Positive', 'Negative', 'Boundary', 'Edge'];
    const scenarioType = allowed.includes(item.scenarioType) ? item.scenarioType : 'Positive';
    cleaned.push({ title: ensureVerifyPrefix(item.title), scenarioType, steps });
  }
  return cleaned.length > 0 ? cleaned : null;
}

// Format parsed chat cases into the app's flat row shape
// (header row + step rows — identical to generated test cases).
function formatChatTestCases(parsed, meta = {}) {
  const { areaPath = '', assignedTo = '', state = '', priority = '' } = meta;
  const rows = [];
  for (const tc of parsed) {
    rows.push({
      id: '',
      workItemType: 'Test Case',
      title: tc.title,
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath,
      assignedTo,
      state,
      scenarioType: tc.scenarioType,
      ...(priority ? { priority } : {}),
    });
    tc.steps.forEach((step, i) => {
      rows.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(i + 1),
        stepAction: step.action,
        stepExpected: step.expected,
        areaPath,
        assignedTo,
        state,
        scenarioType: tc.scenarioType,
        ...(priority ? { priority } : {}),
      });
    });
  }
  return rows;
}

module.exports = { 
  generateTestCasesWithGroq,
  generateComprehensiveTestCases,
  getRateLimitStatus,
  checkGroqConnection,
  chatWithGroq,
  validateChatImage,
  extractTestCasesJson,
  formatChatTestCases,
  getSupportedModels,
  resolveModel,
  modelSupportsVision,
  maxOutputFor,
  resolveReasoning,
  reasoningRequestParams,
  REASONING_LEVELS,
  SUPPORTED_MODELS,
};