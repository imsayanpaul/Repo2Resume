import React, { useState, useEffect } from 'react';
import { Settings, FileText, Code2, Star } from 'lucide-react';

export default function Header({ 
  onGoHome,
  onOpenSettings, 
  onOpenJdModal, 
  activeUsername, 
  hasJdKeywords, 
  hasApiKey 
}) {
  const [starCount, setStarCount] = useState(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/imsayanpaul/Repo2Resume')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.stargazers_count === 'number') {
          setStarCount(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="glass-panel app-header" style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-muted)', background: '#121215' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        
        {/* Brand Logo & Name (Clickable Homepage Link) */}
        <div 
          onClick={onGoHome} 
          title="Return to Homepage"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s ease'
          }}
          className="brand-logo-btn"
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: '#18181b',
            border: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Code2 size={18} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
              Repo<span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.1em' }}>2Resume</span>
            </h1>
            <span className="badge" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
              v1.2
            </span>
          </div>
        </div>

        {/* Right Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          <button 
            type="button" 
            className={`btn btn-secondary btn-sm ${hasJdKeywords ? 'badge-primary' : ''}`}
            onClick={onOpenJdModal}
            title="Match Job Description keywords"
            style={{ gap: '6px', height: '34px', fontSize: '0.82rem' }}
          >
            <FileText size={14} color="var(--text-secondary)" />
            <span>{hasJdKeywords ? 'JD Matcher Active' : 'Match Job Description'}</span>
          </button>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onOpenSettings}
            title="Settings & API Keys"
            style={{ position: 'relative', height: '34px', width: '34px', padding: '0' }}
          >
            <Settings size={15} color="var(--text-secondary)" />
            {hasApiKey && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ffffff'
              }} />
            )}
          </button>

          {/* GitHub Style Star Button with Counter (Placed at the End) */}
          <a
            href="https://github.com/imsayanpaul/Repo2Resume"
            target="_blank"
            rel="noreferrer"
            title="Star Repo2Resume on GitHub"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '4px 10px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: '600',
              transition: 'all 0.15s ease'
            }}
            className="btn-secondary"
          >
            <Star size={14} color="#f4f4f5" />
            <span>Star</span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.74rem',
              fontWeight: '600',
              color: '#e4e4e7',
              fontFamily: 'var(--font-mono)'
            }}>
              {starCount !== null ? starCount : '★'}
            </span>
          </a>

        </div>

      </div>
    </header>
  );
}
