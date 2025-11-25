import React, { useState } from 'react';
import './GenerateForm.css';
import { FaRocket, FaCog, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const GenerateForm = ({ onGenerate, isLoading }) => {
  const [formData, setFormData] = useState({
    acceptanceCriteria: '',
    scenarioType: 'Positive Scenarios',
    numberOfScenarios: 3,
    numberOfSteps: 4,
    priority: 'High',
    environment: 'QA',
    platforms: ['Web'],
    areaPath: 'Testing',
    assignedTo: 'QA Team',
  });

  const [errors, setErrors] = useState({});

  const scenarioTypes = [
    'Positive Scenarios',
    'Negative Scenarios',
    'Boundary Scenarios',
    'API Scenarios',
  ];

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const environments = ['DEV', 'QA', 'UAT', 'PROD'];
  const platformOptions = ['Web', 'Mobile', 'API', 'Desktop'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePlatformChange = (platform) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.acceptanceCriteria.trim()) {
      newErrors.acceptanceCriteria = 'Acceptance criteria is required';
    } else if (formData.acceptanceCriteria.length < 10) {
      newErrors.acceptanceCriteria = 'Please provide more detailed acceptance criteria (min 10 characters)';
    }

    if (formData.numberOfScenarios < 1 || formData.numberOfScenarios > 10) {
      newErrors.numberOfScenarios = 'Number of scenarios must be between 1 and 10';
    }

    if (formData.numberOfSteps < 1 || formData.numberOfSteps > 20) {
      newErrors.numberOfSteps = 'Number of steps must be between 1 and 20';
    }

    if (formData.platforms.length === 0) {
      newErrors.platforms = 'Please select at least one platform';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onGenerate(formData);
    }
  };

  const handleReset = () => {
    setFormData({
      acceptanceCriteria: '',
      scenarioType: 'Positive Scenarios',
      numberOfScenarios: 3,
      numberOfSteps: 4,
      priority: 'High',
      environment: 'QA',
      platforms: ['Web'],
      areaPath: 'Testing',
      assignedTo: 'QA Team',
    });
    setErrors({});
  };

  return (
    <div className="generate-form-container">
      <div className="form-header">
        <h2 className="form-title">
          <FaRocket className="title-icon" />
          Generate Test Cases
        </h2>
        <p className="form-description">
          Fill in the details below to automatically generate comprehensive test cases
        </p>
      </div>

      <form onSubmit={handleSubmit} className="generate-form">
        {/* Acceptance Criteria */}
        <div className="form-group">
          <label htmlFor="acceptanceCriteria">
            Acceptance Criteria <span className="required">*</span>
          </label>
          <textarea
            id="acceptanceCriteria"
            name="acceptanceCriteria"
            value={formData.acceptanceCriteria}
            onChange={handleChange}
            placeholder="E.g., User should be able to login with valid email and password"
            rows="4"
            disabled={isLoading}
            className={errors.acceptanceCriteria ? 'error' : ''}
          />
          {errors.acceptanceCriteria && (
            <span className="error-message">
              <FaTimesCircle /> {errors.acceptanceCriteria}
            </span>
          )}
        </div>

        {/* Scenario Type & Priority */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="scenarioType">Scenario Type</label>
            <select
              id="scenarioType"
              name="scenarioType"
              value={formData.scenarioType}
              onChange={handleChange}
              disabled={isLoading}
            >
              {scenarioTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              disabled={isLoading}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Number of Scenarios & Steps */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="numberOfScenarios">
              Number of Scenarios (1-10)
            </label>
            <input
              type="number"
              id="numberOfScenarios"
              name="numberOfScenarios"
              value={formData.numberOfScenarios}
              onChange={handleChange}
              min="1"
              max="10"
              disabled={isLoading}
              className={errors.numberOfScenarios ? 'error' : ''}
            />
            {errors.numberOfScenarios && (
              <span className="error-message">
                <FaTimesCircle /> {errors.numberOfScenarios}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="numberOfSteps">
              Number of Steps (1-20)
            </label>
            <input
              type="number"
              id="numberOfSteps"
              name="numberOfSteps"
              value={formData.numberOfSteps}
              onChange={handleChange}
              min="1"
              max="20"
              disabled={isLoading}
              className={errors.numberOfSteps ? 'error' : ''}
            />
            {errors.numberOfSteps && (
              <span className="error-message">
                <FaTimesCircle /> {errors.numberOfSteps}
              </span>
            )}
          </div>
        </div>

        {/* Environment & Area Path */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="environment">Environment</label>
            <select
              id="environment"
              name="environment"
              value={formData.environment}
              onChange={handleChange}
              disabled={isLoading}
            >
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="areaPath">Area Path</label>
            <input
              type="text"
              id="areaPath"
              name="areaPath"
              value={formData.areaPath}
              onChange={handleChange}
              placeholder="E.g., Testing/Authentication"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Assigned To */}
        <div className="form-group">
          <label htmlFor="assignedTo">Assigned To</label>
          <input
            type="text"
            id="assignedTo"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
            placeholder="E.g., QA Team"
            disabled={isLoading}
          />
        </div>

        {/* Platforms */}
        <div className="form-group">
          <label>
            Platforms <span className="required">*</span>
          </label>
          <div className="platforms-grid">
            {platformOptions.map((platform) => (
              <label key={platform} className="platform-checkbox">
                <input
                  type="checkbox"
                  checked={formData.platforms.includes(platform)}
                  onChange={() => handlePlatformChange(platform)}
                  disabled={isLoading}
                />
                <span className="checkbox-label">
                  <FaCheckCircle className="check-icon" />
                  {platform}
                </span>
              </label>
            ))}
          </div>
          {errors.platforms && (
            <span className="error-message">
              <FaTimesCircle /> {errors.platforms}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaCog className="rotating" />
                Generating...
              </>
            ) : (
              <>
                <FaRocket />
                Generate Test Cases
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateForm;