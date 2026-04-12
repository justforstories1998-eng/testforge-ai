import React, { useState } from 'react';
import { 
  FaMagic, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaLayerGroup, 
  FaShieldAlt, 
  FaListOl, 
  FaWalking, 
  FaMapMarkerAlt, 
  FaUser, 
  FaTrafficLight, 
  FaFlask 
} from 'react-icons/fa';
import './TestCaseForm.css';

function TestCaseForm({ onGenerate, loading }) {
  const [formData, setFormData] = useState({
    acceptanceCriteria: '',
    scenarioType: 'Positive',
    priority: 'High',
    numberOfScenarios: 5,
    numberOfSteps: 6,
    environment: 'Testing',
    platforms: ['Web'],
    state: 'New',
    assignedTo: 'QA Team',
    areaPath: 'Subscription/Billing/Data'
  });

  const [error, setError] = useState('');

  // Disable specific inputs when "Comprehensive" mode is selected
  const isComprehensive = formData.scenarioType === 'All';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
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
    if (formData.acceptanceCriteria.trim().length < 10) {
      setError('Detailed acceptance criteria is required for high-quality AI analysis.');
      return;
    }

    const submissionData = {
      ...formData,
      numberOfScenarios: isComprehensive ? 'auto' : formData.numberOfScenarios,
      numberOfSteps: isComprehensive ? 'auto' : formData.numberOfSteps
    };

    await onGenerate(submissionData);
  };

  return (
    <div className="tc-form-container">
      <div className="tc-form-card">
        {/* Header Section */}
        <div className="tc-form-header">
          <FaMagic className="tc-header-icon" />
          <div className="tc-header-text">
            <h2>Generate Test Cases</h2>
            <p>Advanced AI modeling for enterprise-grade test suites</p>
          </div>
        </div>

        {/* Status Banner */}
        {error && (
          <div className="tc-error-banner">
            <FaExclamationCircle /> {error}
          </div>
        )}

        <form className="tc-main-form" onSubmit={handleSubmit}>
          
          {/* Acceptance Criteria - Full Width */}
          <div className="tc-form-group tc-full-width">
            <label className="tc-label">
              <FaCheckCircle className="tc-label-icon" /> Acceptance Criteria & User Stories *
            </label>
            <textarea
              name="acceptanceCriteria"
              value={formData.acceptanceCriteria}
              onChange={handleChange}
              placeholder="Paste your requirements here. Detailed input allows the AI to map deeper logic paths..."
              rows="5"
              required
            />
          </div>

          {/* Row 1: Scenario Type & Priority */}
          <div className="tc-form-row">
            <div className="tc-form-group">
              <label className="tc-label">
                <FaLayerGroup className="tc-label-icon" /> Scenario Type
              </label>
              <select name="scenarioType" value={formData.scenarioType} onChange={handleChange}>
                <option value="Positive">Positive Path</option>
                <option value="Negative">Negative Path</option>
                <option value="Boundary">Boundary Analysis</option>
                <option value="Edge">Edge Case</option>
                <option value="All">Comprehensive (All Types)</option>
              </select>
            </div>

            <div className="tc-form-group">
              <label className="tc-label">
                <FaShieldAlt className="tc-label-icon" /> Priority
              </label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Row 2: Counts (Disabled for Comprehensive) */}
          <div className="tc-form-row">
            <div className="tc-form-group">
              <label className="tc-label">
                <FaListOl className="tc-label-icon" /> Number of Scenarios
              </label>
              <input 
                type="number" 
                name="numberOfScenarios" 
                value={isComprehensive ? "" : formData.numberOfScenarios} 
                disabled={isComprehensive}
                placeholder={isComprehensive ? "AI Managed" : ""}
                onChange={handleChange} 
              />
            </div>

            <div className="tc-form-group">
              <label className="tc-label">
                <FaWalking className="tc-label-icon" /> Steps Per Case
              </label>
              <input 
                type="number" 
                name="numberOfSteps" 
                value={isComprehensive ? "" : formData.numberOfSteps} 
                disabled={isComprehensive}
                placeholder={isComprehensive ? "AI Managed" : ""}
                onChange={handleChange} 
              />
            </div>
          </div>

          {/* Row 3: Environment & Area Path */}
          <div className="tc-form-row">
            <div className="tc-form-group">
              <label className="tc-label">
                <FaFlask className="tc-label-icon" /> Environment
              </label>
              <select name="environment" value={formData.environment} onChange={handleChange}>
                <option value="Development">Development</option>
                <option value="Testing">Testing</option>
                <option value="Staging">Staging</option>
                <option value="Production">Production</option>
              </select>
            </div>

            <div className="tc-form-group">
              <label className="tc-label">
                <FaMapMarkerAlt className="tc-label-icon" /> Area Path
              </label>
              <input 
                type="text" 
                name="areaPath" 
                value={formData.areaPath} 
                onChange={handleChange} 
                placeholder="Azure DevOps Area Path"
              />
            </div>
          </div>

          {/* Row 4: Assigned To & State */}
          <div className="tc-form-row">
            <div className="tc-form-group">
              <label className="tc-label">
                <FaUser className="tc-label-icon" /> Assigned To
              </label>
              <input 
                type="text" 
                name="assignedTo" 
                value={formData.assignedTo} 
                onChange={handleChange} 
                placeholder="Team or User Name"
              />
            </div>

            <div className="tc-form-group">
              <label className="tc-label">
                <FaTrafficLight className="tc-label-icon" /> Initial State
              </label>
              <input 
                type="text" 
                name="state" 
                value={formData.state} 
                onChange={handleChange} 
                placeholder="e.g., New, Active"
              />
            </div>
          </div>

          {/* Platforms Selection */}
          <div className="tc-form-group tc-full-width">
            <label className="tc-label">Target Platforms *</label>
            <div className="tc-checkbox-group">
              {['Web', 'Mobile', 'Desktop', 'API'].map(plat => (
                <label key={plat} className="tc-checkbox-item">
                  <input
                    type="checkbox"
                    value={plat}
                    checked={formData.platforms.includes(plat)}
                    onChange={handlePlatformChange}
                  />
                  <span>{plat}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="tc-submit-btn" type="submit" disabled={loading}>
            {loading ? 'AI Modeling Criteria...' : 'Generate Scenarios'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TestCaseForm;