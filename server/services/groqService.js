const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function generateTestCasesWithGroq(acceptanceCriteria, options = {}) {
  const {
    scenarioType = 'Positive',
    numberOfScenarios = 3,
    numberOfSteps = 4,
    environment = 'Testing',
    platforms = ['Web'],
    areaPath = 'Subscription/Billing/Data',
    assignedTo = 'Unassigned',
    state = 'New'
  } = options;

  const isAllMode = scenarioType === 'All';

  console.log('🚀 Starting DETAILED test case generation...');
  console.log(`📊 Mode: ${isAllMode ? 'ALL (Comprehensive)' : scenarioType}`);
  console.log(`📊 Scenarios: ${numberOfScenarios}, Steps: ${numberOfSteps}`);

  try {
    if (isAllMode) {
      return await generateComprehensiveDetailedTestCases(acceptanceCriteria, {
        environment,
        platforms,
        areaPath,
        assignedTo,
        state
      });
    } else {
      return await generateDetailedTestCases(acceptanceCriteria, {
        scenarioType,
        numberOfScenarios: parseInt(numberOfScenarios) || 3,
        numberOfSteps: parseInt(numberOfSteps) || 4,
        environment,
        platforms,
        areaPath,
        assignedTo,
        state
      });
    }
  } catch (error) {
    console.error('❌ Error in generation:', error.message);
    if (isAllMode) {
      return generateFallbackAllScenarios(acceptanceCriteria, areaPath, assignedTo, state);
    }
    return generateFallbackTestCases(acceptanceCriteria, numberOfScenarios, numberOfSteps, scenarioType, areaPath, assignedTo, state);
  }
}

// ========== DETAILED STANDARD MODE ==========
async function generateDetailedTestCases(acceptanceCriteria, options) {
  const { scenarioType, numberOfScenarios, numberOfSteps, areaPath, assignedTo, state, platforms } = options;
  
  console.log(`📝 Generating ${numberOfScenarios} DETAILED ${scenarioType} scenarios...`);

  // First, generate detailed titles
  const titles = await generateDetailedTitles(acceptanceCriteria, numberOfScenarios, scenarioType, platforms);
  
  const allTestCases = [];

  // Then generate detailed steps for each title
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    console.log(`🔄 Generating steps for: ${title.substring(0, 50)}...`);
    
    const steps = await generateDetailedStepsForTitle(title, acceptanceCriteria, numberOfSteps, scenarioType);

    // Header row
    allTestCases.push({
      id: '',
      workItemType: 'Test Case',
      title: title,
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath: areaPath,
      assignedTo: assignedTo,
      state: state,
      scenarioType: scenarioType
    });

    // Step rows
    for (let j = 0; j < steps.length; j++) {
      allTestCases.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(j + 1),
        stepAction: steps[j].action,
        stepExpected: steps[j].expected,
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: scenarioType
      });
    }

    console.log(`✅ Generated test case ${i + 1}/${titles.length}`);
    
    // Small delay to avoid rate limiting
    if (i < titles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`✅ Total rows generated: ${allTestCases.length}`);
  return allTestCases;
}

async function generateDetailedTitles(acceptanceCriteria, numberOfScenarios, scenarioType, platforms) {
  const prompt = `You are a SENIOR QA ARCHITECT creating test case titles for Azure DevOps.

READ THIS ACCEPTANCE CRITERIA VERY CAREFULLY - EVERY WORD MATTERS:
"""
${acceptanceCriteria}
"""

SCENARIO TYPE: ${scenarioType}
PLATFORMS: ${platforms.join(', ')}
NUMBER OF TITLES NEEDED: ${numberOfScenarios}

YOUR TASK: Generate ${numberOfScenarios} HIGHLY DETAILED and SPECIFIC test case titles.

═══════════════════════════════════════════════════════════════
CRITICAL RULES FOR EXCELLENT TITLES:
═══════════════════════════════════════════════════════════════

1. MUST start with "Verify"
2. MUST be HIGHLY SPECIFIC - not generic
3. MUST include:
   - WHO (Admin, User, Student, Lecturer, System)
   - WHAT (exact action being performed)
   - WHERE (which page, app, section, modal)
   - CONDITION (when, if, after, before, during)
4. Maximum 128 characters but USE them all for detail
5. Each title must test a COMPLETELY DIFFERENT aspect
6. Extract EVERY testable point from the acceptance criteria

═══════════════════════════════════════════════════════════════
EXCELLENT TITLE EXAMPLES (COPY THIS STYLE EXACTLY):
═══════════════════════════════════════════════════════════════

✅ "Verify Admin can set release dates for individual course modules through Admin App"
✅ "Verify release date can be set using date picker with date and time selection"
✅ "Verify module remains hidden when current date is before release date"
✅ "Verify module remains hidden when release date is reached but previous modules are incomplete"
✅ "Verify module becomes visible only when both release date is reached AND previous modules are completed"
✅ "Verify students cannot see unreleased modules in their dashboard"
✅ "Verify students cannot access unreleased modules through direct URL manipulation"
✅ "Verify module automatically becomes visible at exact release date/time for eligible students"
✅ "Verify lecturers can edit release dates before module is published"
✅ "Verify system prevents setting release date in the past"
✅ "Verify module status displays as 'Scheduled' for modules with future release date"
✅ "Verify students see indicator 'This module will be available on [date]' for scheduled modules"
✅ "Verify timezone handling for release dates works correctly for users in different timezones"
✅ "Verify appropriate confirmation messages display when setting/updating release dates"
✅ "Verify audit log tracks all changes to module release dates"

═══════════════════════════════════════════════════════════════
BAD TITLES (NEVER DO THIS):
═══════════════════════════════════════════════════════════════

❌ "Verify login works" (TOO VAGUE - which user? what credentials? what happens?)
❌ "Verify validation" (MEANINGLESS - what validation? what field? what error?)
❌ "Verify user can access feature" (GENERIC - which user? which feature? how?)
❌ "Verify error handling" (USELESS - what error? what handling? what message?)
❌ "Verify data is saved" (INCOMPLETE - what data? where? how to verify?)

═══════════════════════════════════════════════════════════════

Now analyze the acceptance criteria and generate ${numberOfScenarios} DETAILED titles.

Return ONLY a JSON array of strings (no markdown, no explanation):
["title1", "title2", "title3"]`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a SENIOR QA ARCHITECT who creates extremely detailed, specific test case titles. You analyze every word of the requirements. Output ONLY valid JSON arrays. No markdown, no explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 3000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = cleanJsonResponse(response);
    
    // Try to parse as array
    let titles;
    try {
      titles = JSON.parse(response);
      if (!Array.isArray(titles)) {
        titles = titles.titles || titles.testCases || Object.values(titles);
      }
    } catch {
      // Try to extract array from response
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        titles = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse titles');
      }
    }

    // Validate and fix titles
    titles = titles.map(title => {
      if (typeof title !== 'string') title = title.title || String(title);
      if (!title.startsWith('Verify')) title = 'Verify ' + title;
      return title.substring(0, 128);
    });

    // Ensure we have enough titles
    while (titles.length < numberOfScenarios) {
      titles.push(generateFallbackTitle(acceptanceCriteria, titles.length + 1, scenarioType));
    }

    console.log(`✅ Generated ${titles.length} detailed titles`);
    return titles.slice(0, numberOfScenarios);

  } catch (error) {
    console.error('❌ Error generating titles:', error.message);
    return generateFallbackTitles(acceptanceCriteria, numberOfScenarios, scenarioType);
  }
}

