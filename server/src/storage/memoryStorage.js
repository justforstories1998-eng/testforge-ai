const { v4: uuidv4 } = require('uuid');

// In-memory storage
let testCases = [];
let statistics = {
  totalGenerated: 0,
  byScenarioType: {},
  byPriority: {},
  byState: {}
};

class MemoryStorage {
  // Create test case
  static create(testCaseData) {
    const testCase = {
      _id: uuidv4(),
      ...testCaseData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    testCases.push(testCase);
    this.updateStatistics(testCase);
    
    return testCase;
  }

  // Find all test cases with filters
  static findAll(filters = {}) {
    let results = [...testCases];

    if (filters.sessionId) {
      results = results.filter(tc => tc.sessionId === filters.sessionId);
    }

    if (filters.scenarioType) {
      results = results.filter(tc => tc.scenarioType === filters.scenarioType);
    }

    if (filters.state) {
      results = results.filter(tc => tc.state === filters.state);
    }

    if (filters.priority) {
      results = results.filter(tc => tc.priority === filters.priority);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply limit
    if (filters.limit) {
      results = results.slice(0, parseInt(filters.limit));
    }

    return results;
  }

  // Find by ID
  static findById(id) {
    return testCases.find(tc => tc._id === id);
  }

  // Update test case
  static update(id, updateData) {
    const index = testCases.findIndex(tc => tc._id === id);
    
    if (index === -1) {
      return null;
    }

    testCases[index] = {
      ...testCases[index],
      ...updateData,
      updatedAt: new Date()
    };

    return testCases[index];
  }

  // Delete test case
  static delete(id) {
    const index = testCases.findIndex(tc => tc._id === id);
    
    if (index === -1) {
      return null;
    }

    const deletedTestCase = testCases.splice(index, 1)[0];
    return deletedTestCase;
  }

  // Delete all
  static deleteAll() {
    const count = testCases.length;
    testCases = [];
    this.resetStatistics();
    return count;
  }

  // Get count
  static count(filters = {}) {
    return this.findAll(filters).length;
  }

  // Get statistics
  static getStatistics() {
    const total = testCases.length;
    
    const byScenarioType = testCases.reduce((acc, tc) => {
      acc[tc.scenarioType] = (acc[tc.scenarioType] || 0) + 1;
      return acc;
    }, {});

    const byState = testCases.reduce((acc, tc) => {
      acc[tc.state] = (acc[tc.state] || 0) + 1;
      return acc;
    }, {});

    const byPriority = testCases.reduce((acc, tc) => {
      acc[tc.priority] = (acc[tc.priority] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      byScenarioType: Object.entries(byScenarioType).map(([type, count]) => ({ _id: type, count })),
      byState: Object.entries(byState).map(([state, count]) => ({ _id: state, count })),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ _id: priority, count }))
    };
  }

  // Update statistics
  static updateStatistics(testCase) {
    statistics.totalGenerated++;
    statistics.byScenarioType[testCase.scenarioType] = 
      (statistics.byScenarioType[testCase.scenarioType] || 0) + 1;
    statistics.byPriority[testCase.priority] = 
      (statistics.byPriority[testCase.priority] || 0) + 1;
    statistics.byState[testCase.state] = 
      (statistics.byState[testCase.state] || 0) + 1;
  }

  // Reset statistics
  static resetStatistics() {
    statistics = {
      totalGenerated: 0,
      byScenarioType: {},
      byPriority: {},
      byState: {}
    };
  }

  // Get all data (for export)
  static getAllData() {
    return testCases;
  }
}

module.exports = MemoryStorage;