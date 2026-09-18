import React from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import './Topbar.css';

function Topbar({ title, sub, navOpen, onMenu, right }) {
  return (
    <header className="topbar">
      <button
        className="icon-btn topbar-menu"
        onClick={onMenu}
        aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={navOpen}
      >
        {navOpen ? <FaTimes /> : <FaBars />}
      </button>
      <div className="topbar-titles">
        <h1 className="topbar-title">{title}</h1>
        {sub && <p className="topbar-sub">{sub}</p>}
      </div>
      {right && <div className="topbar-right">{right}</div>}
    </header>
  );
}

export default Topbar;
