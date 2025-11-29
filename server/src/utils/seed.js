const TestCase = require('../models/TestCase');

const sampleTestCases = [
  {
    id: 'TC-SAMPLE-001',
    workItemType: 'Test Case',
    title: 'Verify user can login with valid credentials',
    scenarioType: 'Positive',
    priority: 'High',
    state: 'New',
    areaPath: 'Testing/Authentication',
    assignedTo: 'QA Team'
  },
  {
    id: '',
    workItemType: '',
    title: '',
    testStep: '1',
    stepAction: 'Navigate to login page',
    stepExpected: 'Login page loads successfully',
    areaPath: 'Testing/Authentication',
    assignedTo: 'QA Team',
    state: 'New'
  },
  {
    id: '',
    workItemType: '',
    title: '',
    testStep: '2',
    stepAction: 'Enter valid email and password',
    stepExpected: 'Credentials accepted without errors',
    areaPath: 'Testing/Authentication',
    assignedTo: 'QA Team',
    state: 'New'
  },
  {
    id: '',
    workItemType: '',
    title: '',
    testStep: '3',
    stepAction: 'Click login button',
    stepExpected: 'User is redirected to dashboard',
    areaPath: 'Testing/Authentication',
    assignedTo: 'QA Team',
    state: 'New'
  }
];

const seedDatabase = async () => {
  console.log('🌱 Seeding database...');

  // Clear existing data
  TestCase.clearAll();
  console.log('🗑️ Cleared existing test cases');

  // Insert sample data
  for (const tcData of sampleTestCases) {
    const testCase = new TestCase(tcData);
    await testCase.save();
  }

  console.log(`✅ Inserted ${sampleTestCases.length} sample test cases`);
  console.log('🎉 Seeding completed!');
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;