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

  console.log('🚀 Starting test case generation...');
  console.log(`📊 Mode: ${isAllMode ? 'ALL (Comprehensive)' : scenarioType}`);
  console.log(`📍 Area Path: ${areaPath}, Assigned To: ${assignedTo}, State: ${state}`);

  try {
    if (isAllMode) {
      return await generateComprehensiveTestCases(acceptanceCriteria, {
        environment,
        platforms,
        areaPath,
        assignedTo,
        state
      });
    } else {
      const titles = await generateDetailedTitles(acceptanceCriteria, numberOfScenarios, scenarioType, platforms);
      
      const allTestCases = [];
      
      for (let i = 0; i < numberOfScenarios; i++) {
        const title = titles[i];
        const steps = await generateDetailedSteps(title, acceptanceCriteria, numberOfSteps, scenarioType);
        
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
        
        for (let step = 0; step < steps.length; step++) {
          allTestCases.push({
            id: '',
            workItemType: '',
            title: '',
            testStep: String(step + 1),
            stepAction: steps[step].action,
            stepExpected: steps[step].expected,
            areaPath: areaPath,
            assignedTo: assignedTo,
            state: state,
            scenarioType: scenarioType
          });
        }
        
        console.log(`✅ Generated scenario ${i + 1}/${numberOfScenarios}: ${title.substring(0, 60)}...`);
      }
      
      console.log(`✅ Total rows generated: ${allTestCases.length}`);
      return allTestCases;
    }
    
  } catch (error) {
    console.error('❌ Error in generation:', error.message);
    if (isAllMode) {
      return generateFallbackComprehensiveTestCases(acceptanceCriteria, areaPath, assignedTo, state);
    }
    return generateFallbackTestCases(acceptanceCriteria, numberOfScenarios, numberOfSteps, scenarioType, areaPath, assignedTo, state);
  }
}

// ========== COMPREHENSIVE MODE (ALL) ==========
async function generateComprehensiveTestCases(acceptanceCriteria, options) {
  const { environment, platforms, areaPath, assignedTo, state } = options;

  console.log('🔍 Starting comprehensive deep analysis of acceptance criteria...');

  const analysis = await deepAnalyzeAcceptanceCriteria(acceptanceCriteria);
  console.log(`📋 Deep analysis complete`);

  const allTestCases = [];
  
  const scenarioTypes = [
    { type: 'Positive', description: 'Valid/expected behavior scenarios' },
    { type: 'Negative', description: 'Invalid/error handling scenarios' },
    { type: 'Boundary', description: 'Edge/limit testing scenarios' },
    { type: 'Edge', description: 'Unusual/corner case scenarios' }
  ];

  for (const scenario of scenarioTypes) {
    console.log(`🎯 Generating detailed ${scenario.type} scenarios...`);
    
    const scenarios = await generateDetailedScenariosForType(
      acceptanceCriteria, 
      analysis, 
      scenario.type, 
      platforms
    );

    for (const scenarioData of scenarios) {
      allTestCases.push({
        id: '',
        workItemType: 'Test Case',
        title: scenarioData.title,
        testStep: '',
        stepAction: '',
        stepExpected: '',
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: scenario.type
      });

      for (let i = 0; i < scenarioData.steps.length; i++) {
        allTestCases.push({
          id: '',
          workItemType: '',
          title: '',
          testStep: String(i + 1),
          stepAction: scenarioData.steps[i].action,
          stepExpected: scenarioData.steps[i].expected,
          areaPath: areaPath,
          assignedTo: assignedTo,
          state: state,
          scenarioType: scenario.type
        });
      }
    }

    console.log(`✅ Generated ${scenarios.length} detailed ${scenario.type} scenarios`);
  }

  console.log(`🎉 Comprehensive generation complete: ${allTestCases.length} total rows`);
  return allTestCases;
}

