import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ message = 'Processing Request...' }) => (
  <div className="loading-overlay">
    <div className="loading-modal">
      <div className="professional-spinner"></div>
      <p className="loading-text">{message}</p>
      <p className="loading-subtext">Our AI engine is analyzing your criteria.</p>
    </div>
  </div>
);
export default LoadingOverlay;