async function generateDetailedStepsForTitle(title, acceptanceCriteria, numberOfSteps, scenarioType) {
  const prompt = `You are a SENIOR QA ENGINEER creating EXTREMELY DETAILED test steps.

TEST CASE TITLE: "${title}"

ORIGINAL ACCEPTANCE CRITERIA:
"""
${acceptanceCriteria}
"""

SCENARIO TYPE: ${scenarioType}
NUMBER OF STEPS REQUIRED: ${numberOfSteps}

YOUR TASK: Generate ${numberOfSteps} HIGHLY DETAILED test steps for this specific test case.

═══════════════════════════════════════════════════════════════
CRITICAL RULES FOR EXCELLENT STEPS:
═══════════════════════════════════════════════════════════════

FOR STEP ACTIONS:
- Include EXACT navigation path (e.g., "Navigate to Admin Panel > Course Management > Module Settings")
- Include SPECIFIC UI elements (buttons, fields, dropdowns, modals, tabs)
- Include EXACT data to enter (e.g., "Enter email 'testuser@example.com' in the Email field")
- Include SPECIFIC clicks (e.g., "Click the 'Save Changes' button in the bottom right corner")
- Be so detailed that ANY tester can follow without guessing

FOR EXPECTED RESULTS:
- Include EXACT outcomes (e.g., "Success toast notification appears with message 'Settings saved successfully'")
- Include SPECIFIC UI changes (e.g., "Modal closes and the table refreshes showing the new entry at the top")
- Include EXACT error messages when testing negative scenarios
- Include SPECIFIC data validation (e.g., "The Release Date field now displays 'March 15, 2024 at 9:00 AM PST'")
- Be so specific that pass/fail is UNAMBIGUOUS

═══════════════════════════════════════════════════════════════
EXCELLENT STEP EXAMPLES (COPY THIS LEVEL OF DETAIL):
═══════════════════════════════════════════════════════════════

EXAMPLE 1:
Action: "Navigate to Admin App by clicking 'Admin' in the top navigation bar, then select 'Course Management' from the sidebar menu, locate 'Introduction to Programming' course in the course list, and click the 'Settings' gear icon next to Module 3"
Expected: "Module Settings modal opens displaying Module 3 configuration with fields for Module Title (showing 'Introduction to Variables'), Release Date (showing 'Not Set'), Status dropdown (showing 'Draft'), and Prerequisite checkbox (currently unchecked)"

EXAMPLE 2:
Action: "Click on the 'Release Date' field to open the date picker, select March 15, 2024 from the calendar by clicking the date, then set the time to 9:00 AM using the hour dropdown (select '9') and minute dropdown (select '00'), and select 'AM' from the AM/PM toggle"
Expected: "Date picker shows the selected date highlighted in blue, time displays as '9:00 AM', timezone indicator shows '(PST - Pacific Standard Time)', and the preview text below shows 'Module will be released on March 15, 2024 at 9:00 AM PST'"

EXAMPLE 3:
Action: "Click the 'Confirm Release Date' button at the bottom of the date picker modal"
Expected: "Date picker modal closes with a smooth animation, green success toast notification appears in the top-right corner displaying 'Release date set successfully for Module 3', the Release Date field in the module settings now shows 'Mar 15, 2024 9:00 AM', and the Status automatically changes from 'Draft' to 'Scheduled' with an orange badge"

EXAMPLE 4:
Action: "Log out from Admin account by clicking the profile icon in the top-right corner and selecting 'Sign Out', then log in as a Student user with credentials testuser@university.edu / TestPass123, and navigate to 'My Courses' > 'Introduction to Programming'"
Expected: "Student dashboard loads showing enrolled courses, 'Introduction to Programming' course card is visible, clicking it opens the course page showing Module 1 and Module 2 as accessible (with green checkmarks), but Module 3 is NOT visible in the module list at all (completely hidden, not grayed out)"

EXAMPLE 5 (Negative Scenario):
Action: "While logged in as Student, attempt to access Module 3 directly by manually entering the URL 'https://app.university.edu/courses/intro-programming/modules/3' in the browser address bar and pressing Enter"
Expected: "System intercepts the unauthorized access attempt, redirects user to the course main page, displays a warning toast notification with message 'This module is not yet available. It will be released on March 15, 2024', and the browser URL changes back to 'https://app.university.edu/courses/intro-programming'"

═══════════════════════════════════════════════════════════════
BAD STEPS (NEVER DO THIS):
═══════════════════════════════════════════════════════════════

❌ Action: "Click the button" (WHICH button? WHERE?)
❌ Expected: "System works correctly" (WHAT does 'correctly' mean? WHAT happens?)

❌ Action: "Enter data" (WHAT data? WHERE? WHAT format?)
❌ Expected: "Data is saved" (HOW do we verify? WHAT confirmation?)

❌ Action: "Navigate to the page" (WHICH page? HOW to get there?)
❌ Expected: "Page loads" (WHAT should be ON the page?)

═══════════════════════════════════════════════════════════════

Now generate ${numberOfSteps} EXTREMELY DETAILED steps for the test case: "${title}"

Return ONLY a JSON array (no markdown, no explanation):
[
  {"action": "extremely detailed action", "expected": "extremely detailed expected result"},
  {"action": "extremely detailed action", "expected": "extremely detailed expected result"}
]`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a SENIOR QA ENGINEER who writes extremely detailed test steps. Every step must be so detailed that any tester can execute it without asking questions. Output ONLY valid JSON arrays. No markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = cleanJsonResponse(response);
    
    let steps;
    try {
      steps = JSON.parse(response);
      if (!Array.isArray(steps)) {
        steps = steps.steps || Object.values(steps);
      }
    } catch {
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        steps = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse steps');
      }
    }

    // Validate steps
    steps = steps.map(step => ({
      action: step.action || step.stepAction || 'Perform the required action',
      expected: step.expected || step.stepExpected || step.expectedResult || 'Expected result is achieved'
    }));

    // Ensure we have enough steps
    while (steps.length < numberOfSteps) {
      steps.push(generateDetailedFallbackStep(title, steps.length + 1, scenarioType));
    }

    return steps.slice(0, numberOfSteps);

  } catch (error) {
    console.error('❌ Error generating steps:', error.message);
    return generateDetailedFallbackSteps(title, numberOfSteps, scenarioType);
  }
}