async function deepAnalyzeAcceptanceCriteria(acceptanceCriteria) {
  const prompt = `You are a senior QA architect. Perform a DEEP ANALYSIS of the following acceptance criteria. Extract EVERY testable element - do not miss anything.

ACCEPTANCE CRITERIA:
"${acceptanceCriteria}"

Analyze thoroughly and return a JSON object with:

1. "features": Array of specific features/functionalities mentioned
2. "userRoles": Array of user types/roles involved (e.g., Admin, Student, Lecturer)
3. "actions": Array of all actions users can perform
4. "uiElements": Array of UI elements mentioned (buttons, forms, pages, modals)
5. "businessRules": Array of business logic/rules that must be verified
6. "validations": Array of validation rules and constraints
7. "conditions": Array of conditional behaviors (if X then Y)
8. "statuses": Array of different states/statuses mentioned
9. "dateTimeLogic": Array of any date/time related logic
10. "errorScenarios": Array of potential error conditions
11. "securityConcerns": Array of security-related aspects
12. "integrations": Array of system integrations or dependencies
13. "notifications": Array of any notification/alert requirements
14. "dataElements": Array of data fields/elements involved

Be EXHAUSTIVE. Every single word in the acceptance criteria matters.

Return ONLY valid JSON:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a senior QA architect performing deep analysis. Output ONLY valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 3000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return { features: [acceptanceCriteria] };

  } catch (error) {
    console.error('Deep analysis error:', error.message);
    return { features: [acceptanceCriteria] };
  }
}

async function generateDetailedScenariosForType(acceptanceCriteria, analysis, scenarioType, platforms) {
  const prompt = `You are a SENIOR QA ENGINEER creating HIGHLY DETAILED test cases for Azure DevOps.

ACCEPTANCE CRITERIA:
"${acceptanceCriteria}"

DEEP ANALYSIS RESULTS:
${JSON.stringify(analysis, null, 2)}

SCENARIO TYPE: ${scenarioType}
PLATFORMS: ${platforms.join(', ')}

CRITICAL REQUIREMENTS FOR TEST CASE TITLES:
1. MUST start with "Verify"
2. MUST be highly specific and descriptive
3. MUST clearly state WHO is doing WHAT and WHERE
4. MUST include the specific condition or scenario being tested
5. Maximum 128 characters but be as detailed as possible

EXAMPLE EXCELLENT TITLES (follow this style exactly):
- "Verify Admin can set release dates for individual course modules through Admin App"
- "Verify release date can be set using date picker with date and time selection"
- "Verify module remains hidden when current date is before release date"
- "Verify module remains hidden when release date is reached but previous modules are incomplete"
- "Verify module becomes visible only when both release date is reached AND previous modules are completed"
- "Verify students cannot see unreleased modules in their dashboard"
- "Verify students cannot access unreleased modules through direct URL manipulation"
- "Verify module automatically becomes visible at exact release date/time for eligible students"
- "Verify lecturers can edit release dates before module is published"
- "Verify system prevents setting release date in the past"
- "Verify module status displays as 'Scheduled' for modules with future release date"
- "Verify students see indicator 'This module will be available on [date]' for scheduled modules"
- "Verify timezone handling for release dates works correctly for users in different timezones"
- "Verify appropriate confirmation messages display when setting/updating release dates"
- "Verify audit log tracks all changes to module release dates"

CRITICAL REQUIREMENTS FOR TEST STEPS:
1. Each step action must be DETAILED and SPECIFIC
2. Each expected result must EXACTLY match what should happen for that specific action
3. Include specific UI elements, buttons, fields, messages
4. Include specific data values, formats, behaviors
5. Each step should be independently verifiable

EXAMPLE EXCELLENT STEPS:
Step Action: "Navigate to Admin App > Course Management > Select 'Introduction to Programming' course > Click on 'Module Settings' for Module 3"
Expected: "Module Settings panel opens displaying current module configuration including release date field showing 'Not Set' and module status showing 'Draft'"

Step Action: "Click on the 'Set Release Date' button next to the release date field"
Expected: "Date picker modal appears with calendar view, time selector (hour:minute dropdowns), and timezone indicator showing current user's timezone"

Step Action: "Select date '2024-03-15' from calendar and set time to '09:00 AM' in the time selector"
Expected: "Selected date and time are highlighted in the picker, preview shows 'March 15, 2024 at 9:00 AM (PST)' format"

Step Action: "Click 'Confirm' button to save the release date"
Expected: "Modal closes, success toast notification appears saying 'Release date set successfully for Module 3', module status changes from 'Draft' to 'Scheduled', release date field now displays 'Mar 15, 2024 9:00 AM'"

Generate ${scenarioType.toUpperCase()} test scenarios that cover ALL aspects from the analysis.

${scenarioType === 'Positive' ? `
POSITIVE SCENARIOS should verify:
- All happy path user journeys work correctly
- Each feature functions as specified
- All user roles can perform their allowed actions
- Correct success messages and confirmations appear
- Data is saved/updated correctly
- UI reflects changes immediately
- Navigation flows work as expected` : ''}

${scenarioType === 'Negative' ? `
NEGATIVE SCENARIOS should verify:
- Invalid inputs are rejected with clear error messages
- Unauthorized access attempts are blocked
- Required field validations work correctly
- Format validations (email, date, number) work correctly
- System handles missing data gracefully
- Permission restrictions are enforced
- Duplicate entries are prevented where applicable` : ''}

${scenarioType === 'Boundary' ? `
BOUNDARY SCENARIOS should verify:
- Minimum allowed values are accepted
- Maximum allowed values are accepted
- Values just below minimum are rejected
- Values just above maximum are rejected
- Empty/null inputs are handled correctly
- Character limits are enforced
- Date/time boundaries work correctly (past dates, future limits)` : ''}

${scenarioType === 'Edge' ? `
EDGE CASE SCENARIOS should verify:
- Special characters in inputs
- Very long text inputs
- Concurrent user actions
- Network timeout handling
- Session expiry scenarios
- Timezone edge cases (midnight, daylight saving)
- Rapid repeated actions (double-click, spam prevention)
- Browser back/forward navigation` : ''}

Return a JSON array with as many scenarios as needed to cover everything:
[
  {
    "title": "Verify specific detailed scenario title following the examples above",
    "steps": [
      { "action": "Detailed step action with specific UI elements and data", "expected": "Specific expected result matching exactly what should happen" }
    ]
  }
]

Generate 5-10 scenarios for this type. Each scenario should have 4-8 detailed steps.
Return ONLY the JSON array:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a SENIOR QA ENGINEER creating Azure DevOps test cases. You create HIGHLY DETAILED, SPECIFIC test cases following industry best practices. Your titles are descriptive and your steps are thorough. Output ONLY JSON arrays.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 6000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const scenarios = JSON.parse(arrayMatch[0]);
      
      return scenarios.map(scenario => ({
        title: scenario.title.startsWith('Verify') 
          ? scenario.title.substring(0, 128) 
          : `Verify ${scenario.title}`.substring(0, 128),
        steps: scenario.steps || []
      }));
    }
    
    return [];

  } catch (error) {
    console.error(`Error generating ${scenarioType} scenarios:`, error.message);
    return generateFallbackDetailedScenarios(acceptanceCriteria, scenarioType);
  }
}

