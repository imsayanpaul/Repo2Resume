import React, { useState } from 'react';
import { X, Key, ShieldCheck, Github, ExternalLink } from 'lucide-react';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  geminiApiKey, 
  onSaveGeminiKey, 
  githubToken, 
  onSaveGithubToken 
}) {
  const [geminiKey, setGeminiKey] = useState(geminiApiKey || '');
  const [ghToken, setGhToken] = useState(githubToken || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGeminiKey(geminiKey.trim());
    onSaveGithubToken(ghToken.trim());
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={22} color="var(--accent-violet)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>App Settings & API Keys</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
          
          {/* Gemini API Key Setting */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Gemini API Key (Optional)
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Get Free Key <ExternalLink size={12} />
              </a>
            </div>
            <input 
              type="password"
              className="input-field"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              If provided, Repo2Resume uses live Gemini AI models to craft customized bullet points. If left blank, Repo2Resume uses built-in smart Google XYZ heuristic rules offline.
            </p>
          </div>

          {/* GitHub Personal Access Token Setting */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Github size={16} /> GitHub Access Token (Optional)
              </label>
              <a 
                href="https://github.com/settings/tokens" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Generate Token <ExternalLink size={12} />
              </a>
            </div>
            <input 
              type="password"
              className="input-field"
              placeholder="ghp_..."
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Increases GitHub API rate limits from 60 to 5,000 requests/hour and enables access to private repos.
            </p>
          </div>

          {/* Security Guarantee Note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} color="#6ee7b7" />
            <span>Keys are stored strictly in your local browser storage and never sent to external servers.</span>
          </div>

        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
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
