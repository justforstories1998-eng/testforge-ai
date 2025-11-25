import React from 'react';
import './Logo.css';

function Logo({ size = 'medium' }) {
  return (
    <div className={`logo-container ${size}`}>
      <div className="logo-badge">
        <div className="logo-outer-ring">
          <div className="logo-inner-ring">
            <div className="logo-center">
              <svg className="logo-icon" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Test Tube */}
                <path d="M45 15 L55 15 L60 75 C60 82 55 87 50 87 C45 87 40 82 40 75 Z" 
                      fill="url(#gradient1)" 
                      stroke="#fff" 
                      strokeWidth="2"/>
                
                {/* Liquid */}
                <path d="M42 60 L58 60 L59 75 C59 80 55 84 50 84 C45 84 41 80 41 75 Z" 
                      fill="#00F5FF" 
                      opacity="0.8"/>
                
                {/* Bubbles */}
                <circle cx="48" cy="70" r="2" fill="#fff" opacity="0.6"/>
                <circle cx="52" cy="65" r="1.5" fill="#fff" opacity="0.6"/>
                <circle cx="50" cy="75" r="1.8" fill="#fff" opacity="0.6"/>
                
                {/* AI Sparkle */}
                <g className="sparkle">
                  <path d="M70 25 L72 30 L77 32 L72 34 L70 39 L68 34 L63 32 L68 30 Z" 
                        fill="#FFD700" 
                        stroke="#FFA500" 
                        strokeWidth="0.5"/>
                </g>
                
                <g className="sparkle-small">
                  <path d="M30 35 L31 38 L34 39 L31 40 L30 43 L29 40 L26 39 L29 38 Z" 
                        fill="#FFD700" 
                        stroke="#FFA500" 
                        strokeWidth="0.5"/>
                </g>
                
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="100%" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="logo-text-container">
        <h1 className="logo-title">TestForge AI</h1>
        <p className="logo-subtitle">Intelligent Test Generation</p>
      </div>
    </div>
  );
}

export default Logo;