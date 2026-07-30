import React, { useState, useEffect } from 'react';
import { Settings, FileText, Code2, Star, Sparkles, Check } from 'lucide-react';

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
    <header style={{
      position: 'sticky',
      top: '12px',
      zIndex: 50,
      maxWidth: '1280px',
      margin: '0 auto 18px auto',
      width: '100%'
    }}>
      <div 
        className="glass-panel"
        style={{
          padding: '10px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(18, 18, 21, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        
        {/* Brand Logo & Name */}
        <div 
          onClick={onGoHome} 
          title="Return to Homepage"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            userSelect: 'none'
          }}
          className="brand-logo-btn"
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Code2 size={19} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '3px' }}>
              Repo<span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.1em', color: '#f4f4f5' }}>2Resume</span>
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#18181b', border: '1px solid #27272a', borderRadius: '20px', padding: '2px 8px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34, 197, 94, 0.8)'
              }} />
              <span className="font-mono" style={{ fontSize: '0.68rem', color: '#a1a1aa', fontWeight: '600' }}>
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Right Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Job Description Matcher Button */}
          <button 
            type="button" 
            className={`btn btn-secondary btn-sm ${hasJdKeywords ? 'badge-primary' : ''}`}
            onClick={onOpenJdModal}
            title="Match Job Description keywords"
            style={{ 
              gap: '6px', 
              height: '36px', 
              fontSize: '0.82rem',
              padding: '0 14px',
              borderRadius: 'var(--radius-md)',
              border: hasJdKeywords ? '1px solid #ffffff' : '1px solid #27272a',
              background: hasJdKeywords ? '#27272a' : '#18181b'
            }}
          >
            <FileText size={14} color={hasJdKeywords ? '#ffffff' : '#a1a1aa'} />
            <span>{hasJdKeywords ? 'JD Match Active' : 'Match Job Description'}</span>
          </button>

          {/* Settings Modal Button */}
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onOpenSettings}
            title="Settings & API Keys"
            style={{ 
              position: 'relative', 
              height: '36px', 
              width: '36px', 
              padding: '0',
              borderRadius: 'var(--radius-md)',
              background: '#18181b',
              border: '1px solid #27272a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Settings size={15} color="#a1a1aa" />
            {hasApiKey && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)'
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
              gap: '7px',
              padding: '4px 12px',
              height: '36px',
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
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.74rem',
              fontWeight: '600',
              color: '#ffffff',
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
