// In-memory storage for test cases
let testCases = [];
let idCounter = 1;

class TestCase {
  constructor(data) {
    this._id = data._id || `tc-${Date.now()}-${idCounter++}`;
    this.id = data.id || '';
    this.testCaseId = this.id;
    this.workItemType = data.workItemType || '';
    this.title = data.title || '';
    this.testStep = data.testStep || '';
    this.stepAction = data.stepAction || '';
    this.stepExpected = data.stepExpected || '';
    this.areaPath = data.areaPath || '';
    this.assignedTo = data.assignedTo || 'Unassigned';
    this.state = data.state || 'New';
    this.scenarioType = data.scenarioType || 'Positive';
    this.priority = data.priority || 'Medium';
    this.environment = data.environment || 'Testing';
    this.platforms = data.platforms || ['Web'];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  save() {
    testCases.push(this);
    return Promise.resolve(this);
  }

  static find() {
    return {
      sort: (sortOptions) => {
        const sorted = [...testCases].sort((a, b) => {
          if (sortOptions.createdAt === -1) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
        return Promise.resolve(sorted);
      }
    };
  }

  static findById(id) {
    // If id is a number, treat it as index
    if (!isNaN(id)) {
      const index = parseInt(id);
      if (index >= 0 && index < testCases.length) {
        return Promise.resolve(testCases[index]);
      }
    }
    // Otherwise search by _id field
    const testCase = testCases.find(tc => tc._id === id || tc.id === id);
    return Promise.resolve(testCase || null);
  }

  static findByIdAndUpdate(id, updateData, options) {
    let index = -1;
    
    if (!isNaN(id)) {
      index = parseInt(id);
    } else {
      index = testCases.findIndex(tc => tc._id === id || tc.id === id);
    }
    
    if (index >= 0 && index < testCases.length) {
      testCases[index] = { ...testCases[index], ...updateData, updatedAt: new Date() };
      return Promise.resolve(testCases[index]);
    }
    return Promise.resolve(null);
  }

  static findByIdAndDelete(id) {
    let index = -1;
    
    if (!isNaN(id)) {
      index = parseInt(id);
    } else {
      index = testCases.findIndex(tc => tc._id === id || tc.id === id);
    }
    
    if (index >= 0 && index < testCases.length) {
      const deleted = testCases.splice(index, 1)[0];
      return Promise.resolve(deleted);
    }
    return Promise.resolve(null);
  }

  static deleteMany(filter = {}) {
    const count = testCases.length;
    testCases = [];
    return Promise.resolve({ deletedCount: count });
  }

  static countDocuments() {
    return Promise.resolve(testCases.length);
  }

  static aggregate(pipeline) {
    return new Promise((resolve) => {
      const groupStage = pipeline.find(stage => stage.$group);
      if (!groupStage) {
        resolve([]);
        return;
      }

      const fieldPath = groupStage.$group._id;
      if (!fieldPath) {
        resolve([]);
        return;
      }

      const field = fieldPath.replace('$', '');
      const grouped = {};

      testCases.forEach(tc => {
        const value = tc[field];
        if (value) {
          if (!grouped[value]) grouped[value] = 0;
          grouped[value]++;
        }
      });

      const result = Object.entries(grouped).map(([key, count]) => ({
        _id: key,
        count: count
      }));

      resolve(result);
    });
  }

  // Get all test cases (for export)
  static getAll() {
    return testCases;
  }

  // Clear all test cases
  static clearAll() {
    const count = testCases.length;
    testCases = [];
    return count;
  }
}

module.exports = TestCase;