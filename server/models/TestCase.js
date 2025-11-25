// In-memory storage for test cases
let testCases = [];

class TestCase {
  constructor(data) {
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
    this.index = testCases.length; // Store position index
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
            return b.createdAt - a.createdAt;
          }
          return a.createdAt - b.createdAt;
        });
        return Promise.resolve(sorted);
      }
    };
  }

  static findById(id) {
    // If id is a number, treat it as index
    if (typeof id === 'number' || !isNaN(id)) {
      const index = parseInt(id);
      return Promise.resolve(testCases[index]);
    }
    // Otherwise search by id field
    const testCase = testCases.find(tc => tc.id === id || tc.testCaseId === id);
    return Promise.resolve(testCase);
  }

  static findByIdAndUpdate(id, updateData, options) {
    let index;
    if (typeof id === 'number' || !isNaN(id)) {
      index = parseInt(id);
    } else {
      index = testCases.findIndex(tc => tc.id === id || tc.testCaseId === id);
    }
    
    if (index !== -1) {
      testCases[index] = { ...testCases[index], ...updateData, updatedAt: new Date() };
      return Promise.resolve(testCases[index]);
    }
    return Promise.resolve(null);
  }

  static findByIdAndDelete(id) {
    let index;
    if (typeof id === 'number' || !isNaN(id)) {
      index = parseInt(id);
    } else {
      index = testCases.findIndex(tc => tc.id === id || tc.testCaseId === id);
    }
    
    if (index !== -1) {
      const deleted = testCases.splice(index, 1)[0];
      return Promise.resolve(deleted);
    }
    return Promise.resolve(null);
  }

  static deleteMany() {
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

      const field = groupStage.$group._id.replace('$', '');
      const grouped = {};

      testCases.forEach(tc => {
        const value = tc[field] || 'Unknown';
        if (!grouped[value]) grouped[value] = 0;
        grouped[value]++;
      });

      const result = Object.entries(grouped).map(([key, count]) => ({
        _id: key,
        count: count
      }));

      resolve(result);
    });
  }
}

module.exports = TestCase;