// ========== STANDARD MODE FUNCTIONS ==========
async function generateDetailedTitles(acceptanceCriteria, numberOfScenarios, scenarioType, platforms) {
  const prompt = `You are a SENIOR QA ENGINEER creating test case titles for Azure DevOps.

ACCEPTANCE CRITERIA: "${acceptanceCriteria}"
SCENARIO TYPE: ${scenarioType}
PLATFORMS: ${platforms.join(', ')}
NUMBER OF TITLES NEEDED: ${numberOfScenarios}

CRITICAL REQUIREMENTS FOR TITLES:
1. MUST start with "Verify"
2. MUST be highly specific and descriptive
3. MUST clearly state WHO is doing WHAT and WHERE
4. MUST include the specific condition or scenario being tested
5. Each title tests a DIFFERENT aspect of the acceptance criteria
6. Maximum 128 characters but be as detailed as possible

EXAMPLE EXCELLENT TITLES (follow this style exactly):
- "Verify Admin can set release dates for individual course modules through Admin App"
- "Verify release date can be set using date picker with date and time selection"
- "Verify module remains hidden when current date is before release date"
- "Verify module remains hidden when release date is reached but previous modules are incomplete"
- "Verify module becomes visible only when both release date is reached AND previous modules are completed"
- "Verify students cannot see unreleased modules in their dashboard"
- "Verify students cannot access unreleased modules through direct URL manipulation"
- "Verify system prevents setting release date in the past"
- "Verify timezone handling for release dates works correctly for users in different timezones"
- "Verify audit log tracks all changes to module release dates"

BAD EXAMPLES (NEVER do this):
- "Verify login works" (too vague)
- "Verify validation" (not specific)
- "Verify user flow" (meaningless)
- "Verify feature functions correctly" (generic)

Generate ${numberOfScenarios} titles that are AS DETAILED as the excellent examples.

Return ONLY a JSON array of strings:
["title1", "title2", "title3"]`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a SENIOR QA ENGINEER. Create HIGHLY DETAILED, SPECIFIC test case titles. Output ONLY JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2500
    });

    let response = completion.choices[0]?.message?.content || '';
    response = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    response = response.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
    
    const titles = JSON.parse(response);
    
    return titles.map(title => {
      if (!title.startsWith('Verify')) {
        title = 'Verify ' + title;
      }
      return title.length > 128 ? title.substring(0, 125) + '...' : title;
    });
    
  } catch (error) {
    console.error('Error generating titles:', error.message);
    return generateFallbackTitles(acceptanceCriteria, numberOfScenarios, scenarioType);
  }
}

