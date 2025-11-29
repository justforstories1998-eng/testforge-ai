const { Groq } = require('groq-sdk');

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Rate limiter (simple in-memory for serverless)
let requestCount = 0;
let lastReset = Date.now();

function checkRateLimit() {
  const now = Date.now();
  if (now - lastReset > 60000) {
    requestCount = 0;
    lastReset = now;
  }
  if (requestCount >= 25) {
    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
  }
  requestCount++;
}

// Main handler for Vercel
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // POST - Generate test cases
    if (req.method === 'POST') {
      checkRateLimit();

      const {
        acceptanceCriteria,
        scenarioType = 'Positive',
        numberOfScenarios = 3,
        numberOfSteps = 4,
        generateAllScenarios = false,
        areaPath = 'Subscription/Billing/Data',
        assignedTo = 'Unassigned',
        state = 'New'
      } = req.body;

      if (!acceptanceCriteria || acceptanceCriteria.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Please provide acceptance criteria'
        });
      }

      let testCases;

      if (generateAllScenarios) {
        testCases = await generateAllTestCases(acceptanceCriteria, areaPath, assignedTo, state);
      } else {
        testCases = await generateTestCases(
          acceptanceCriteria,
          scenarioType,
          numberOfScenarios,
          numberOfSteps,
          areaPath,
          assignedTo,
          state
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Test cases generated successfully',
        data: testCases,
        count: testCases.filter(tc => tc.workItemType === 'Test Case').length
      });
    }

    // GET - Rate limit status
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        message: 'API is working',
        rateLimit: {
          remaining: Math.max(0, 25 - requestCount),
          resetIn: Math.max(0, 60 - Math.floor((Date.now() - lastReset) / 1000))
        }
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Generate test cases for a specific scenario type
async function generateTestCases(criteria, type, count, steps, areaPath, assignedTo, state) {
  try {
    const prompt = buildPrompt(criteria, type, count, steps);
    const response = await callGroqAPI(prompt);
    const testCases = parseResponse(response);
    return formatForExport(testCases, type, areaPath, assignedTo, state);
  } catch (error) {
    console.error('Generation error:', error);
    return createFallbackTestCases(criteria, type, count, steps, areaPath, assignedTo, state);
  }
}

// Generate all test case types
async function generateAllTestCases(criteria, areaPath, assignedTo, state) {
  try {
    const prompt = buildPrompt(criteria, 'All', 10, 4);
    const response = await callGroqAPI(prompt);
    const testCases = parseResponse(response);
    return formatAllForExport(testCases, areaPath, assignedTo, state);
  } catch (error) {
    console.error('Generation error:', error);
    return createAllFallbackTestCases(criteria, areaPath, assignedTo, state);
  }
}

// Build the prompt for Groq
function buildPrompt(criteria, type, count, steps) {
  const typeDesc = type === 'All' 
    ? `Generate 10-12 test cases covering ALL types:
       - 3-4 Positive test cases (normal expected behavior)
       - 2-3 Negative test cases (error handling)
       - 2 Boundary test cases (min/max limits)
       - 2 Edge cases (unusual scenarios)`
    : `Generate ${count} ${type.toUpperCase()} test cases with ${steps} steps each.`;

  return `You are a senior software tester. Write clear, detailed test cases in simple English.

REQUIREMENTS:
${criteria}

${typeDesc}

RULES FOR TITLES:
- Start with "Verify that"
- Write complete sentences
- Be specific about what is being tested

Example: "Verify that the user can successfully log in when they enter a valid email and correct password"

RULES FOR STEP ACTIONS:
- Start with action verbs (Click, Enter, Type, Navigate, Select, Wait)
- Be specific about buttons, fields, and data
- Include example values in quotes

Example: "Click on the Email field and type 'john.smith@example.com'"

RULES FOR EXPECTED RESULTS:
- Start with "The system should" or "The page should"
- Describe exactly what happens
- Mention specific messages or changes

Example: "The system should display a success message saying 'Login successful' and redirect to the Dashboard page"

Return ONLY valid JSON:
{
  "testCases": [
    {
      "title": "Verify that...",
      "type": "Positive",
      "steps": [
        {"action": "Step action here", "expected": "Expected result here"}
      ]
    }
  ]
}`;
}

// Call Groq API
async function callGroqAPI(prompt) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a senior QA engineer. Write detailed test cases in clear, simple English. Return only valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 6000
  });

  return completion.choices[0]?.message?.content || '';
}

// Parse the API response
function parseResponse(response) {
  let cleaned = response.trim();
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
  
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  
  const parsed = JSON.parse(cleaned);
  return parsed.testCases || [];
}

