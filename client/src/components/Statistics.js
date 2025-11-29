import React from 'react';
import './Statistics.css';

function Statistics({ stats }) {
  // Return null if no stats provided
  if (!stats) {
    return null;
  }

  // Safely extract values with defaults
  const total = stats.total || 0;
  const byScenarioType = stats.byScenarioType || {};
  const byPriority = stats.byPriority || {};

  // Safely get keys
  const scenarioTypeKeys = Object.keys(byScenarioType);
  const priorityKeys = Object.keys(byPriority);

  return (
    <div className="statistics">
      <div className="stats-header">
        <h3>📊 Test Case Statistics</h3>
        <p>Overview of your generated test cases</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📝</span>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Rows</div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <div className="stat-value">
            {scenarioTypeKeys.length}
          </div>
          <div className="stat-label">Scenario Types</div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <div className="stat-value">
            {priorityKeys.length}
          </div>
          <div className="stat-label">Priority Levels</div>
        </div>
      </div>

      <div className="stats-breakdown">
        <div className="breakdown-section">
          <h4>Scenario Types</h4>
          <div className="breakdown-list">
            {scenarioTypeKeys.length > 0 ? (
              Object.entries(byScenarioType).map(([type, count]) => (
                <div key={type} className="breakdown-item">
                  <span className="breakdown-item-label">
                    {type.includes('Positive') && '✓ '}
                    {type.includes('Negative') && '✗ '}
                    {type.includes('Boundary') && '⚡ '}
                    {type.includes('Edge') && '🔍 '}
                    {type.includes('API') && '🔌 '}
                    {type}
                  </span>
                  <span className="breakdown-item-value">{count}</span>
                </div>
              ))
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </div>

        <div className="breakdown-section">
          <h4>Priority Levels</h4>
          <div className="breakdown-list">
            {priorityKeys.length > 0 ? (
              Object.entries(byPriority).map(([priority, count]) => (
                <div key={priority} className="breakdown-item">
                  <span className="breakdown-item-label">
                    {priority === 'Critical' && '🔴 '}
                    {priority === 'High' && '🟠 '}
                    {priority === 'Medium' && '🟡 '}
                    {priority === 'Low' && '🟢 '}
                    {priority}
                  </span>
                  <span className="breakdown-item-value">{count}</span>
                </div>
              ))
            ) : (
              <div className="no-data">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;