async function generateDetailedSteps(title, acceptanceCriteria, numberOfSteps, scenarioType) {
  const prompt = `You are a SENIOR QA ENGINEER creating DETAILED test steps for Azure DevOps.

TEST CASE TITLE: "${title}"
ACCEPTANCE CRITERIA: "${acceptanceCriteria}"
SCENARIO TYPE: ${scenarioType}
NUMBER OF STEPS: ${numberOfSteps}

CRITICAL REQUIREMENTS FOR STEPS:
1. Each step action must be DETAILED and SPECIFIC
2. Include exact UI elements (buttons, fields, menus, pages)
3. Include specific data values when applicable
4. Include navigation paths where relevant
5. Each expected result must EXACTLY match what should happen
6. Expected results should be specific and verifiable
7. Use natural language that testers can easily follow

EXAMPLE EXCELLENT STEPS:

Example 1:
Action: "Navigate to Admin App > Course Management > Select 'Introduction to Programming' course > Click on 'Module Settings' for Module 3"
Expected: "Module Settings panel opens displaying current module configuration including release date field showing 'Not Set' and module status showing 'Draft'"

Example 2:
Action: "Click on the 'Set Release Date' button next to the release date field"
Expected: "Date picker modal appears with calendar view, time selector (hour:minute dropdowns), and timezone indicator showing current user's timezone"

Example 3:
Action: "Enter invalid email format 'john.doe@' in the email field and click Submit"
Expected: "Form submission is blocked, email field shows red border, error message displays 'Please enter a valid email address' below the field"

Example 4:
Action: "Log in as Student user and navigate to Course Dashboard > My Courses > Introduction to Programming"
Expected: "Course page loads showing only released modules, Module 3 (scheduled for future date) is NOT visible in the module list"

Example 5:
Action: "Attempt to access unreleased Module 3 via direct URL: /courses/intro-programming/module/3"
Expected: "System redirects to course main page, toast notification displays 'This module is not yet available. It will be released on [date]'"

BAD EXAMPLES (NEVER do this):
Action: "Click button" (which button? where?)
Expected: "System works correctly" (what specifically happens?)

Action: "Enter data"
Expected: "Data is validated" (what data? what validation message?)

Generate ${numberOfSteps} DETAILED steps following the excellent examples above.

Return ONLY a JSON array:
[
  { "action": "detailed action", "expected": "specific expected result" }
]`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a SENIOR QA ENGINEER. Create HIGHLY DETAILED test steps with specific actions and expected results. Output ONLY JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 4000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    response = response.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
    
    const steps = JSON.parse(response);
    
    if (steps.length < numberOfSteps) {
      while (steps.length < numberOfSteps) {
        steps.push(generateContextualStep(title, steps.length + 1, scenarioType));
      }
    } else if (steps.length > numberOfSteps) {
      return steps.slice(0, numberOfSteps);
    }
    
    return steps;
    
  } catch (error) {
    console.error('Error generating steps:', error.message);
    return generateFallbackSteps(title, numberOfSteps, scenarioType);
  }
}

