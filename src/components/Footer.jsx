import React from 'react';
import { Code2, Github, Star, ShieldCheck, Terminal, ExternalLink, Zap, Lock, Sparkles, Cpu } from 'lucide-react';

export default function Footer({ onOpenSettings, onOpenJdModal }) {
  return (
    <footer 
      className="glass-panel" 
      style={{ 
        padding: '36px 32px 24px 32px', 
        marginTop: '32px', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid rgba(255, 255, 255, 0.12)', 
        background: 'rgba(18, 18, 21, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Main Grid: 4-Column Professional Developer Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '32px' 
        }}>
          
          {/* Column 1: Brand & Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <Code2 size={18} />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                Repo<span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.1em', color: '#f4f4f5' }}>2Resume</span>
              </span>
              <span className="badge" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                v1.0
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Transform raw GitHub repositories into quantified Google XYZ formula bullet points optimized for technical ATS screeners.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <a
                href="https://github.com/imsayanpaul/Repo2Resume"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: '#18181b',
                  border: '1px solid #27272a',
                  color: '#ffffff',
                  textDecoration: 'none'
                }}
              >
                <Star size={13} color="#f4f4f5" />
                <span>Star Repository</span>
              </a>
            </div>
          </div>

          {/* Column 2: Generator Engines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              Resume Engines
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={13} color="#a1a1aa" /> Google XYZ Formula
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={13} color="#a1a1aa" /> STAR Method Generator
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#a1a1aa" /> Live Gemini AI Models
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={13} color="#a1a1aa" /> Offline Heuristic Fallback
              </li>
            </ul>
          </div>

          {/* Column 3: Job Description & Tools */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              Targeting & Tools
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <li>
                <button 
                  type="button" 
                  onClick={onOpenJdModal}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: 0, cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left' }}
                >
                  Job Description Matcher
                </button>
              </li>
              <li>
                <button 
                  type="button" 
                  onClick={onOpenSettings}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: 0, cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left' }}
                >
                  Settings & API Keys
                </button>
              </li>
              <li>LaTeX / Overleaf Export</li>
              <li>Markdown & Plaintext Export</li>
            </ul>
          </div>

          {/* Column 4: Security & Open Source */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              Open Source & Privacy
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
                <ShieldCheck size={13} color="#22c55e" /> 100% Client-Side Privacy
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} color="#a1a1aa" /> LocalStorage Key Encryption
              </li>
              <li>
                <a 
                  href="https://github.com/imsayanpaul/Repo2Resume" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  MIT License Source Code <ExternalLink size={10} />
                </a>
              </li>
              <li style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Run locally: <code className="font-mono" style={{ background: '#18181b', padding: '2px 4px', borderRadius: '4px', color: '#f4f4f5' }}>npm run dev</code>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Credits & Copyright Bar */}
        <div style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
          paddingTop: '20px', 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px', 
          fontSize: '0.8rem', 
          color: 'var(--text-muted)' 
        }}>
          <div>
            © {new Date().getFullYear()} <strong style={{ color: '#ffffff' }}>Repo2Resume</strong>. Built for software engineers and open-source developers.
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Crafted with care by</span>
            <a 
              href="https://github.com/imsayanpaul" 
              target="_blank" 
              rel="noreferrer"
              style={{ 
                color: '#ffffff', 
                fontWeight: '600', 
                textDecoration: 'none',
                background: '#18181b',
                border: '1px solid #27272a',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Github size={12} /> @imsayanpaul
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
