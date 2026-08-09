import React, { useState } from 'react';
import { X, Key, ShieldCheck, Github, ExternalLink, AlertTriangle, Terminal, Lock, CheckCircle2 } from 'lucide-react';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  geminiApiKey, 
  onSaveGeminiKey, 
  githubToken, 
  onSaveGithubToken,
  rateLimitReason,
  onClearRateLimitReason
}) {
  const [geminiKey, setGeminiKey] = useState(geminiApiKey || '');
  const [ghToken, setGhToken] = useState(githubToken || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGeminiKey(geminiKey.trim());
    onSaveGithubToken(ghToken.trim());
    if (onClearRateLimitReason) onClearRateLimitReason();
    onClose();
  };

  const handleCloseModal = () => {
    if (onClearRateLimitReason) onClearRateLimitReason();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '640px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} color="#ffffff" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>Settings & API Keys</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={handleCloseModal} style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Rate Limit / Quota Exhaustion Alert Banner */}
        {rateLimitReason && (
          <div style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#1c1917',
            border: '1px solid #78350f',
            color: '#fef3c7',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.84rem',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#fbbf24' }}>
              <AlertTriangle size={16} /> API Rate Limit Reached / Quota Exhausted
            </div>
            <p style={{ lineHeight: '1.45', fontSize: '0.8rem', color: '#fde68a' }}>
              {rateLimitReason === 'github' 
                ? 'The shared GitHub API rate limit (60 requests/hr) has been reached. Add a free GitHub Access Token below to instantly boost your limit to 5,000 requests/hr.'
                : 'The public Gemini AI quota has been exhausted. Please add your free personal Gemini API key below to continue generating bullets without limits.'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          
          {/* Gemini API Key Setting */}
          <div style={{ 
            background: '#18181b', 
            padding: '16px', 
            borderRadius: 'var(--radius-md)', 
            border: rateLimitReason === 'gemini' ? '1px solid #ffffff' : '1px solid var(--border-muted)',
            boxShadow: rateLimitReason === 'gemini' ? '0 0 0 2px rgba(255, 255, 255, 0.15)' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: '600', color: '#ffffff' }}>
                Gemini API Key (Optional)
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.76rem', color: 'var(--accent-silver)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
              >
                Get Free Gemini Key <ExternalLink size={11} />
              </a>
            </div>
            <input 
              type="password"
              className="input-field"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              style={{ background: '#0d0d10' }}
            />
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
              Repo2Resume uses live Gemini AI models to craft customized bullet points when a key is provided. If left blank, smart Google XYZ heuristic rules run offline.
            </p>
          </div>

          {/* GitHub Personal Access Token Setting */}
          <div style={{ 
            background: '#18181b', 
            padding: '16px', 
            borderRadius: 'var(--radius-md)', 
            border: rateLimitReason === 'github' ? '1px solid #ffffff' : '1px solid var(--border-muted)',
            boxShadow: rateLimitReason === 'github' ? '0 0 0 2px rgba(255, 255, 255, 0.15)' : 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Github size={15} /> GitHub Access Token (Optional)
              </label>
              <a 
                href="https://github.com/settings/tokens" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.76rem', color: 'var(--accent-silver)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
              >
                Generate Token <ExternalLink size={11} />
              </a>
            </div>
            <input 
              type="password"
              className="input-field"
              placeholder="ghp_..."
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
              style={{ background: '#0d0d10' }}
            />
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
              Increases GitHub API rate limits from 60 to 5,000 requests/hour and enables access to private repositories.
            </p>
          </div>

          {/* Privacy & Safety Guarantee Box */}
          <div style={{
            background: '#141418',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: '700', color: '#ffffff' }}>
              <ShieldCheck size={16} color="#ffffff" />
              <span>100% Client-Side Privacy Guarantee</span>
            </div>
            
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong style={{ color: '#ffffff' }}>Is your API key safe?</strong> Yes. Your keys are stored <strong style={{ color: '#ffffff' }}>strictly in your browser's local storage (`localStorage`)</strong>. They are sent directly from your browser to official Google / GitHub APIs and are <strong style={{ color: '#ffffff' }}>never</strong> logged, tracked, or sent to any backend servers.
            </p>

            {/* Run Locally Option */}
            <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '10px', marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>
                <Terminal size={14} /> Prefer to run locally from source?
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: '1.45', marginBottom: '8px' }}>
                For complete peace of mind, clone this open-source project directly from GitHub, inspect every line of code, and run it locally on your machine with your own API keys:
              </p>
              <div className="font-mono" style={{ 
                background: '#0a0a0c', 
                border: '1px solid var(--border-muted)', 
                borderRadius: '6px', 
                padding: '8px 12px', 
                fontSize: '0.74rem', 
                color: '#f4f4f5', 
                lineHeight: '1.6',
                wordBreak: 'break-all',
                overflowWrap: 'anywhere',
                overflowX: 'auto',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                git clone https://github.com/imsayanpaul/Repo2Resume.git<br/>
                cd Repo2Resume && npm install<br/>
                npm run dev
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Save Preferences
          </button>
        </div>

      </div>
    </div>
  );
}