function generateContextualStep(title, stepNumber, scenarioType) {
  const titleLower = title.toLowerCase();
  
  // More contextual fallback steps based on title keywords
  if (titleLower.includes('release date') || titleLower.includes('schedule')) {
    const actions = [
      { action: 'Navigate to the module settings page and locate the release date configuration section', expected: 'Module settings page loads successfully displaying the release date field with current value and edit options' },
      { action: 'Click on the date picker button to open the release date selection modal', expected: 'Date picker modal opens showing calendar view with current month, time selection dropdowns, and timezone indicator' },
      { action: 'Select the target release date and time from the calendar and time picker controls', expected: 'Selected date and time are highlighted in the picker, formatted preview shows the complete date/time string' },
      { action: 'Click the Confirm/Save button to apply the release date settings', expected: 'Modal closes, success notification appears confirming the change, module status updates to reflect the scheduled state' },
      { action: 'Verify the release date is displayed correctly in the module list view', expected: 'Module list shows the formatted release date/time next to the module with appropriate status indicator' },
      { action: 'Check the audit log to confirm the release date change was recorded', expected: 'Audit log contains entry with timestamp, user who made change, old value, and new release date value' }
    ];
    return actions[Math.min(stepNumber - 1, actions.length - 1)];
  }
  
  if (titleLower.includes('hidden') || titleLower.includes('visible') || titleLower.includes('cannot see') || titleLower.includes('cannot access')) {
    const actions = [
      { action: 'Log in with the appropriate user credentials and navigate to the main dashboard', expected: 'User is authenticated successfully and dashboard loads showing personalized content based on user role' },
      { action: 'Navigate to the course or content area where restricted content should be hidden', expected: 'Course page loads displaying only the content that the user has permission to view' },
      { action: 'Verify that the restricted module/content is not displayed in the visible list', expected: 'The restricted content is completely absent from the UI, no placeholder or locked icon is shown' },
      { action: 'Attempt to access the restricted content via direct URL manipulation', expected: 'System blocks access and redirects user, displaying appropriate message about content availability' },
      { action: 'Check browser developer tools to ensure restricted content data is not loaded', expected: 'Network tab shows no API calls returning restricted content data, DOM does not contain hidden restricted elements' }
    ];
    return actions[Math.min(stepNumber - 1, actions.length - 1)];
  }
  
  if (titleLower.includes('admin') || titleLower.includes('lecturer') || titleLower.includes('permission')) {
    const actions = [
      { action: 'Log in with admin/lecturer credentials and verify access to administrative features', expected: 'Admin panel or management dashboard is accessible, all administrative options are visible and enabled' },
      { action: 'Navigate to the specific management section relevant to this test scenario', expected: 'Management section loads with full editing capabilities, all CRUD operations are available' },
      { action: 'Perform the administrative action being tested (create/edit/delete/configure)', expected: 'Action is executed successfully, confirmation message appears, changes are reflected in the UI immediately' },
      { action: 'Verify the changes persist by refreshing the page or navigating away and back', expected: 'All changes are maintained after page refresh, data integrity is preserved' },
      { action: 'Log in with a non-admin user and verify they cannot perform the same action', expected: 'Non-admin user sees limited interface, administrative options are hidden or disabled, access attempts are blocked' }
    ];
    return actions[Math.min(stepNumber - 1, actions.length - 1)];
  }
  
  // Generic detailed fallback
  const genericActions = [
    { action: `Navigate to the relevant section of the application to test: ${title.substring(7, 80)}`, expected: 'Page loads successfully with all required elements visible and interactive' },
    { action: 'Identify and interact with the primary UI element for this test scenario', expected: 'UI responds appropriately to interaction, any modals/dropdowns/forms appear as expected' },
    { action: 'Enter or select the required test data and trigger the main action', expected: scenarioType === 'Negative' ? 'System validates input and displays appropriate error message preventing the action' : 'Action is processed successfully, positive feedback is provided to the user' },
    { action: 'Verify the system state has changed (or not changed) as expected', expected: 'Data/UI reflects the expected state, all related elements are updated accordingly' },
    { action: 'Confirm the action results through secondary verification (refresh, different view, logs)', expected: 'Secondary verification confirms the action result, system maintains data consistency' }
  ];
  
  return genericActions[Math.min(stepNumber - 1, genericActions.length - 1)];
}

