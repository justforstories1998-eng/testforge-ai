import React, { useState } from 'react';
import './TestCaseForm.css';

function TestCaseForm({ onGenerate, loading }) {
  const [formData, setFormData] = useState({
    acceptanceCriteria: '',
    scenarioType: 'Positive',
    priority: 'High',
    numberOfScenarios: 3,
    numberOfSteps: 4,
    environment: 'Testing',
    platforms: ['Web'],
    state: 'New',
    assignedTo: 'Unassigned',
    areaPath: 'Subscription/Billing/Data'
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handlePlatformChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      platforms: checked
        ? [...prev.platforms, value]
        : prev.platforms.filter(p => p !== value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.acceptanceCriteria.trim()) {
      setError('Please enter acceptance criteria');
      return;
    }

    if (formData.acceptanceCriteria.trim().length < 10) {
      setError('Acceptance criteria must be at least 10 characters');
      return;
    }

    if (formData.platforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    if (formData.numberOfScenarios < 1) {
      setError('Number of test cases must be at least 1');
      return;
    }

    if (formData.numberOfSteps < 1) {
      setError('Number of steps must be at least 1');
      return;
    }

    if (formData.numberOfScenarios > 50) {
      setError('Please limit to 50 test cases per generation for optimal performance');
      return;
    }

    if (formData.numberOfSteps > 20) {
      setError('Please limit to 20 steps per test case for optimal performance');
      return;
    }

    const result = await onGenerate(formData);
    
    if (result && !result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="test-case-form">
      <div className="form-header">
        <h2>🎯 Generate Test Cases</h2>
        <p>Fill in the details below to generate AI-powered test cases in Azure DevOps format</p>
      </div>

      {error && (
        <div className="form-error">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="acceptanceCriteria">
            Acceptance Criteria *
            <span className="label-hint">Describe what needs to be tested (minimum 10 characters)</span>
          </label>
          <textarea
            id="acceptanceCriteria"
            name="acceptanceCriteria"
            value={formData.acceptanceCriteria}
            onChange={handleChange}
            placeholder="Example: User should be able to login with valid email and password. The system should validate credentials and redirect to dashboard upon successful authentication."
            rows="5"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="scenarioType">
              Scenario Type
              <span className="label-hint">Type of test scenario</span>
            </label>
            <select
              id="scenarioType"
              name="scenarioType"
              value={formData.scenarioType}
              onChange={handleChange}
            >
              <option value="Positive">✓ Positive</option>
              <option value="Negative">✗ Negative</option>
              <option value="Boundary">⚡ Boundary</option>
              <option value="Edge">🔍 Edge Case</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">
              Priority
              <span className="label-hint">Test case priority</span>
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="numberOfScenarios">
              Number of Test Cases
              <span className="label-hint">How many test case scenarios to generate (max 50 recommended)</span>
            </label>
            <input
              type="number"
              id="numberOfScenarios"
              name="numberOfScenarios"
              value={formData.numberOfScenarios}
              onChange={handleChange}
              min="1"
              max="50"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="numberOfSteps">
              Steps per Test Case
              <span className="label-hint">Number of steps in each test case (max 20 recommended)</span>
            </label>
            <input
              type="number"
              id="numberOfSteps"
              name="numberOfSteps"
              value={formData.numberOfSteps}
              onChange={handleChange}
              min="1"
              max="20"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="environment">
              Environment
              <span className="label-hint">Testing environment</span>
            </label>
            <select
              id="environment"
              name="environment"
              value={formData.environment}
              onChange={handleChange}
            >
              <option value="Development">Development</option>
              <option value="Testing">Testing</option>
              <option value="Staging">Staging</option>
              <option value="Production">Production</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="areaPath">
              Area Path
              <span className="label-hint">Azure DevOps area path</span>
            </label>
            <input
              type="text"
              id="areaPath"
              name="areaPath"
              value={formData.areaPath}
              onChange={handleChange}
              placeholder="Subscription/Billing/Data"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="assignedTo">
              Assigned To
              <span className="label-hint">Who will be assigned to these test cases</span>
            </label>
            <input
              type="text"
              id="assignedTo"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              placeholder="Enter name or leave as 'Unassigned'"
            />
          </div>

          <div className="form-group">
            <label htmlFor="state">
              State
              <span className="label-hint">Initial state of test cases</span>
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="New, Active, Resolved, etc."
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            Platforms *
            <span className="label-hint">Select target platforms</span>
          </label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                value="Web"
                checked={formData.platforms.includes('Web')}
                onChange={handlePlatformChange}
              />
              <span>🌐 Web</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                value="Mobile"
                checked={formData.platforms.includes('Mobile')}
                onChange={handlePlatformChange}
              />
              <span>📱 Mobile</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                value="Desktop"
                checked={formData.platforms.includes('Desktop')}
                onChange={handlePlatformChange}
              />
              <span>💻 Desktop</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                value="API"
                checked={formData.platforms.includes('API')}
                onChange={handlePlatformChange}
              />
              <span>🔌 API</span>
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating Test Cases...
            </>
          ) : (
            <>
              ✨ Generate Test Cases
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default TestCaseForm;