import React from 'react';
import { Code2, Github, Star, ShieldCheck, Terminal, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="glass-panel" style={{ padding: '24px 32px', marginTop: '16px', borderTop: '1px solid var(--border-muted)', background: '#121215' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Footer Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* Brand & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#18181b',
                border: '1px solid #27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Code2 size={16} />
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                Repo<span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.1em' }}>2Resume</span>
              </span>
              <span className="badge" style={{ fontSize: '0.66rem', padding: '1px 5px' }}>
                v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Inspect public GitHub repositories, extract technical architecture and dependencies, and generate quantified Google XYZ formula resume achievements.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            
            <a
              href="https://github.com/imsayanpaul/Repo2Resume"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', gap: '6px', fontSize: '0.78rem' }}
            >
              <Star size={13} color="#f4f4f5" />
              <span>Star on GitHub</span>
            </a>

            <div className="badge badge-primary" style={{ fontSize: '0.76rem', padding: '6px 12px', gap: '6px' }}>
              <ShieldCheck size={13} color="#ffffff" />
              <span>100% Client-Side Privacy</span>
            </div>

            <div className="badge" style={{ fontSize: '0.76rem', padding: '6px 12px', gap: '6px' }}>
              <Terminal size={13} />
              <span>MIT Open Source</span>
            </div>

          </div>

        </div>

        {/* Bottom Credits & Copyright Bar */}
        <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div>
            © {new Date().getFullYear()} Repo2Resume. Built for engineers and open-source creators.
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Crafted by</span>
            <a 
              href="https://github.com/imsayanpaul" 
              target="_blank" 
              rel="noreferrer"
              style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}
            >
              @imsayanpaul
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