function generateFallbackDetailedScenarios(acceptanceCriteria, scenarioType) {
  const shortCriteria = acceptanceCriteria.substring(0, 50);
  
  const scenarios = {
    'Positive': [
      {
        title: `Verify user can successfully complete primary action described in: ${shortCriteria}`,
        steps: [
          { action: 'Navigate to the application and log in with valid user credentials', expected: 'User is authenticated and redirected to the main dashboard with personalized content' },
          { action: 'Navigate to the feature section relevant to the acceptance criteria', expected: 'Feature page loads with all required UI elements visible and enabled' },
          { action: 'Perform the primary action described in the acceptance criteria', expected: 'Action is executed successfully with appropriate success message displayed' },
          { action: 'Verify the expected outcome is reflected in the UI and data', expected: 'System state reflects the completed action, all related elements are updated' }
        ]
      }
    ],
    'Negative': [
      {
        title: `Verify system properly handles invalid input and displays error for: ${shortCriteria}`,
        steps: [
          { action: 'Navigate to the feature and prepare to enter invalid data', expected: 'Feature page is accessible and ready for input' },
          { action: 'Enter invalid or malformed data that violates validation rules', expected: 'Input fields accept the typed data without immediate blocking' },
          { action: 'Attempt to submit or trigger the action with invalid data', expected: 'System blocks the action and displays clear validation error message' },
          { action: 'Verify the invalid data was not saved and system remains in valid state', expected: 'No data changes occurred, user can correct input and retry' }
        ]
      }
    ],
    'Boundary': [
      {
        title: `Verify boundary conditions are correctly enforced for: ${shortCriteria}`,
        steps: [
          { action: 'Identify the boundary limits relevant to the feature (min/max values)', expected: 'Boundary limits are documented or discoverable from the UI' },
          { action: 'Test with exact minimum allowed value', expected: 'Minimum value is accepted and processed correctly' },
          { action: 'Test with exact maximum allowed value', expected: 'Maximum value is accepted and processed correctly' },
          { action: 'Test with values just outside the allowed boundaries', expected: 'Out-of-boundary values are rejected with appropriate error messages' }
        ]
      }
    ],
    'Edge': [
      {
        title: `Verify edge case handling and system stability for: ${shortCriteria}`,
        steps: [
          { action: 'Test the feature with empty or null input where applicable', expected: 'System handles empty input gracefully with appropriate validation' },
          { action: 'Test with special characters and unusual input formats', expected: 'Special characters are either properly escaped or rejected with clear message' },
          { action: 'Test rapid repeated actions to verify system stability', expected: 'System remains stable, prevents duplicate submissions, maintains data integrity' },
          { action: 'Verify system behavior after edge case by performing normal operation', expected: 'System continues to function normally after edge case testing' }
        ]
      }
    ]
  };

  return scenarios[scenarioType] || scenarios['Positive'];
}

