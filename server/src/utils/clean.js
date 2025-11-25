const MemoryStorage = require('../storage/memoryStorage');

const cleanDatabase = () => {
  console.log('🧹 Starting in-memory storage cleanup...');

  const countBefore = MemoryStorage.count();
  console.log(`📊 Test cases before cleanup: ${countBefore}`);

  const deletedCount = MemoryStorage.deleteAll();
  console.log(`🗑️  Deleted ${deletedCount} test cases`);

  const countAfter = MemoryStorage.count();
  console.log(`📊 Test cases after cleanup: ${countAfter}`);

  if (countAfter === 0) {
    console.log('✅ In-memory storage cleaned successfully!');
  } else {
    console.log('⚠️  Warning: Some test cases may remain');
  }
};

// Run the cleaner if called directly
if (require.main === module) {
  console.log('\n⚠️  WARNING: This will delete ALL test cases from memory!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

  setTimeout(() => {
    cleanDatabase();
    console.log('\n✅ Cleanup complete!');
  }, 3000);
} else {
  // Export for use in server
  module.exports = cleanDatabase;
}