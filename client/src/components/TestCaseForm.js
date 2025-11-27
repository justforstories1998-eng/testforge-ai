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

  // Check if "All" mode is selected
  const isAllMode = formData.scenarioType === 'All';

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

    // Skip validation for numberOfScenarios and numberOfSteps if "All" mode
    if (!isAllMode) {
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
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      numberOfScenarios: isAllMode ? 'auto' : formData.numberOfScenarios,
      numberOfSteps: isAllMode ? 'auto' : formData.numberOfSteps
    };

    const result = await onGenerate(submitData);
    
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
            <span className="label-hint">
              {isAllMode 
                ? 'AI will analyze every word and generate all possible test scenarios'
                : 'Describe what needs to be tested (minimum 10 characters)'
              }
            </span>
          </label>
          <textarea
            id="acceptanceCriteria"
            name="acceptanceCriteria"
            value={formData.acceptanceCriteria}
            onChange={handleChange}
            placeholder="Example: Admin should be able to set release dates for individual course modules through the Admin App. Students should not be able to see or access unreleased modules. Modules should become visible only when the release date is reached AND previous modules are completed. The system should handle timezone differences correctly."
            rows="5"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="scenarioType">
              Scenario Type
              <span className="label-hint">
                {isAllMode 
                  ? 'AI will generate Positive, Negative, Boundary & Edge cases'
                  : 'Type of test scenario'
                }
              </span>
            </label>
            <select
              id="scenarioType"
              name="scenarioType"
              value={formData.scenarioType}
              onChange={handleChange}
            >
              <option value="All">🔄 All (Comprehensive Coverage)</option>
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
              <span className="label-hint">
                {isAllMode 
                  ? 'Automatically determined by AI based on acceptance criteria'
                  : 'How many test case scenarios to generate (max 50 recommended)'
                }
              </span>
            </label>
            <input
              type="number"
              id="numberOfScenarios"
              name="numberOfScenarios"
              value={isAllMode ? '' : formData.numberOfScenarios}
              onChange={handleChange}
              min="1"
              max="50"
              required={!isAllMode}
              disabled={isAllMode}
              placeholder={isAllMode ? 'Auto (AI decides)' : ''}
              className={isAllMode ? 'disabled-input' : ''}
            />
          </div>

          <div className="form-group">
            <label htmlFor="numberOfSteps">
              Steps per Test Case
              <span className="label-hint">
                {isAllMode 
                  ? 'Automatically determined by AI based on complexity'
                  : 'Number of steps in each test case (max 20 recommended)'
                }
              </span>
            </label>
            <input
              type="number"
              id="numberOfSteps"
              name="numberOfSteps"
              value={isAllMode ? '' : formData.numberOfSteps}
              onChange={handleChange}
              min="1"
              max="20"
              required={!isAllMode}
              disabled={isAllMode}
              placeholder={isAllMode ? 'Auto (AI decides)' : ''}
              className={isAllMode ? 'disabled-input' : ''}
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

        {isAllMode && (
          <div className="all-mode-notice">
            <span className="notice-icon">🤖</span>
            <div className="notice-content">
              <strong>Comprehensive Analysis Mode</strong>
              <p>AI will deeply analyze your acceptance criteria and generate all possible test scenarios including Positive, Negative, Boundary, and Edge cases. The number of test cases and steps will be automatically determined based on the complexity of your requirements.</p>
            </div>
          </div>
        )}

        {/* New Redesigned Generate Button */}
        <div className="generate-button-container">
          <button 
            type="submit" 
            className={`generate-btn ${loading ? 'loading' : ''} ${isAllMode ? 'all-mode' : ''}`}
            disabled={loading}
          >
            <div className="btn-background">
              <div className="btn-glow"></div>
            </div>
            <div className="btn-content">
              {loading ? (
                <>
                  <div className="loading-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                  </div>
                  <div className="btn-text-container">
                    <span className="btn-text-main">
                      {isAllMode ? 'Analyzing & Generating...' : 'Generating Test Cases...'}
                    </span>
                    <span className="btn-text-sub">Please wait while AI processes your request</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="btn-icon-container">
                    <span className="btn-icon-main">🚀</span>
                    <span className="btn-icon-sparkle">✨</span>
                  </div>
                  <div className="btn-text-container">
                    <span className="btn-text-main">
                      {isAllMode ? 'Generate All Test Cases' : 'Generate Test Cases'}
                    </span>
                    <span className="btn-text-sub">
                      {isAllMode ? 'Comprehensive AI-Powered Analysis' : 'Powered by Groq AI'}
                    </span>
                  </div>
                  <div className="btn-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </>
              )}
            </div>
          </button>
        </div>
      </form>
    </div>
  );
}

export default TestCaseForm;