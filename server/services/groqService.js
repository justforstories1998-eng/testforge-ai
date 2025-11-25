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

  console.log('🚀 Starting enhanced test case generation...');
  console.log(`📊 Scenarios: ${numberOfScenarios}, Steps per scenario: ${numberOfSteps}`);
  console.log(`📍 Area Path: ${areaPath}, Assigned To: ${assignedTo}, State: ${state}`);

  try {
    // Generate detailed titles first
    const titles = await generateDetailedTitles(acceptanceCriteria, numberOfScenarios, scenarioType, platforms);
    
    // Generate steps for each title with natural language expected results
    const allTestCases = [];
    
    for (let i = 0; i < numberOfScenarios; i++) {
      const title = titles[i];
      
      // Generate natural language steps for this scenario
      const steps = await generateNaturalLanguageSteps(title, acceptanceCriteria, numberOfSteps, scenarioType);
      
      // Create header row with user-specified values
      allTestCases.push({
        id: '',
        workItemType: 'Test Case',
        title: title,
        testStep: '',
        stepAction: '',
        stepExpected: '',
        areaPath: areaPath,
        assignedTo: assignedTo,
        state: state
      });
      
      // Create detail rows with user-specified values
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
          state: state
        });
      }
      
      console.log(`✅ Generated scenario ${i + 1}/${numberOfScenarios}: ${title.substring(0, 60)}...`);
    }
    
    console.log(`✅ Total rows generated: ${allTestCases.length}`);
    return allTestCases;
    
  } catch (error) {
    console.error('❌ Error in generation:', error.message);
    return generateFallbackTestCases(acceptanceCriteria, numberOfScenarios, numberOfSteps, scenarioType, areaPath, assignedTo, state);
  }
}

