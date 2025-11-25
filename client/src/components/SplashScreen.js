import React from 'react';
import './SplashScreen.css';
import Logo from './Logo';

function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <Logo size="large" />
        <div className="loading-container">
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
          <p className="loading-text">Initializing AI Engine...</p>
        </div>
      </div>
      <div className="splash-footer">
        <p>Powered by Groq AI</p>
      </div>
    </div>
  );
}

export default SplashScreen;