// Format test cases for Azure DevOps export
function formatForExport(testCases, type, areaPath, assignedTo, state) {
  const rows = [];
  
  for (const tc of testCases) {
    rows.push({
      id: '',
      workItemType: 'Test Case',
      title: cleanTitle(tc.title),
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath,
      assignedTo,
      state,
      scenarioType: tc.type || type
    });

    const steps = tc.steps || [];
    steps.forEach((step, i) => {
      rows.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(i + 1),
        stepAction: cleanText(step.action),
        stepExpected: cleanText(step.expected),
        areaPath,
        assignedTo,
        state,
        scenarioType: tc.type || type
      });
    });
  }

  return rows;
}

// Format all test cases for export
function formatAllForExport(testCases, areaPath, assignedTo, state) {
  const rows = [];
  
  for (const tc of testCases) {
    rows.push({
      id: '',
      workItemType: 'Test Case',
      title: cleanTitle(tc.title),
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath,
      assignedTo,
      state,
      scenarioType: tc.type || 'Positive'
    });

    const steps = tc.steps || [];
    steps.forEach((step, i) => {
      rows.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(i + 1),
        stepAction: cleanText(step.action),
        stepExpected: cleanText(step.expected),
        areaPath,
        assignedTo,
        state,
        scenarioType: tc.type || 'Positive'
      });
    });
  }

  return rows;
}

// Clean title text
function cleanTitle(title) {
  if (!title) return 'Verify that the feature works as expected';
  let cleaned = title.trim();
  if (!cleaned.toLowerCase().startsWith('verify that')) {
    cleaned = 'Verify that ' + cleaned;
  }
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned.replace(/\.$/, '');
}

// Clean general text
function cleanText(text) {
  if (!text) return 'Perform the required action.';
  let cleaned = text.trim();
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!cleaned.match(/[.!?]$/)) cleaned += '.';
  return cleaned;
}

// Fallback test cases when API fails
function createFallbackTestCases(criteria, type, count, steps, areaPath, assignedTo, state) {
  const fallback = getFallbackTemplate(type);
  return formatForExport([fallback], type, areaPath, assignedTo, state);
}

// Fallback for all types
function createAllFallbackTestCases(criteria, areaPath, assignedTo, state) {
  const types = ['Positive', 'Negative', 'Boundary', 'Edge'];
  const allCases = types.map(type => getFallbackTemplate(type));
  return formatAllForExport(allCases, areaPath, assignedTo, state);
}

// Get fallback template
function getFallbackTemplate(type) {
  const templates = {
    Positive: {
      title: 'Verify that the user can successfully complete the main action when all inputs are valid',
      type: 'Positive',
      steps: [
        { action: 'Open the web browser and navigate to the application page.', expected: 'The page should load completely with all elements visible.' },
        { action: 'Enter valid information in all required fields.', expected: 'The fields should accept the input without showing any errors.' },
        { action: 'Click the Submit or Save button.', expected: 'The system should process the request and show a loading indicator.' },
        { action: 'Wait for the operation to complete.', expected: 'The system should display a success message confirming the action was completed.' }
      ]
    },
    Negative: {
      title: 'Verify that the system displays an error message when the user enters invalid information',
      type: 'Negative',
      steps: [
        { action: 'Open the web browser and navigate to the application page.', expected: 'The page should load with all input fields visible.' },
        { action: 'Enter invalid or incorrect information in the required fields.', expected: 'The fields should accept the input.' },
        { action: 'Click the Submit button.', expected: 'The system should validate the input.' },
        { action: 'Observe the error messages displayed.', expected: 'The system should show clear error messages explaining what is wrong and how to fix it.' }
      ]
    },
    Boundary: {
      title: 'Verify that the system correctly handles minimum and maximum input values',
      type: 'Boundary',
      steps: [
        { action: 'Navigate to the page with input fields that have length or value limits.', expected: 'The page should display the input fields.' },
        { action: 'Enter the minimum allowed value or number of characters.', expected: 'The system should accept the minimum value without errors.' },
        { action: 'Clear the field and enter the maximum allowed value.', expected: 'The system should accept the maximum value or show a limit message.' },
        { action: 'Try to enter a value beyond the maximum limit.', expected: 'The system should prevent input beyond the limit or show an error message.' }
      ]
    },
    Edge: {
      title: 'Verify that the system handles special characters and unusual inputs correctly',
      type: 'Edge',
      steps: [
        { action: 'Navigate to the page with text input fields.', expected: 'The page should load with input fields ready for typing.' },
        { action: 'Enter special characters like @#$%^&*() in the text field.', expected: 'The system should either accept them or show which characters are not allowed.' },
        { action: 'Click the Submit button.', expected: 'The system should process the input without crashing.' },
        { action: 'Verify the page still works correctly.', expected: 'The page should continue to function normally without any errors.' }
      ]
    }
  };

  return templates[type] || templates.Positive;
}