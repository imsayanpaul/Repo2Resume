import React, { useState } from 'react';
import { Github, Sparkles, Settings, FileText, Search } from 'lucide-react';

export default function Header({ 
  onSearch, 
  onOpenSettings, 
  onOpenJdModal, 
  activeUsername, 
  hasJdKeywords, 
  hasApiKey 
}) {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  return (
    <header className="glass-panel app-header" style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Sparkles size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Repo<span className="gradient-text">2Resume</span>
              </h1>
              <span className="badge badge-primary">v1.0 AI</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Transform GitHub repos into ATS-optimized Google XYZ resume bullets
            </p>
          </div>
        </div>

        {/* GitHub Username Search Input */}
        <form onSubmit={handleSubmit} style={{ flex: '1', maxWidth: '420px', minWidth: '280px', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Enter GitHub username (e.g. torvalds)..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        {/* Action Controls & Quick Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button" 
            className={`btn btn-secondary btn-sm ${hasJdKeywords ? 'badge-cyan' : ''}`}
            onClick={onOpenJdModal}
            title="Paste Job Description to score & match repos"
          >
            <FileText size={16} />
            <span>{hasJdKeywords ? 'JD Filter Active' : 'Match Job Description'}</span>
          </button>

          <button 
            type="button" 
            className="btn btn-ghost btn-sm"
            onClick={onOpenSettings}
            title="Configure Gemini API key & GitHub access token"
            style={{ position: 'relative' }}
          >
            <Settings size={18} />
            {hasApiKey && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-cyan)'
              }} />
            )}
          </button>
        </div>

      </div>
    </header>
  );
}
