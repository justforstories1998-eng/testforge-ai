import React from 'react';
import { FaPlus, FaHistory, FaChartBar } from 'react-icons/fa';
import Logo from './Logo';
import './Header.css';

const Header = ({ currentPage, onPageChange, historyCount, onBrandClick }) => {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <button className="brand brand-home" onClick={onBrandClick} title="Back to home">
          <Logo size={30} />
          <span>Test-Case<span className="accent">AI</span></span>
        </button>
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