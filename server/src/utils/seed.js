const MemoryStorage = require('../storage/memoryStorage');

const sampleTestCases = [
  {
    id: 'TC-SAMPLE-001',
    workItemType: 'Test Case',
    title: 'Valid User Login - Positive Test',
    scenarioType: 'Positive Scenarios',
    acceptanceCriteria: 'User should be able to login with valid email and password',
    testSteps: [
      { 
        stepNumber: 1, 
        action: 'Navigate to login page and verify all elements are displayed', 
        expected: 'Login page loads successfully with email, password fields and login button',
        data: 'URL: /login'
      },
      { 
        stepNumber: 2, 
        action: 'Enter valid email and password credentials', 
        expected: 'Credentials are accepted without errors',
        data: 'Email: test@example.com, Password: ValidPass123!'
      },
      { 
        stepNumber: 3, 
        action: 'Click the login button', 
        expected: 'User is successfully authenticated and redirected to dashboard',
        data: 'Expected redirect: /dashboard'
      }
    ],
    priority: 'High',
    environment: 'QA',
    platforms: ['Web', 'Mobile'],
    state: 'Active',
    areaPath: 'Testing/Authentication',
    assignedTo: 'QA Team',
    tags: ['login', 'authentication'],
    sessionId: 'SESSION-SEED',
    createdBy: 'System'
  },
  {
    id: 'TC-SAMPLE-002',
    workItemType: 'Test Case',
    title: 'Invalid User Login - Negative Test',
    scenarioType: 'Negative Scenarios',
    acceptanceCriteria: 'User should not be able to login with invalid credentials',
    testSteps: [
      { 
        stepNumber: 1, 
        action: 'Navigate to login page', 
        expected: 'Login page loads successfully',
        data: 'URL: /login'
      },
      { 
        stepNumber: 2, 
        action: 'Enter invalid email or password', 
        expected: 'System displays appropriate error message',
        data: 'Email: invalid@test.com, Password: WrongPass'
      },
      { 
        stepNumber: 3, 
        action: 'Verify login is blocked', 
        expected: 'User remains on login page, cannot access protected pages',
        data: 'Error: Invalid credentials'
      }
    ],
    priority: 'High',
    environment: 'QA',
    platforms: ['Web', 'Mobile'],
    state: 'Active',
    areaPath: 'Testing/Authentication',
    assignedTo: 'QA Team',
    tags: ['login', 'negative'],
    sessionId: 'SESSION-SEED',
    createdBy: 'System'
  },
  {
    id: 'TC-SAMPLE-003',
    workItemType: 'Test Case',
    title: 'API Login Endpoint - Test',
    scenarioType: 'API Scenarios',
    acceptanceCriteria: 'Login API should return JWT token on valid credentials',
    testSteps: [
      { 
        stepNumber: 1, 
        action: 'Send POST request to /api/auth/login', 
        expected: 'API responds with 200 status code',
        data: '{"email": "test@example.com", "password": "ValidPass123!"}'
      },
      { 
        stepNumber: 2, 
        action: 'Verify response contains JWT token', 
        expected: 'Response includes valid JWT token in body',
        data: 'Expected: {token: "eyJhbGc..."}'
      },
      { 
        stepNumber: 3, 
        action: 'Use token to access protected endpoint', 
        expected: 'Token is accepted and user data is returned',
        data: 'Header: Authorization: Bearer <token>'
      }
    ],
    priority: 'Critical',
    environment: 'QA',
    platforms: ['API'],
    state: 'New',
    areaPath: 'Testing/API',
    assignedTo: 'API Team',
    tags: ['api', 'authentication'],
    sessionId: 'SESSION-SEED',
    createdBy: 'System'
  },
  {
    id: 'TC-SAMPLE-004',
    workItemType: 'Test Case',
    title: 'Boundary - Maximum Password Length',
    scenarioType: 'Boundary Scenarios',
    acceptanceCriteria: 'System should handle password length limits correctly',
    testSteps: [
      { 
        stepNumber: 1, 
        action: 'Enter password at maximum allowed length (128 chars)', 
        expected: 'Password is accepted',
        data: 'Length: 128 characters'
      },
      { 
        stepNumber: 2, 
        action: 'Try to enter password exceeding max length', 
        expected: 'System prevents input or shows validation error',
        data: 'Length: 129+ characters'
      },
      { 
        stepNumber: 3, 
        action: 'Verify password validation', 
        expected: 'Only valid length passwords are accepted',
        data: 'Valid range: 8-128 characters'
      }
    ],
    priority: 'Medium',
    environment: 'QA',
    platforms: ['Web'],
    state: 'New',
    areaPath: 'Testing/Validation',
    assignedTo: 'QA Team',
    tags: ['boundary', 'validation'],
    sessionId: 'SESSION-SEED',
    createdBy: 'System'
  },
  {
    id: 'TC-SAMPLE-005',
    workItemType: 'Test Case',
    title: 'User Registration - Positive Flow',
    scenarioType: 'Positive Scenarios',
    acceptanceCriteria: 'New user should be able to register with valid details',
    testSteps: [
      { 
        stepNumber: 1, 
        action: 'Navigate to registration page', 
        expected: 'Registration form is displayed with all required fields',
        data: 'URL: /register'
      },
      { 
        stepNumber: 2, 
        action: 'Fill in all required fields with valid data', 
        expected: 'All fields accept valid input without errors',
        data: 'Name, Email, Password, Confirm Password'
      },
      { 
        stepNumber: 3, 
        action: 'Submit registration form', 
        expected: 'User account is created successfully',
        data: 'Success message displayed'
      },
      { 
        stepNumber: 4, 
        action: 'Verify confirmation email sent', 
        expected: 'Confirmation email received with activation link',
        data: 'Email verification required'
      }
    ],
    priority: 'High',
    environment: 'QA',
    platforms: ['Web', 'Mobile'],
    state: 'New',
    areaPath: 'Testing/Registration',
    assignedTo: 'QA Team',
    tags: ['registration', 'signup'],
    sessionId: 'SESSION-SEED',
    createdBy: 'System'
  }
];

const seedDatabase = () => {
  console.log('🌱 Starting in-memory storage seeding...');

  // Clear existing data
  const deletedCount = MemoryStorage.deleteAll();
  console.log(`🗑️  Cleared ${deletedCount} existing test cases`);

  // Insert sample data
  let insertedCount = 0;
  sampleTestCases.forEach((tcData) => {
    MemoryStorage.create(tcData);
    insertedCount++;
    console.log(`   ${insertedCount}. ${tcData.id} - ${tcData.title}`);
  });

  console.log(`✅ Inserted ${insertedCount} sample test cases`);
  console.log('\n🎉 In-memory storage seeding completed successfully!');
  console.log(`📊 Total test cases in memory: ${MemoryStorage.count()}`);
  console.log('\n⚠️  Note: Data will be lost when server restarts');
};

// Run the seeder if called directly
if (require.main === module) {
  seedDatabase();
  console.log('\n✅ Seeding complete! Start your server with: npm run dev');
} else {
  // Export for use in server
  module.exports = seedDatabase;
}