function generateFallbackTitles(acceptanceCriteria, numberOfScenarios, scenarioType) {
  const titles = [];
  const shortCriteria = acceptanceCriteria.length > 50 ? acceptanceCriteria.substring(0, 50) : acceptanceCriteria;
  
  const templates = {
    'Positive': [
      `Verify user can successfully ${shortCriteria}`,
      `Verify system correctly processes ${shortCriteria}`,
      `Verify expected outcome is achieved when ${shortCriteria}`,
      `Verify UI correctly reflects state after ${shortCriteria}`,
      `Verify data is properly saved when ${shortCriteria}`
    ],
    'Negative': [
      `Verify system rejects invalid input for ${shortCriteria}`,
      `Verify appropriate error message displays when ${shortCriteria} fails`,
      `Verify unauthorized access is blocked for ${shortCriteria}`,
      `Verify system prevents invalid state for ${shortCriteria}`,
      `Verify validation rules are enforced for ${shortCriteria}`
    ],
    'Boundary': [
      `Verify minimum boundary is handled correctly for ${shortCriteria}`,
      `Verify maximum boundary is handled correctly for ${shortCriteria}`,
      `Verify boundary edge values work correctly for ${shortCriteria}`,
      `Verify out-of-bounds values are rejected for ${shortCriteria}`,
      `Verify limit enforcement works correctly for ${shortCriteria}`
    ],
    'Edge': [
      `Verify special character handling for ${shortCriteria}`,
      `Verify empty input handling for ${shortCriteria}`,
      `Verify concurrent access handling for ${shortCriteria}`,
      `Verify system stability under stress for ${shortCriteria}`,
      `Verify unusual user behavior handling for ${shortCriteria}`
    ]
  };
  
  const typeTemplates = templates[scenarioType] || templates['Positive'];
  
  for (let i = 0; i < numberOfScenarios; i++) {
    titles.push(typeTemplates[i % typeTemplates.length]);
  }
  
  return titles;
}

function generateFallbackSteps(title, numberOfSteps, scenarioType) {
  const steps = [];
  for (let i = 0; i < numberOfSteps; i++) {
    steps.push(generateContextualStep(title, i + 1, scenarioType));
  }
  return steps;
}

function generateFallbackTestCases(acceptanceCriteria, numberOfScenarios, numberOfSteps, scenarioType, areaPath, assignedTo, state) {
  console.log(`🔄 Generating ${numberOfScenarios} fallback scenarios with ${numberOfSteps} steps each...`);
  
  const testCases = [];
  const titles = generateFallbackTitles(acceptanceCriteria, numberOfScenarios, scenarioType);
  
  for (let i = 0; i < numberOfScenarios; i++) {
    const title = titles[i];
    const steps = generateFallbackSteps(title, numberOfSteps, scenarioType);
    
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

    for (let step = 0; step < steps.length; step++) {
      testCases.push({
        id: '',
        workItemType: '',
        title: '',
        testStep: String(step + 1),
        stepAction: steps[step].action,
        stepExpected: steps[step].expected,
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: scenarioType
      });
    }
  }

  console.log(`✅ Generated ${testCases.length} fallback test case rows`);
  return testCases;
}

function generateFallbackComprehensiveTestCases(acceptanceCriteria, areaPath, assignedTo, state) {
  const allTestCases = [];
  const scenarioTypes = ['Positive', 'Negative', 'Boundary', 'Edge'];

  for (const type of scenarioTypes) {
    const scenarios = generateFallbackDetailedScenarios(acceptanceCriteria, type);
    
    for (const scenario of scenarios) {
      allTestCases.push({
        id: '',
        workItemType: 'Test Case',
        title: scenario.title,
        testStep: '',
        stepAction: '',
        stepExpected: '',
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state,
        scenarioType: type
      });

      for (let i = 0; i < scenario.steps.length; i++) {
        allTestCases.push({
          id: '',
          workItemType: '',
          title: '',
          testStep: String(i + 1),
          stepAction: scenario.steps[i].action,
          stepExpected: scenario.steps[i].expected,
          areaPath: areaPath,
          assignedTo: assignedTo,
          state: state,
          scenarioType: type
        });
      }
    }
  }

  return allTestCases;
}

module.exports = { generateTestCasesWithGroq };