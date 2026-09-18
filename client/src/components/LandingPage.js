import React from 'react';
import './LandingPage.css';

const HERO_VIDEO_URL = 'https://designerstephen.github.io/public-assets/videos/serene-art-hero.mp4';

function LandingPage({ onNavigate }) {
  return (
    <div className="landing">
      {/* Full-bleed video backdrop with legibility overlay */}
      <div className="landing-bg" aria-hidden="true">
        <video
          className="landing-video"
          src={HERO_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="landing-overlay" />
      </div>

      {/* Three-column distributed nav */}
      <nav className="landing-nav">
        <div className="landing-brand">
          Test-CaseAI<sup>®</sup>
        </div>
        <div className="landing-links">
          <button type="button" onClick={() => onNavigate('generate')}>
            Generate
          </button>
          <button type="button" onClick={() => onNavigate('history')}>
            Repository
          </button>
          <button type="button" onClick={() => onNavigate('statistics')}>
            Insights
          </button>
        </div>
        <button
          type="button"
          className="pill-btn pill-btn-small"
          onClick={() => onNavigate('generate')}
        >
          Start generating
        </button>
      </nav>

      {/* Centered hero */}
      <main className="landing-hero">
        <h1 className="landing-title">
          Acceptance criteria in, <em>test suites</em> out.
        </h1>
        <p className="landing-sub">
          Test-CaseAI reads your user stories and generates enterprise-grade
          test cases = positive, negative, boundary and edge plus runnable
          Playwright specs you can edit and run.
        </p>
        <button
          type="button"
          className="pill-btn pill-btn-hero"
          onClick={() => onNavigate('generate')}
        >
          Generate test cases
        </button>
      </main>
    </div>
  );
}

export default LandingPage;
