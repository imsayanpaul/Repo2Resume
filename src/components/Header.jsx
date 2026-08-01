import React, { useState, useEffect } from 'react';
import { Settings, Code2, Star, Sparkles, Check, Linkedin } from 'lucide-react';

export default function Header({ 
  onGoHome,
  onOpenSettings,
  onOpenLinkedInModal, 
  activeUsername, 
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
    <header style={{
      position: 'sticky',
      top: '8px',
      zIndex: 50,
      maxWidth: '1280px',
      margin: '0 auto 16px auto',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div 
        className="glass-panel header-inner-bar"
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(18, 18, 21, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        
        {/* Brand Logo & Name */}
        <div 
          onClick={onGoHome} 
          title="Return to Homepage"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            cursor: 'pointer',
            userSelect: 'none'
          }}
          className="brand-logo-btn"
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <Code2 size={18} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '3px' }}>
              Repo<span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.1em', color: '#f4f4f5' }}>2Resume</span>
            </h1>
            
            <div className="mobile-hide-badge" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#18181b', border: '1px solid #27272a', borderRadius: '20px', padding: '2px 7px' }}>
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#22c55e'
              }} />
              <span className="font-mono" style={{ fontSize: '0.66rem', color: '#a1a1aa', fontWeight: '600' }}>
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Right Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

          {/* Dedicated LinkedIn Post Generator Nav Button */}
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onOpenLinkedInModal}
            title="Generate & Share LinkedIn Posts from Websites & Repos"
            style={{ 
              gap: '6px', 
              height: '34px', 
              fontSize: '0.8rem',
              padding: '0 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(0, 119, 181, 0.4)',
              background: 'rgba(0, 119, 181, 0.12)',
              color: '#38bdf8'
            }}
          >
            <Linkedin size={14} color="#38bdf8" />
            <span>LinkedIn Post</span>
          </button>

          {/* Settings Modal Button */}
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onOpenSettings}
            title="Settings & API Keys"
            style={{ 
              position: 'relative', 
              height: '34px', 
              width: '34px', 
              padding: '0',
              borderRadius: 'var(--radius-md)',
              background: '#18181b',
              border: '1px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Settings size={15} color="#a1a1aa" />
            {hasApiKey && (
              <span style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ffffff'
              }} />
            )}
          </button>

          {/* GitHub Star Button */}
          <a
            href="https://github.com/imsayanpaul/Repo2Resume"
            target="_blank"
            rel="noreferrer"
            title="Star Repo2Resume on GitHub"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              height: '34px',
              borderRadius: 'var(--radius-md)',
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '600',
              flexShrink: 0
            }}
            className="btn-secondary"
          >
            <Star size={13} color="#f4f4f5" />
            <span className="mobile-hide-text">Star</span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: '600',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)'
            }}>
              {starCount !== null ? starCount : '0'}
            </span>
          </a>

        </div>

      </div>
    </header>
  );
}
