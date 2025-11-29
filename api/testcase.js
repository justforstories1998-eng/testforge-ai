const { Groq } = require('groq-sdk');

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Rate limiter (simple in-memory for serverless)
// Vercel Serverless Function for Test Case Generation

// Simple in-memory rate limiter
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

// Main handler
export default async function handler(req, res) {
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
    // GET - Health check and rate limit status
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

      // Check if GROQ_API_KEY is set
      if (!process.env.GROQ_API_KEY) {
        console.error('GROQ_API_KEY is not set');
        // Return fallback test cases
        const fallbackCases = createAllFallbackTestCases(acceptanceCriteria, areaPath, assignedTo, state);
        return res.status(200).json({
          success: true,
          message: 'Test cases generated (fallback mode)',
          data: fallbackCases,
          count: fallbackCases.filter(tc => tc.workItemType === 'Test Case').length
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

    return res.status(405).json({ success: false, message: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    
    // Return fallback test cases on error
    const { acceptanceCriteria = '', areaPath = 'Subscription/Billing/Data', assignedTo = 'Unassigned', state = 'New' } = req.body || {};
    const fallbackCases = createAllFallbackTestCases(acceptanceCriteria, areaPath, assignedTo, state);
    
    return res.status(200).json({
      success: true,
      message: 'Test cases generated (fallback mode due to: ' + error.message + ')',
      data: fallbackCases,
      count: fallbackCases.filter(tc => tc.workItemType === 'Test Case').length
    });
  }
}

// Generate test cases for a specific scenario type
async function generateTestCases(criteria, type, count, steps, areaPath, assignedTo, state) {
  try {
    const { Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const prompt = buildPrompt(criteria, type, count, steps);
    const response = await callGroqAPI(groq, prompt);
    const testCases = parseResponse(response);
    
    if (testCases && testCases.length > 0) {
      return formatForExport(testCases, type, areaPath, assignedTo, state);
    }
    
    throw new Error('No test cases generated');
  } catch (error) {
    console.error('Generation error:', error);
    return createFallbackTestCases(criteria, type, count, steps, areaPath, assignedTo, state);
  }
}

// Generate all test case types
async function generateAllTestCases(criteria, areaPath, assignedTo, state) {
  try {
    const { Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const prompt = buildPrompt(criteria, 'All', 10, 4);
    const response = await callGroqAPI(groq, prompt);
    const testCases = parseResponse(response);
    
    if (testCases && testCases.length > 0) {
      return formatAllForExport(testCases, areaPath, assignedTo, state);
    }
    
    throw new Error('No test cases generated');
  } catch (error) {
    console.error('Generation error:', error);
    return createAllFallbackTestCases(criteria, areaPath, assignedTo, state);
  }
}

// Build the prompt for Groq
function buildPrompt(criteria, type, count, steps) {
  const typeDesc = type === 'All' 
    ? `Generate 8-10 test cases covering ALL types:
       - 3 Positive test cases (normal expected behavior)
       - 2 Negative test cases (error handling)
       - 2 Boundary test cases (min/max limits)
       - 2 Edge cases (unusual scenarios)`
    : `Generate ${count} ${type.toUpperCase()} test cases with ${steps} steps each.`;

  return `You are a senior software tester. Write clear, detailed test cases in simple English.

REQUIREMENTS TO TEST:
${criteria}

${typeDesc}

RULES FOR TITLES:
- Start with "Verify that"
- Write complete sentences
- Be specific about what is being tested
- Example: "Verify that the user can successfully log in when they enter a valid email and correct password"

RULES FOR STEP ACTIONS:
- Start with action verbs (Click, Enter, Type, Navigate, Select, Wait, Open)
- Be specific about buttons, fields, and data
- Include example values in quotes
- Example: "Click on the Email field and type 'john.smith@example.com'"

RULES FOR EXPECTED RESULTS:
- Start with "The system should" or "The page should"
- Describe exactly what happens on screen
- Mention specific messages or changes
- Example: "The system should display a success message saying 'Login successful' and redirect to the Dashboard page"

Return ONLY valid JSON in this exact format:
{
  "testCases": [
    {
      "title": "Verify that the user can successfully log in with valid credentials",
      "type": "Positive",
      "steps": [
        {
          "action": "Open the browser and navigate to the login page",
          "expected": "The login page should load with email and password fields visible"
        }
      ]
    }
  ]
}`;
}

// Call Groq API
async function callGroqAPI(groq, prompt) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a senior QA engineer. Write detailed test cases in clear, simple English. Return only valid JSON without any markdown.'
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
  try {
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
    
    const parsed = JSON.parse(cleaned);
    return parsed.testCases || [];
  } catch (error) {
    console.error('Parse error:', error);
    return [];
  }
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
  let cleaned = String(title).trim();
  if (!cleaned.toLowerCase().startsWith('verify that')) {
    cleaned = 'Verify that ' + cleaned;
  }
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned.replace(/\.$/, '');
}

// Clean general text
function cleanText(text) {
  if (!text) return 'Perform the required action.';
  let cleaned = String(text).trim();
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!cleaned.match(/[.!?]$/)) cleaned += '.';
  return cleaned;
}

// Fallback test cases when API fails
function createFallbackTestCases(criteria, type, count, steps, areaPath, assignedTo, state) {
  const templates = getFallbackTemplates();
  const template = templates[type] || templates.Positive;
  return formatForExport([template], type, areaPath, assignedTo, state);
}

// Fallback for all types
function createAllFallbackTestCases(criteria, areaPath, assignedTo, state) {
  const templates = getFallbackTemplates();
  const allCases = [
    templates.Positive,
    templates.Positive2,
    templates.Negative,
    templates.Negative2,
    templates.Boundary,
    templates.Edge
  ];
  return formatAllForExport(allCases, areaPath, assignedTo, state);
}

// Get fallback templates
function getFallbackTemplates() {
  return {
    Positive: {
      title: 'Verify that the user can successfully complete the main action when all inputs are valid',
      type: 'Positive',
      steps: [
        { action: 'Open the web browser and navigate to the application page.', expected: 'The page should load completely with all elements visible and ready to use.' },
        { action: 'Enter valid information in all required fields as specified in the form.', expected: 'The system should accept all input without displaying any error messages.' },
        { action: 'Click the Submit or Save button to complete the action.', expected: 'The system should process the request and display a loading indicator.' },
        { action: 'Wait for the operation to complete and observe the result.', expected: 'The system should display a success message confirming the action was completed successfully.' }
      ]
    },
    Positive2: {
      title: 'Verify that the user can view and access all main features of the application',
      type: 'Positive',
      steps: [
        { action: 'Open the web browser and navigate to the home page of the application.', expected: 'The home page should load with the main navigation menu visible.' },
        { action: 'Click on each main navigation link to verify they work.', expected: 'Each page should load correctly without any errors.' },
        { action: 'Verify that all buttons and interactive elements are clickable.', expected: 'All buttons should respond to clicks and perform their intended actions.' },
        { action: 'Check that the page layout displays correctly on the screen.', expected: 'The page should be properly formatted with no overlapping elements or broken images.' }
      ]
    },
    Negative: {
      title: 'Verify that the system displays an error message when the user enters invalid information',
      type: 'Negative',
      steps: [
        { action: 'Open the web browser and navigate to the application page with input fields.', expected: 'The page should load with all input fields visible and ready for data entry.' },
        { action: 'Enter invalid or incorrectly formatted information in the required fields.', expected: 'The system should accept the input into the fields.' },
        { action: 'Click the Submit button to attempt to process the invalid data.', expected: 'The system should validate the input and detect the errors.' },
        { action: 'Observe the error messages displayed on the page.', expected: 'The system should display clear error messages in red color explaining what is wrong and how to fix it.' }
      ]
    },
    Negative2: {
      title: 'Verify that the system prevents form submission when required fields are left empty',
      type: 'Negative',
      steps: [
        { action: 'Navigate to the page with the form that has required fields.', expected: 'The form should display with required fields marked with an asterisk (*).' },
        { action: 'Leave all required fields empty and do not enter any data.', expected: 'The required fields should remain empty.' },
        { action: 'Click the Submit button without filling in the required fields.', expected: 'The system should prevent form submission.' },
        { action: 'Check the validation messages displayed.', expected: 'The system should highlight empty required fields in red and display messages saying "This field is required".' }
      ]
    },
    Boundary: {
      title: 'Verify that the system correctly handles minimum and maximum input values',
      type: 'Boundary',
      steps: [
        { action: 'Navigate to the page with input fields that have length or value limits.', expected: 'The page should display the input fields ready for testing.' },
        { action: 'Enter the minimum allowed value or minimum number of characters in the field.', expected: 'The system should accept the minimum value without showing any error messages.' },
        { action: 'Clear the field and enter the maximum allowed value or maximum characters.', expected: 'The system should accept the maximum value or stop accepting input at the limit.' },
        { action: 'Try to enter a value that exceeds the maximum limit.', expected: 'The system should either prevent additional input or display an error message about exceeding the limit.' }
      ]
    },
    Edge: {
      title: 'Verify that the system handles special characters and unusual inputs correctly without crashing',
      type: 'Edge',
      steps: [
        { action: 'Navigate to the page with text input fields.', expected: 'The page should load with input fields ready for typing.' },
        { action: 'Enter special characters like @#$%^&*()_+= in the text field.', expected: 'The system should either accept the characters or clearly indicate which characters are not allowed.' },
        { action: 'Click the Submit button to process the input with special characters.', expected: 'The system should handle the input without crashing or showing technical errors.' },
        { action: 'Verify that the page continues to work correctly after the submission.', expected: 'The page should remain functional with no broken layout or JavaScript errors.' }
      ]
    }
  };
}