import React from 'react';
import './Header.css';
import { FaVial, FaGithub, FaChartBar } from 'react-icons/fa';

const Header = ({ onShowStatistics }) => {
  return (
    <header className="header">
      <div className="header-container">
        {/* Logo & Title */}
        <div className="header-brand">
          <div className="brand-icon">
            <FaVial />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">
              Generate<span className="brand-highlight">Test</span>Case
            </h1>
            <p className="brand-subtitle">Automated Test Case Generation</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="header-nav">
          <button 
            className="nav-btn"
            onClick={onShowStatistics}
            title="View Statistics"
          >
            <FaChartBar />
            <span>Statistics</span>
          </button>
          
          <a 
            href="https://github.com/YOUR-USERNAME/Generate-test-case" 
            target="_blank" 
            rel="noopener noreferrer"
            className="nav-btn"
            title="View on GitHub"
          >
            <FaGithub />
            <span>GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;