import React, { useState } from 'react';
import './TestCaseCard.css';
import {
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaSave,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaUser,
  FaTag,
  FaServer,
  FaLayerGroup,
} from 'react-icons/fa';

const TestCaseCard = ({ testCase, index, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    state: testCase.state,
    priority: testCase.priority,
    assignedTo: testCase.assignedTo,
  });

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onUpdate(testCase._id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      state: testCase.state,
      priority: testCase.priority,
      assignedTo: testCase.assignedTo,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this test case?')) {
      onDelete(testCase._id);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Critical: '#E74C3C',
      High: '#DC143C',
      Medium: '#F39C12',
      Low: '#95A5A6',
    };
    return colors[priority] || colors.Medium;
  };

  const getStateIcon = (state) => {
    return state === 'Active' ? (
      <FaCheckCircle className="state-icon active" />
    ) : (
      <FaTimesCircle className="state-icon inactive" />
    );
  };

  return (
    <div className="test-case-card" style={{ animationDelay: `${index * 0.1}s` }}>
      {/* Card Header */}
      <div className="card-header">
        <div className="card-header-top">
          <span className="test-id">{testCase.id}</span>
          <div className="card-actions">
            {!isEditing ? (
              <>
                <button
                  className="action-btn edit-btn"
                  onClick={() => setIsEditing(true)}
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={handleDelete}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </>
            ) : (
              <>
                <button
                  className="action-btn save-btn"
                  onClick={handleSave}
                  title="Save"
                >
                  <FaSave />
                </button>
                <button
                  className="action-btn cancel-btn"
                  onClick={handleCancel}
                  title="Cancel"
                >
                  <FaTimes />
                </button>
              </>
            )}
          </div>
        </div>

        <h3 className="test-title">{testCase.title}</h3>

        <div className="card-meta">
          <span className="meta-item scenario-type">
            <FaLayerGroup />
            {testCase.scenarioType}
          </span>
          <span
            className="meta-item priority-badge"
            style={{ background: getPriorityColor(testCase.priority) }}
          >
            {testCase.priority}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        {/* Edit Mode */}
        {isEditing ? (
          <div className="edit-form">
            <div className="edit-group">
              <label>State</label>
              <select name="state" value={editData.state} onChange={handleEditChange}>
                <option value="New">New</option>
                <option value="Active">Active</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="edit-group">
              <label>Priority</label>
              <select name="priority" value={editData.priority} onChange={handleEditChange}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="edit-group">
              <label>Assigned To</label>
              <input
                type="text"
                name="assignedTo"
                value={editData.assignedTo}
                onChange={handleEditChange}
                placeholder="Assigned To"
              />
            </div>
          </div>
        ) : (
          <div className="card-info">
            <div className="info-row">
              <span className="info-label">
                {getStateIcon(testCase.state)}
                State:
              </span>
              <span className="info-value">{testCase.state}</span>
            </div>

            <div className="info-row">
              <span className="info-label">
                <FaUser />
                Assigned:
              </span>
              <span className="info-value">{testCase.assignedTo}</span>
            </div>

            <div className="info-row">
              <span className="info-label">
                <FaServer />
                Environment:
              </span>
              <span className="info-value">{testCase.environment}</span>
            </div>

            <div className="info-row">
              <span className="info-label">
                <FaTag />
                Platforms:
              </span>
              <div className="platforms-tags">
                {testCase.platforms.map((platform) => (
                  <span key={platform} className="platform-tag">
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            <div className="info-row">
              <span className="info-label">
                <FaClock />
                Created:
              </span>
              <span className="info-value">
                {new Date(testCase.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Test Steps */}
        <div className="test-steps-section">
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span>Test Steps ({testCase.testSteps.length})</span>
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {isExpanded && (
            <div className="test-steps">
              {testCase.testSteps.map((step) => (
                <div key={step.stepNumber} className="test-step">
                  <div className="step-number">Step {step.stepNumber}</div>
                  <div className="step-content">
                    <div className="step-action">
                      <strong>Action:</strong>
                      <p>{step.action}</p>
                    </div>
                    <div className="step-expected">
                      <strong>Expected:</strong>
                      <p>{step.expected}</p>
                    </div>
                    {step.data && (
                      <div className="step-data">
                        <strong>Data:</strong>
                        <p>{step.data}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <span className="footer-item">
          Area: <strong>{testCase.areaPath}</strong>
        </span>
        {testCase.tags && testCase.tags.length > 0 && (
          <div className="tags-container">
            {testCase.tags.map((tag, idx) => (
              <span key={idx} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestCaseCard;