import React from 'react';
import { Code2, Github, Star, ShieldCheck, Terminal, ExternalLink, Zap, Lock, Sparkles, Cpu } from 'lucide-react';

export default function Footer({ onOpenSettings, onOpenJdModal }) {
  return (
    <footer 
      className="site-footer"
      style={{ 
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        marginTop: '64px', 
        padding: '48px 24px 32px 24px', 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
        background: '#09090c',
        color: '#ffffff',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Main Grid: 4 Distinct Columns */}
        <div className="footer-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '32px' 
        }}>
          
          {/* Column 1: Brand & Identity */}
          <div className="footer-col footer-col-brand" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Code2 size={18} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                Repo<span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.1em', color: '#f4f4f5' }}>2Resume</span>
              </span>
              <span className="badge" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                v1.0
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
              Instantly convert your GitHub codebases into high-impact, ATS-optimized bullet points ready for your resume's Projects section.
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
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#18181b',
                  border: '1px solid #27272a',
                  color: '#ffffff',
                  textDecoration: 'none'
                }}
              >
                <Star size={13} color="#f4f4f5" />
                <span>Star on GitHub</span>
              </a>
            </div>
          </div>

          {/* Column 2: Resume Engines */}
          <div className="footer-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f8fafc', fontFamily: 'var(--font-display)', margin: 0 }}>
              Resume Engines
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem', color: '#94a3b8' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={14} color="#e2e8f0" /> Google XYZ Formula
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={14} color="#e2e8f0" /> STAR Method Generator
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} color="#e2e8f0" /> Live Gemini AI Models
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} color="#e2e8f0" /> Offline Rule Fallback
              </li>
            </ul>
          </div>

          {/* Column 3: Features & Controls */}
          <div className="footer-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f8fafc', fontFamily: 'var(--font-display)', margin: 0 }}>
              Features & Controls
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <li>
                <button 
                  type="button" 
                  onClick={onOpenJdModal}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '0.84rem', textAlign: 'left' }}
                >
                  Job Description Matcher
                </button>
              </li>
              <li>
                <button 
                  type="button" 
                  onClick={onOpenSettings}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '0.84rem', textAlign: 'left' }}
                >
                  Settings & API Keys
                </button>
              </li>
              <li style={{ color: '#94a3b8' }}>LaTeX & Overleaf Export</li>
              <li style={{ color: '#94a3b8' }}>Markdown & Plaintext Export</li>
            </ul>
          </div>

          {/* Column 4: Privacy & Security */}
          <div className="footer-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f8fafc', fontFamily: 'var(--font-display)', margin: 0 }}>
              Privacy & Open Source
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem', color: '#94a3b8' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: '600' }}>
                <ShieldCheck size={14} color="#22c55e" /> 100% Client-Side Privacy
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={14} color="#94a3b8" /> LocalStorage Key Security
              </li>
              <li>
                <a 
                  href="https://github.com/imsayanpaul/Repo2Resume" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  MIT License Source Code <ExternalLink size={11} />
                </a>
              </li>
              <li style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Local launch: <code className="font-mono" style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#f1f5f9' }}>npm run dev</code>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Credits & Copyright Bar */}
        <div className="footer-bottom-bar" style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
          paddingTop: '20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px', 
          fontSize: '0.82rem', 
          color: '#64748b' 
        }}>
          <div>
            © {new Date().getFullYear()} <strong style={{ color: '#f8fafc' }}>Repo2Resume</strong>. Designed for developers & technical job seekers.
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Crafted by</span>
            <a 
              href="https://github.com/imsayanpaul" 
              target="_blank" 
              rel="noreferrer"
              style={{ 
                color: '#ffffff', 
                fontWeight: '600', 
                textDecoration: 'none',
                background: '#1e293b',
                border: '1px solid #334155',
                padding: '3px 10px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Github size={13} /> @imsayanpaul
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