// ========== COMPREHENSIVE ALL MODE ==========
async function generateComprehensiveDetailedTestCases(acceptanceCriteria, options) {
  const { areaPath, assignedTo, state, platforms } = options;
  
  console.log('🔍 Starting COMPREHENSIVE detailed analysis...');

  // First, analyze the acceptance criteria deeply
  const analysis = await analyzeAcceptanceCriteriaInDetail(acceptanceCriteria);
  
  const scenarioTypes = [
    { type: 'Positive', focus: 'happy path, successful operations, valid inputs, expected outcomes' },
    { type: 'Negative', focus: 'invalid inputs, error handling, unauthorized access, validation failures' },
    { type: 'Boundary', focus: 'minimum/maximum values, limits, edge values, empty inputs' },
    { type: 'Edge', focus: 'special characters, concurrent operations, timeouts, unusual sequences' }
  ];
  
  const allTestCases = [];

  for (const scenario of scenarioTypes) {
    console.log(`🎯 Generating DETAILED ${scenario.type} scenarios...`);
    
    try {
      const testCases = await generateDetailedScenariosForType(
        acceptanceCriteria, 
        analysis,
        scenario.type, 
        scenario.focus,
        platforms,
        areaPath,
        assignedTo,
        state
      );
      
      allTestCases.push(...testCases);
      console.log(`✅ Generated ${testCases.filter(tc => tc.workItemType === 'Test Case').length} ${scenario.type} scenarios`);
      
    } catch (error) {
      console.error(`❌ Error generating ${scenario.type}:`, error.message);
      const fallback = getFallbackScenariosForType(acceptanceCriteria, scenario.type, areaPath, assignedTo, state);
      allTestCases.push(...fallback);
    }

    // Delay between types to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`🎉 Comprehensive generation complete: ${allTestCases.length} total rows`);
  return allTestCases;
}

async function analyzeAcceptanceCriteriaInDetail(acceptanceCriteria) {
  const prompt = `Analyze this acceptance criteria and extract ALL testable elements:

"""
${acceptanceCriteria}
"""

Extract:
1. All USER ROLES mentioned (Admin, Student, Lecturer, User, etc.)
2. All ACTIONS that can be performed
3. All UI ELEMENTS mentioned (pages, buttons, fields, modals)
4. All BUSINESS RULES and conditions
5. All VALIDATION REQUIREMENTS
6. All ERROR SCENARIOS possible
7. All DATA ELEMENTS involved
8. All STATUS/STATE changes

Return as JSON:
{
  "userRoles": [],
  "actions": [],
  "uiElements": [],
  "businessRules": [],
  "validations": [],
  "errorScenarios": [],
  "dataElements": [],
  "statusChanges": []
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a QA analyst. Output ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = cleanJsonResponse(response);
    return JSON.parse(response);
  } catch {
    return { userRoles: [], actions: [], uiElements: [], businessRules: [], validations: [], errorScenarios: [], dataElements: [], statusChanges: [] };
  }
}

async function generateDetailedScenariosForType(acceptanceCriteria, analysis, scenarioType, focus, platforms, areaPath, assignedTo, state) {
  const prompt = `You are a SENIOR QA ARCHITECT creating COMPREHENSIVE ${scenarioType.toUpperCase()} test cases.

ACCEPTANCE CRITERIA:
"""
${acceptanceCriteria}
"""

ANALYSIS RESULTS:
${JSON.stringify(analysis, null, 2)}

SCENARIO TYPE: ${scenarioType}
FOCUS: ${focus}
PLATFORMS: ${platforms.join(', ')}

═══════════════════════════════════════════════════════════════
YOUR TASK: Generate 4-6 HIGHLY DETAILED ${scenarioType} test cases
═══════════════════════════════════════════════════════════════

TITLE REQUIREMENTS:
- Start with "Verify"
- Include WHO, WHAT, WHERE, CONDITION
- Be extremely specific (use all 128 characters if needed)
- Cover different aspects of the acceptance criteria

STEP REQUIREMENTS (5-7 steps per test case):
- Actions: Include exact navigation, specific UI elements, exact data values
- Expected: Include exact messages, specific UI changes, precise outcomes

EXCELLENT EXAMPLES:

Title: "Verify Admin can set release dates for individual course modules through Admin App"
Steps:
1. Action: "Navigate to Admin App by clicking 'Admin' in top navigation, select 'Course Management' from sidebar, find 'Introduction to Programming' course and click the gear icon for Module 3"
   Expected: "Module Settings modal opens showing Module Title, Release Date field (showing 'Not Set'), Status dropdown showing 'Draft', and Prerequisite settings"

2. Action: "Click the Release Date field, select March 15, 2024 from calendar, set time to 9:00 AM using dropdowns, verify timezone shows correctly"
   Expected: "Date picker shows selected date highlighted, time displays '9:00 AM', preview shows 'March 15, 2024 at 9:00 AM PST'"

3. Action: "Click 'Confirm' button to save the release date"
   Expected: "Modal closes, success toast shows 'Release date set successfully', Release Date field shows 'Mar 15, 2024 9:00 AM', Status changes to 'Scheduled'"

4. Action: "Refresh the page and navigate back to Module 3 settings"
   Expected: "Release date persists showing 'Mar 15, 2024 9:00 AM', Status still shows 'Scheduled'"

5. Action: "Check audit log by clicking 'View History' link"
   Expected: "Audit log shows entry with timestamp, admin username, action 'Release Date Set', old value 'Not Set', new value 'Mar 15, 2024 9:00 AM'"

Generate 4-6 test cases following this exact level of detail.

Return ONLY JSON (no markdown):
{
  "testCases": [
    {
      "title": "detailed title",
      "steps": [
        {"action": "detailed action", "expected": "detailed expected"}
      ]
    }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a SENIOR QA ARCHITECT creating extremely detailed test cases. Output ONLY valid JSON. No markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 6000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = cleanJsonResponse(response);
    
    const parsed = JSON.parse(response);
    const scenarios = parsed.testCases || parsed.scenarios || parsed;

    const testCases = [];
    
    for (const scenario of (Array.isArray(scenarios) ? scenarios : [])) {
      let title = scenario.title || 'Verify test scenario';
      if (!title.startsWith('Verify')) title = 'Verify ' + title;
      title = title.substring(0, 128);

      // Header row
      testCases.push({
        id: '',
        workItemType: 'Test Case',
        title: title,
        testStep: '',
        stepAction: '',
        stepExpected: '',
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: scenarioType
      });

      // Step rows
      const steps = scenario.steps || [];
      for (let i = 0; i < steps.length; i++) {
        testCases.push({
          id: '',
          workItemType: '',
          title: '',
          testStep: String(i + 1),
          stepAction: steps[i].action || steps[i].stepAction || 'Perform action',
          stepExpected: steps[i].expected || steps[i].stepExpected || steps[i].expectedResult || 'Verify result',
          areaPath: areaPath,
          assignedTo: assignedTo,
          state: state,
          scenarioType: scenarioType
        });
      }
    }

    return testCases.length > 0 ? testCases : getFallbackScenariosForType(acceptanceCriteria, scenarioType, areaPath, assignedTo, state);

  } catch (error) {
    console.error(`Error in ${scenarioType} generation:`, error.message);
    return getFallbackScenariosForType(acceptanceCriteria, scenarioType, areaPath, assignedTo, state);
  }
}

// ========== HELPER FUNCTIONS ==========

function cleanJsonResponse(response) {
  response = response.replace(/```json\s*/gi, '');
  response = response.replace(/```\s*/gi, '');
  response = response.trim();
  
  const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
  const jsonArrayMatch = response.match(/\[[\s\S]*\]/);
  
  if (jsonObjectMatch) {
    return jsonObjectMatch[0];
  } else if (jsonArrayMatch) {
    return jsonArrayMatch[0];
  }
  
  return response;
}

function generateFallbackTitle(acceptanceCriteria, index, scenarioType) {
  const shortCriteria = acceptanceCriteria.substring(0, 60);
  const templates = {
    'Positive': [
      `Verify user can successfully complete the primary workflow for ${shortCriteria}`,
      `Verify system correctly processes and saves data when ${shortCriteria}`,
      `Verify UI displays correct confirmation after ${shortCriteria}`,
      `Verify all required fields are validated when ${shortCriteria}`,
      `Verify data persists correctly after completing ${shortCriteria}`
    ],
    'Negative': [
      `Verify system displays appropriate error when invalid data is entered for ${shortCriteria}`,
      `Verify unauthorized users cannot access restricted functionality for ${shortCriteria}`,
      `Verify system prevents submission when required fields are empty for ${shortCriteria}`,
      `Verify appropriate validation message appears for incorrect format in ${shortCriteria}`,
      `Verify system handles server errors gracefully for ${shortCriteria}`
    ],
    'Boundary': [
      `Verify system accepts minimum allowed value for ${shortCriteria}`,
      `Verify system accepts maximum allowed value for ${shortCriteria}`,
      `Verify system rejects values below minimum limit for ${shortCriteria}`,
      `Verify system rejects values above maximum limit for ${shortCriteria}`,
      `Verify system handles empty input correctly for ${shortCriteria}`
    ],
    'Edge': [
      `Verify system handles special characters correctly in ${shortCriteria}`,
      `Verify system prevents duplicate submissions for ${shortCriteria}`,
      `Verify system handles concurrent user actions for ${shortCriteria}`,
      `Verify system behavior when session expires during ${shortCriteria}`,
      `Verify system handles network timeout during ${shortCriteria}`
    ]
  };
  
  const typeTemplates = templates[scenarioType] || templates['Positive'];
  return typeTemplates[(index - 1) % typeTemplates.length];
}

function generateFallbackTitles(acceptanceCriteria, numberOfScenarios, scenarioType) {
  const titles = [];
  for (let i = 0; i < numberOfScenarios; i++) {
    titles.push(generateFallbackTitle(acceptanceCriteria, i + 1, scenarioType));
  }
  return titles;
}

function generateDetailedFallbackStep(title, stepNumber, scenarioType) {
  const titleLower = title.toLowerCase();
  
  // Context-aware detailed steps based on title keywords
  if (titleLower.includes('login') || titleLower.includes('authenticate') || titleLower.includes('sign in')) {
    const steps = [
      { action: "Open the application in a supported browser (Chrome, Firefox, or Edge) and verify the login page loads completely with the company logo, email field, password field, 'Remember Me' checkbox, and 'Sign In' button visible", expected: "Login page displays correctly with all elements visible, email field is focused by default, password field shows dots for entered characters, and 'Sign In' button is initially disabled until credentials are entered" },
      { action: "Enter a valid email address 'testuser@company.com' in the Email field by clicking the field and typing the email, then press Tab to move to the Password field", expected: "Email is displayed in the field, field border changes to blue indicating focus moved, no validation error appears since email format is valid" },
      { action: "Enter the valid password 'SecurePass123!' in the Password field (password should contain at least 8 characters with uppercase, lowercase, number and special character)", expected: "Password characters are masked with dots (•••••), 'Sign In' button becomes enabled and changes from gray to blue color, password strength indicator (if present) shows 'Strong'" },
      { action: "Click the 'Sign In' button and wait for the authentication process to complete", expected: "Loading spinner appears on the button, after 1-3 seconds user is redirected to the Dashboard/Home page, welcome message 'Welcome, Test User' appears in the header, and user profile icon is visible in the top-right corner" },
      { action: "Verify the session is established by checking the browser's developer tools (F12 > Application > Cookies) for authentication tokens", expected: "Session cookie or JWT token is present in browser storage, token expiry is set correctly (typically 24 hours or as configured), refresh token is stored if applicable" },
      { action: "Navigate to a protected page (e.g., 'Settings' or 'Profile') to verify authentication persists", expected: "Protected page loads successfully without redirecting to login, user-specific data is displayed correctly, no authentication errors appear in browser console" }
    ];
    return steps[Math.min(stepNumber - 1, steps.length - 1)];
  }
  
  if (titleLower.includes('release date') || titleLower.includes('schedule') || titleLower.includes('publish')) {
    const steps = [
      { action: "Navigate to the Admin Panel by clicking 'Admin' in the main navigation menu, then select 'Content Management' or 'Course Management' from the sidebar, and locate the specific module/content item in the list", expected: "Admin panel loads showing the management interface, content list displays all items with their current status (Draft, Scheduled, Published), each item shows title, current status, and action buttons" },
      { action: "Click the 'Settings' or 'Edit' icon (gear/pencil icon) next to the target module to open the configuration panel", expected: "Settings modal or panel opens displaying current configuration including Title field, Description field, Release Date field (showing 'Not Set' or current date), Status dropdown, and Save/Cancel buttons" },
      { action: "Click on the 'Release Date' field to open the date/time picker component", expected: "Date picker modal appears with: calendar showing current month, navigation arrows for previous/next month, time selection dropdowns (Hour, Minute, AM/PM), timezone indicator showing user's current timezone, and 'Clear' and 'Confirm' buttons" },
      { action: "Select a future date by clicking on the desired date in the calendar (e.g., click on '15' for the 15th), then set the time using the dropdowns (select '9' for hour, '00' for minutes, 'AM' for period)", expected: "Selected date is highlighted with a colored circle, time dropdowns show the selected values, preview text updates to show 'Module will be released on [Date] at [Time] [Timezone]', Confirm button becomes enabled" },
      { action: "Click the 'Confirm' or 'Save' button to apply the release date settings", expected: "Date picker closes, success notification appears (green toast message: 'Release date set successfully'), Release Date field now displays the formatted date and time, module Status automatically changes from 'Draft' to 'Scheduled' with appropriate visual indicator (orange badge)" },
      { action: "Refresh the page by pressing F5 or clicking the browser refresh button, then navigate back to the same module settings", expected: "After page reload, the release date value persists showing the same date and time that was set, Status still shows 'Scheduled', all settings are retained correctly" }
    ];
    return steps[Math.min(stepNumber - 1, steps.length - 1)];
  }
  
  if (titleLower.includes('hidden') || titleLower.includes('visible') || titleLower.includes('cannot see') || titleLower.includes('cannot access')) {
    const steps = [
      { action: "Log in as a user who should NOT have access to the restricted content (e.g., Student account: student@university.edu / StudentPass123) and navigate to the main dashboard", expected: "User is logged in successfully and redirected to their role-specific dashboard, dashboard shows only content and features appropriate for their role/permissions level" },
      { action: "Navigate to the section where restricted content would normally appear (e.g., 'My Courses' > select specific course > view module list)", expected: "Course page loads showing the list of available modules, only modules that meet all access criteria (released date reached, prerequisites completed) are visible in the list" },
      { action: "Carefully examine the module list to verify the restricted module is NOT displayed - check by scrolling through entire list and using any search/filter features", expected: "The restricted module does not appear anywhere in the visible list, there is no placeholder, grayed-out item, or 'locked' indicator - the module is completely invisible to this user" },
      { action: "Attempt to access the restricted content directly by typing the URL in the browser address bar (e.g., 'https://app.domain.com/courses/123/modules/456' where 456 is the restricted module ID)", expected: "System intercepts the unauthorized access attempt, user is NOT shown the restricted content, instead user is redirected to the course main page or shown an access denied message" },
      { action: "Check the browser's Network tab in Developer Tools (F12) to verify no restricted content data was loaded in API responses", expected: "API responses do not contain any data about the restricted module, no hidden content is present in the DOM that could be revealed through browser inspection, security is enforced at the server level" }
    ];
    return steps[Math.min(stepNumber - 1, steps.length - 1)];
  }
  
  if (titleLower.includes('error') || titleLower.includes('invalid') || titleLower.includes('validation') || titleLower.includes('reject')) {
    const steps = [
      { action: "Navigate to the form or input area being tested and identify the field(s) with validation requirements", expected: "Form/input area is displayed with all fields visible, required fields are marked with asterisk (*) or 'Required' label, any existing validation rules are indicated (e.g., 'Email format: name@domain.com')" },
      { action: "Enter invalid data that violates the validation rules - for email field enter 'invalid-email', for number field enter 'abc', for required field leave it empty, etc.", expected: "Invalid data is entered in the field(s), field may show immediate inline validation (red border, error icon) depending on implementation, or validation triggers on blur/submit" },
      { action: "Attempt to submit the form by clicking the Submit/Save button or pressing Enter", expected: "Form submission is BLOCKED, page does not navigate away, Submit button may show brief loading then return to normal state, focus moves to the first field with an error" },
      { action: "Examine the validation error message(s) displayed for each invalid field", expected: "Clear, specific error message appears near each invalid field (e.g., 'Please enter a valid email address', 'This field is required', 'Please enter a number between 1 and 100'), error messages are in red text or displayed in error styling" },
      { action: "Correct the invalid data by entering valid values in each field that had errors", expected: "As valid data is entered, error messages disappear, field styling returns to normal (red border removed), Submit button may become enabled if it was disabled" },
      { action: "Submit the form again with all valid data", expected: "Form submits successfully, success message appears (e.g., 'Your changes have been saved'), user is redirected to appropriate page or form resets for new entry" }
    ];
    return steps[Math.min(stepNumber - 1, steps.length - 1)];
  }
  
  // Generic detailed fallback steps
  const genericSteps = [
    { action: `Navigate to the application section relevant to this test case by logging in with appropriate credentials and using the main navigation menu to reach the target page/feature`, expected: `Target page loads completely with all UI elements visible and interactive, no console errors appear, page title and breadcrumbs confirm correct location` },
    { action: `Identify and interact with the primary UI element for this test - locate the relevant button, field, dropdown, or link and perform the required action (click, enter data, select option)`, expected: `UI element responds to interaction appropriately - buttons show click feedback, fields accept input, dropdowns display options, any associated modals or panels open correctly` },
    { action: `Complete the main action being tested by entering all required data, making necessary selections, and triggering the operation (submit, save, confirm, etc.)`, expected: `Operation processes successfully (or fails as expected for negative tests), appropriate feedback is provided to the user through success/error messages, loading indicators, or status changes` },
    { action: `Verify the outcome of the action by checking that data was saved/updated correctly, UI reflects the changes, and any related elements are updated appropriately`, expected: `All changes are reflected correctly in the UI, data displays accurately, related counts or statuses are updated, no orphaned or inconsistent data remains` },
    { action: `Perform secondary verification by refreshing the page, navigating away and back, or checking in a different view/report to confirm changes persisted`, expected: `Changes persist after page refresh, data appears correctly in other views/reports, database state matches UI display (if verifiable), audit logs show the action if applicable` },
    { action: `Complete any cleanup or reset steps needed for subsequent tests - delete test data, reset settings to defaults, or log out if testing is complete`, expected: `System returns to clean state, test data is removed or clearly marked, no residual effects remain that could impact other tests` }
  ];
  
  return genericSteps[Math.min(stepNumber - 1, genericSteps.length - 1)];
}

function generateDetailedFallbackSteps(title, numberOfSteps, scenarioType) {
  const steps = [];
  for (let i = 0; i < numberOfSteps; i++) {
    steps.push(generateDetailedFallbackStep(title, i + 1, scenarioType));
  }
  return steps;
}

function getFallbackScenariosForType(acceptanceCriteria, scenarioType, areaPath, assignedTo, state) {
  const shortCriteria = acceptanceCriteria.substring(0, 50);
  const testCases = [];
  
  const scenarios = {
    'Positive': [
      {
        title: `Verify user can successfully complete primary workflow as described in: ${shortCriteria}`,
        steps: [
          { action: "Log in to the application with valid user credentials (username: testuser@company.com, password: ValidPass123) and wait for the dashboard to load completely", expected: "User is authenticated successfully, dashboard loads within 3 seconds showing user's name in the header, all navigation menu items are visible and clickable" },
          { action: "Navigate to the feature being tested by clicking the appropriate menu item in the main navigation and selecting the relevant sub-section", expected: "Feature page loads with all required UI elements visible including input fields, buttons, and any data tables or lists, page title confirms correct location" },
          { action: "Enter valid data in all required fields following the correct format (e.g., email: valid@email.com, phone: 123-456-7890, date: MM/DD/YYYY)", expected: "Data is accepted in each field without validation errors, fields may show green checkmarks or other positive indicators for valid input" },
          { action: "Click the Submit/Save button to process the entered data and wait for the operation to complete", expected: "Loading indicator appears briefly, then success message displays (e.g., 'Record saved successfully'), form either clears for new entry or redirects to confirmation page" },
          { action: "Verify the data was saved correctly by navigating to the list/history view or refreshing the current page", expected: "Newly saved record appears in the list with all entered data displayed correctly, timestamps show current date/time, record status shows as Active or appropriate default" }
        ]
      },
      {
        title: `Verify system displays correct information after completing: ${shortCriteria}`,
        steps: [
          { action: "Complete the workflow being tested and arrive at the confirmation or result screen", expected: "Confirmation screen displays with all relevant information about the completed action" },
          { action: "Verify all displayed information matches what was entered or expected from the action", expected: "All data fields show correct values, formatting is correct (dates, numbers, currency), no missing or truncated information" },
          { action: "Check that any related notifications, emails, or system updates were triggered correctly", expected: "Notification appears in user's notification center, email is received if applicable, related records are updated" },
          { action: "Navigate to related sections to verify cross-system data consistency", expected: "Related dashboards, reports, and summaries reflect the new data correctly" }
        ]
      }
    ],
    'Negative': [
      {
        title: `Verify system properly rejects invalid input and shows appropriate error for: ${shortCriteria}`,
        steps: [
          { action: "Navigate to the feature form and identify fields with validation requirements (required fields marked with *, fields with format requirements noted in placeholder text or help icons)", expected: "Form displays with clear indication of which fields are required and what validation rules apply to each field" },
          { action: "Enter invalid data in the field being tested - for email enter 'notanemail', for phone enter 'abcdef', for required field leave blank, for number field enter text", expected: "Invalid data is entered/left blank in the field, depending on implementation may see immediate inline validation feedback" },
          { action: "Click the Submit/Save button to trigger form validation", expected: "Form submission is blocked, page does not navigate, focus moves to first field with error, submit button may briefly show loading then reset" },
          { action: "Examine the error message displayed - verify it clearly explains what is wrong and how to fix it", expected: "Specific error message appears near the invalid field (e.g., 'Please enter a valid email address' not just 'Invalid input'), message is in red or error styling, field may have red border" },
          { action: "Verify no partial data was saved to the system by checking the database or list view", expected: "No new records were created, no existing records were modified, system remains in consistent state" }
        ]
      },
      {
        title: `Verify unauthorized access is prevented for: ${shortCriteria}`,
        steps: [
          { action: "Log in as a user who should NOT have permission for this action (e.g., regular user instead of admin, viewer instead of editor)", expected: "User is logged in with their limited permission set, dashboard shows features appropriate to their role" },
          { action: "Attempt to access the restricted feature through normal navigation - look for the menu item or button", expected: "Menu item or button is either not visible at all, or visible but disabled/grayed out with tooltip explaining 'Requires admin permission' or similar" },
          { action: "Attempt to access the restricted feature via direct URL by typing the URL in the browser address bar", expected: "System returns 403 Forbidden error or redirects to an 'Access Denied' page with message explaining user lacks required permissions" },
          { action: "Check browser console and network tab for any security-related errors or leaked information", expected: "No sensitive data is returned in API responses, appropriate HTTP status codes are used (401, 403), no error messages reveal system internals" }
        ]
      }
    ],
    'Boundary': [
      {
        title: `Verify minimum and maximum boundary values are enforced correctly for: ${shortCriteria}`,
        steps: [
          { action: "Identify the field with numeric or length boundaries and note the documented minimum and maximum values (check field labels, tooltips, or documentation)", expected: "Boundary values are identified - for example: minimum 1, maximum 100 for quantity field; minimum 3 characters, maximum 50 for name field" },
          { action: "Enter exactly the minimum allowed value and submit the form", expected: "Minimum value is accepted, form submits successfully, saved record shows the minimum value correctly" },
          { action: "Enter exactly the maximum allowed value and submit the form", expected: "Maximum value is accepted, form submits successfully, saved record shows the maximum value correctly without truncation" },
          { action: "Enter a value one below the minimum (e.g., 0 if minimum is 1, or 2 characters if minimum is 3) and attempt to submit", expected: "Validation error appears stating the value is below minimum, form submission is blocked, error message specifies the minimum allowed value" },
          { action: "Enter a value one above the maximum (e.g., 101 if maximum is 100, or 51 characters if maximum is 50) and attempt to submit", expected: "Either: input is prevented/truncated at maximum length, OR validation error appears stating value exceeds maximum, form submission is blocked" }
        ]
      }
    ],
    'Edge': [
      {
        title: `Verify system handles special characters and unusual input correctly for: ${shortCriteria}`,
        steps: [
          { action: "Enter special characters in text fields: !@#$%^&*()_+-=[]{}|;':\",./<>? and attempt to save", expected: "System either accepts and properly escapes special characters (displayed correctly without breaking layout), or shows validation error for disallowed characters" },
          { action: "Enter Unicode characters including emojis (😀), accented letters (café, naïve), and non-Latin scripts (日本語) in text fields", expected: "System handles Unicode correctly - characters are saved and displayed properly without corruption, encoding issues, or display problems" },
          { action: "Enter potential XSS attack strings such as <script>alert('test')</script> or javascript:alert(1) in input fields", expected: "System sanitizes input - script tags are escaped or stripped, no JavaScript execution occurs, input is stored safely and displays as plain text" },
          { action: "Test rapid repeated submission by clicking Submit button multiple times quickly (double-click or spam-click)", expected: "System prevents duplicate submissions - button becomes disabled after first click, or system detects and rejects duplicate requests, only one record is created" },
          { action: "Verify system stability by checking for any errors in browser console and confirming normal operation continues", expected: "No JavaScript errors in console, system remains responsive, subsequent operations work normally, no data corruption occurred" }
        ]
      }
    ]
  };

  const typeScenarios = scenarios[scenarioType] || scenarios['Positive'];
  
  for (const scenario of typeScenarios) {
    testCases.push({
      id: '',
      workItemType: 'Test Case',
      title: scenario.title.substring(0, 128),
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath: areaPath,
      assignedTo: assignedTo,
      state: state,
      scenarioType: scenarioType
    });

    for (let i = 0; i < scenario.steps.length; i++) {
      testCases.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(i + 1),
        stepAction: scenario.steps[i].action,
        stepExpected: scenario.steps[i].expected,
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: scenarioType
      });
    }
  }

  return testCases;
}

