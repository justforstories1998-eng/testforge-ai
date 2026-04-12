import React from 'react';
import { FaDatabase, FaLayerGroup, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';
import './Statistics.css';

const Statistics = ({ stats, fullPage = false }) => {
    if (!stats) return null;

    const total = stats.total || 0;
    const byScenarioType = stats.byScenarioType || {};
    const byPriority = stats.byPriority || {};

    return (
        <div className={`stats-container ${fullPage ? 'full-page' : ''}`}>
            <div className="stats-header-main">
                <FaChartLine className="header-icon" />
                <h3>Test Metrics Overview</h3>
            </div>

            <div className="stats-summary-grid">
                <div className="metric-card">
                    <div className="metric-icon"><FaDatabase /></div>
                    <div className="metric-info">
                        <span className="metric-label">Total Test Rows</span>
                        <span className="metric-value">{total}</span>
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-icon"><FaLayerGroup /></div>
                    <div className="metric-info">
                        <span className="metric-label">Scenario Types</span>
                        <span className="metric-value">{Object.keys(byScenarioType).length}</span>
                    </div>
                </div>
                <div className="metric-card">
                    <div className="metric-icon"><FaExclamationTriangle /></div>
                    <div className="metric-info">
                        <span className="metric-label">Priority Levels</span>
                        <span className="metric-value">{Object.keys(byPriority).length}</span>
                    </div>
                </div>
            </div>

            <div className="stats-detail-grid">
                <div className="detail-section">
                    <h4>Distribution by Type</h4>
                    <div className="detail-list">
                        {Object.entries(byScenarioType).map(([type, count]) => (
                            <div key={type} className="detail-item">
                                <span className="item-key">{type}</span>
                                <div className="item-bar-bg">
                                    <div className="item-bar-fill" style={{ width: `${(count / total) * 100}%` }}></div>
                                </div>
                                <span className="item-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="detail-section">
                    <h4>Distribution by Priority</h4>
                    <div className="detail-list">
                        {Object.entries(byPriority).map(([priority, count]) => (
                            <div key={priority} className="detail-item">
                                <span className="item-key">{priority}</span>
                                <div className="item-bar-bg">
                                    <div className="item-bar-fill priority-fill" style={{ width: `${(count / total) * 100}%` }}></div>
                                </div>
                                <span className="item-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Statistics;