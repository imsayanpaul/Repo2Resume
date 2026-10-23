import React from 'react';
import { Settings, Github } from 'lucide-react';

// 16×16 document glyph drawn on the pixel grid
export function PixelDoc({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M3 1h8l2 2v12H3z" fill="var(--paper)" />
      <path d="M2 1h9v1H3v12h9V3h1v12H2zM11 2h1v1h-1z" fill="var(--ink)" />
      <path d="M5 5h6v1H5zM5 8h4v1H5z" fill="var(--ink)" />
      <path d="M5 11h5v1H5z" fill="var(--accent)" />
    </svg>
  );
}

export default function Header({
  onGoHome,
  onOpenSettings,
  activeUsername,
  hasApiKey
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a
          href="/"
          className="wordmark"
          onClick={(e) => { e.preventDefault(); onGoHome(); }}
          aria-label="Repo2Resume home"
        >
          <PixelDoc className="wordmark-mark" />
          Repo2Resume
        </a>

        {activeUsername && (
          <div className="crumb">
            <span aria-hidden="true">/</span>
            <strong>{activeUsername}</strong>
          </div>
        )}

        <div className="topbar-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onOpenSettings}
            title={hasApiKey ? 'AI writing is on. Open settings' : 'AI writing is off; bullets use the offline engine. Open settings'}
          >
            <span className="status">
              <span className={`dot ${hasApiKey ? 'dot-on' : 'dot-off'}`} aria-hidden="true" />
              <span className="hide-sm">{hasApiKey ? 'ai: on' : 'ai: off'}</span>
            </span>
            <Settings size={15} aria-hidden="true" />
            <span className="visually-hidden">Settings</span>
          </button>

          <a
            href="https://github.com/imsayanpaul/Repo2Resume"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            title="Source on GitHub"
          >
            <Github size={15} aria-hidden="true" />
            <span className="hide-sm">Source</span>
          </a>
        </div>
      </div>
    </header>
  );
}
