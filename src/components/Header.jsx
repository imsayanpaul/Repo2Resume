import React, { useEffect, useState } from 'react';
import { Github, Star } from 'lucide-react';
import { fetchStarCount } from '../services/github';

const REPO = 'imsayanpaul/Repo2Resume';

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
  activeUsername
}) {
  const [stars, setStars] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchStarCount(REPO).then(count => { if (alive) setStars(count); });
    return () => { alive = false; };
  }, []);

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

        <nav className="topbar-actions" aria-label="Main">
          {!activeUsername && (
            <a href="#example" className="nav-link hide-sm">Example</a>
          )}
          <button type="button" className="nav-link" onClick={onOpenSettings}>
            Settings
          </button>
          <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noreferrer"
            className="nav-source"
            title="Source on GitHub. Star it if it helped"
          >
            <span className="nav-source-main">
              <Github size={15} aria-hidden="true" />
              <span className="hide-sm">Source</span>
            </span>
            {stars !== null && (
              // "0" undersells a new repo, so invite a star until there is one
              <span className="nav-stars" aria-label={stars > 0 ? `${stars} stars on GitHub` : 'Star on GitHub'}>
                <Star size={12} aria-hidden="true" />
                {stars > 0 ? stars : 'Star'}
              </span>
            )}
          </a>
        </nav>
      </div>
    </header>
  );
}