function generateFallbackTestCases(acceptanceCriteria, numberOfScenarios, numberOfSteps, scenarioType, areaPath, assignedTo, state) {
  console.log('🔄 Generating detailed fallback test cases...');
  
  const allTestCases = [];
  const titles = generateFallbackTitles(acceptanceCriteria, numberOfScenarios, scenarioType);
  
  for (let i = 0; i < numberOfScenarios; i++) {
    const title = titles[i];
    const steps = generateDetailedFallbackSteps(title, numberOfSteps, scenarioType);
    
    allTestCases.push({
      id: '',
      workItemType: 'Test Case',
      title: title.substring(0, 128),
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath: areaPath,
      assignedTo: assignedTo,
      state: state,
      scenarioType: scenarioType
    });

    for (let j = 0; j < steps.length; j++) {
      allTestCases.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(j + 1),
        stepAction: steps[j].action,
        stepExpected: steps[j].expected,
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: scenarioType
      });
    }
  }

  console.log(`✅ Generated ${allTestCases.length} detailed fallback rows`);
  return allTestCases;
}

function generateFallbackAllScenarios(acceptanceCriteria, areaPath, assignedTo, state) {
  console.log('🔄 Generating comprehensive fallback test cases...');
  
  const allTestCases = [];
  const scenarioTypes = ['Positive', 'Negative', 'Boundary', 'Edge'];

  for (const type of scenarioTypes) {
    const scenarios = getFallbackScenariosForType(acceptanceCriteria, type, areaPath, assignedTo, state);
    allTestCases.push(...scenarios);
  }

  console.log(`✅ Generated ${allTestCases.length} comprehensive fallback rows`);
  return allTestCases;
}

module.exports = { generateTestCasesWithGroq };