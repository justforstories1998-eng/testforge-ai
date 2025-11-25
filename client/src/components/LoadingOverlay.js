import React from 'react';
import './LoadingOverlay.css';
import { FaSpinner, FaCog, FaVial, FaCheckCircle } from 'react-icons/fa';

const LoadingOverlay = ({ message = 'Generating test cases...', progress = 0 }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        {/* Animated Icons */}
        <div className="loading-icons">
          <FaCog className="loading-icon icon-1" />
          <FaVial className="loading-icon icon-2" />
          <FaSpinner className="loading-icon icon-3" />
          <FaCheckCircle className="loading-icon icon-4" />
        </div>

        {/* Central Spinner */}
        <div className="spinner-container">
          <div className="spinner-ring"></div>
          <div className="spinner-ring ring-2"></div>
          <div className="spinner-ring ring-3"></div>
          <div className="spinner-core">
            <FaSpinner className="spinner-icon" />
          </div>
        </div>

        {/* Loading Text */}
        <h3 className="loading-title">{message}</h3>
        
        {/* Progress Bar */}
        {progress > 0 && (
          <div className="loading-progress-container">
            <div className="loading-progress-bar" style={{ width: `${progress}%` }}>
              <div className="progress-shimmer"></div>
            </div>
            <span className="loading-progress-text">{progress}%</span>
          </div>
        )}

        {/* Status Messages */}
        <div className="loading-status">
          <div className="status-item active">
            <div className="status-dot"></div>
            <span>Analyzing acceptance criteria</span>
          </div>
          <div className="status-item">
            <div className="status-dot"></div>
            <span>Creating test scenarios</span>
          </div>
          <div className="status-item">
            <div className="status-dot"></div>
            <span>Generating test steps</span>
          </div>
        </div>

        {/* Fun Tip */}
        <p className="loading-tip">
          💡 <em>Pro tip: Well-written acceptance criteria generate better test cases!</em>
        </p>
      </div>

      {/* Animated Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}></div>
        ))}
      </div>
    </div>
  );
};

export default LoadingOverlay;