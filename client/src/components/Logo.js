import React from 'react';
import './Logo.css';

function Logo({ size = 32, className = '' }) {
  return (
    <img
      src={`${process.env.PUBLIC_URL}/logo-mark.png`}
      alt="Test-CaseAI logo"
      width={size}
      height={size}
      className={`app-logo ${className}`}
      draggable={false}
    />
  );
}

export default Logo;
