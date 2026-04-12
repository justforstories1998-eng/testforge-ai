import React from 'react';
import { FaTerminal, FaPlus, FaHistory, FaChartBar } from 'react-icons/fa';
import './Header.css';

const Header = ({ currentPage, onPageChange, historyCount }) => {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="brand">
          <FaTerminal className="brand-icon" />
          <span>TestForge<span className="accent">AI</span></span>
        </div>
        <nav className="nav-menu">
          <button 
            className={`nav-item ${currentPage === 'generate' ? 'active' : ''}`}
            onClick={() => onPageChange('generate')}
          >
            <FaPlus /> Generate
          </button>
          <button 
            className={`nav-item ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => onPageChange('history')}
          >
            <FaHistory /> History
            {historyCount > 0 && <span className="badge">{historyCount}</span>}
          </button>
          <button 
            className={`nav-item ${currentPage === 'statistics' ? 'active' : ''}`}
            onClick={() => onPageChange('statistics')}
          >
            <FaChartBar /> Insights
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;