async function generateDetailedTitles(acceptanceCriteria, numberOfScenarios, scenarioType, platforms) {
  const prompt = `You are creating test case titles for Azure DevOps. Generate ${numberOfScenarios} DETAILED and SPECIFIC test case titles.

ACCEPTANCE CRITERIA: "${acceptanceCriteria}"
SCENARIO TYPE: ${scenarioType}
PLATFORMS: ${platforms.join(', ')}

REQUIREMENTS FOR TITLES:
1. MUST start with "Verify"
2. Be HIGHLY SPECIFIC and DETAILED (not generic)
3. Include WHO, WHAT, WHERE, and THROUGH WHAT (when applicable)
4. Include specific conditions, validations, or edge cases
5. Maximum 128 characters
6. Each title must test a DIFFERENT aspect of the acceptance criteria

GOOD EXAMPLES:
- "Verify Admin can set release dates for individual course modules through Admin App"
- "Verify module remains hidden when current date is before release date"
- "Verify students cannot access unreleased modules through direct URL manipulation"
- "Verify timezone handling for release dates works correctly for users in different timezones"
- "Verify system prevents setting release date in the past"

BAD EXAMPLES (too generic):
- "Verify login works"
- "Verify user can access system"
- "Verify validation"

Generate ${numberOfScenarios} titles that are AS DETAILED as the good examples above.

Return ONLY a JSON array of strings:
["title1", "title2", "title3"]`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert QA engineer creating detailed, specific test case titles. Output ONLY JSON arrays of strings. No markdown, no explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 2000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    response = response.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
    
    const titles = JSON.parse(response);
    
    // Ensure all titles start with "Verify" and are under 128 chars
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

async function generateNaturalLanguageSteps(title, acceptanceCriteria, numberOfSteps, scenarioType) {
  const prompt = `You are creating test steps for this test case:

TITLE: "${title}"
ACCEPTANCE CRITERIA: "${acceptanceCriteria}"
TYPE: ${scenarioType}

Generate EXACTLY ${numberOfSteps} detailed test steps.

CRITICAL REQUIREMENTS:
1. Step Action: Write as clear, actionable steps in normal English
2. Step Expected: Write the SPECIFIC expected result for THAT EXACT action in natural, understandable English
3. Step Expected MUST match the Step Action logically
4. Use normal language that anyone can understand (not technical jargon)
5. Be specific about what should happen

GOOD EXAMPLES:

Step Action: "Navigate to Admin App and click on 'Course Management' section"
Step Expected: "Admin App opens and Course Management section is displayed with list of courses"

Step Action: "Select a course module and click on 'Set Release Date' button"
Step Expected: "Date picker calendar appears with options to select date and time for module release"

Step Action: "Select a future date and time, then click 'Save Release Date'"
Step Expected: "Module release date is saved successfully and confirmation message 'Release date set for [date]' is shown"

Step Action: "Log in as a student and navigate to the course page before the release date"
Step Expected: "Module is not visible in the student's course view and shows message 'This module will be available on [date]'"

BAD EXAMPLES (don't do this):

Step Action: "Click button"
Step Expected: "Subscription and Data Sync rules are correctly applied." ❌ (too generic, doesn't match action)

Step Action: "Enter data in field"
Step Expected: "System validates input" ❌ (not specific enough)

Generate ${numberOfSteps} steps in this format:
[
  {
    "action": "detailed action step",
    "expected": "specific expected result matching the action"
  }
]

Return ONLY the JSON array.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert QA engineer creating detailed test steps with natural language expected results. Output ONLY JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 3000
    });

    let response = completion.choices[0]?.message?.content || '';
    response = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    response = response.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
    
    const steps = JSON.parse(response);
    
    // Ensure we have exactly the right number of steps
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
  // Extract key action from title
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('login') || titleLower.includes('authenticate')) {
    const actions = [
      { action: 'Navigate to the login page and locate the email/username input field', expected: 'Login page loads successfully and email input field is visible and enabled' },
      { action: 'Enter valid email address or username in the input field', expected: 'Email is accepted and displayed in the field without any validation errors' },
      { action: 'Enter valid password in the password field and click Login button', expected: 'User is authenticated successfully and redirected to the dashboard or home page' },
      { action: 'Verify user session is created and user information is displayed', expected: 'User name and profile information appear in the header, confirming successful login' }
    ];
    return actions[Math.min(stepNumber - 1, actions.length - 1)];
  }
  
  if (titleLower.includes('release date') || titleLower.includes('schedule')) {
    const actions = [
      { action: 'Navigate to the module settings page and locate the release date section', expected: 'Module settings page opens and release date option is visible' },
      { action: 'Click on the date picker to select a release date and time', expected: 'Calendar picker appears showing current month with selectable dates' },
      { action: 'Select a specific date and time for the module release', expected: 'Selected date and time are displayed in the release date field' },
      { action: 'Save the release date configuration for the module', expected: 'Release date is saved successfully and confirmation message appears' }
    ];
    return actions[Math.min(stepNumber - 1, actions.length - 1)];
  }
  
  if (titleLower.includes('hidden') || titleLower.includes('visible') || titleLower.includes('access')) {
    const actions = [
      { action: 'Log in with user credentials and navigate to the course or content area', expected: 'User successfully logs in and course page or dashboard is displayed' },
      { action: 'Attempt to view or access the restricted module or content', expected: scenarioType === 'Negative' ? 'Access is denied and appropriate error or message is shown' : 'Module or content is displayed as expected based on permissions' },
      { action: 'Verify the visibility status and any related messages or indicators', expected: scenarioType === 'Negative' ? 'Content remains hidden and user sees message indicating restricted access' : 'Content is visible and accessible to the user' },
      { action: 'Check system logs or audit trail for access attempt', expected: 'Access attempt is logged correctly with user information and timestamp' }
    ];
    return actions[Math.min(stepNumber - 1, actions.length - 1)];
  }
  
  // Default generic steps
  const genericActions = [
    { action: `Perform action related to: ${title.substring(7, 80)}`, expected: scenarioType === 'Negative' ? 'Action is prevented or fails as expected with appropriate error message' : 'Action completes successfully and expected result is achieved' },
    { action: 'Verify the system state and any changes made by the action', expected: 'System reflects the changes correctly and all related data is updated' },
    { action: 'Check for any error messages, warnings, or confirmation messages', expected: scenarioType === 'Negative' ? 'Appropriate error or validation message is displayed to the user' : 'Success confirmation message is displayed' },
    { action: 'Validate that the functionality works as described in requirements', expected: 'All requirements are met and functionality behaves as expected' }
  ];
  
  return genericActions[Math.min(stepNumber - 1, genericActions.length - 1)];
}

function generateFallbackTitles(acceptanceCriteria, numberOfScenarios, scenarioType) {
  const titles = [];
  const aspects = [
    'can perform the main action',
    'receives correct validation messages',
    'sees appropriate feedback',
    'cannot bypass security restrictions',
    'experiences correct behavior under different conditions',
    'can access the feature from multiple entry points',
    'receives proper error handling',
    'can complete the workflow successfully',
    'sees correct data displayed',
    'cannot perform unauthorized actions'
  ];
  
  for (let i = 0; i < numberOfScenarios; i++) {
    const aspect = aspects[i % aspects.length];
    const shortCriteria = acceptanceCriteria.length > 60 
      ? acceptanceCriteria.substring(0, 60) + '...'
      : acceptanceCriteria;
    titles.push(`Verify ${scenarioType.toLowerCase()} scenario where user ${aspect} for: ${shortCriteria}`);
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
    
    // Header row with user-specified values
    testCases.push({
      id: '',
      workItemType: 'Test Case',
      title: title,
      testStep: '',
      stepAction: '',
      stepExpected: '',
      areaPath: areaPath,
      assignedTo: assignedTo,
      state: state
    });

    // Step rows with user-specified values
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
        state: state
      });
    }
  }

  console.log(`✅ Generated ${testCases.length} fallback test case rows`);
  return testCases;
}

module.exports = { generateTestCasesWithGroq };