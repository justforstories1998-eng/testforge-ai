const TestCase = require('../models/TestCase');

const cleanDatabase = () => {
  console.log('🧹 Cleaning database...');

  const count = TestCase.clearAll();
  console.log(`🗑️ Deleted ${count} test cases`);
  console.log('✅ Database cleaned!');
};

if (require.main === module) {
  cleanDatabase();
}

module.exports = cleanDatabase;