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
            <Key size={20} color="#ffffff" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>Settings & API Keys</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          
          {/* Gemini API Key Setting */}
          <div style={{ background: '#18181b', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: '600', color: '#ffffff' }}>
                Gemini API Key (Optional)
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                Get Free Key <ExternalLink size={11} />
              </a>
            </div>
            <input 
              type="password"
              className="input-field"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
              Repo2Resume uses live Gemini AI models to craft customized bullet points when a key is provided. If left blank, smart Google XYZ heuristic rules run offline.
            </p>
          </div>

          {/* GitHub Personal Access Token Setting */}
          <div style={{ background: '#18181b', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Github size={15} /> GitHub Access Token (Optional)
              </label>
              <a 
                href="https://github.com/settings/tokens" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
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
            />
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
              Increases GitHub API rate limits from 60 to 5,000 requests/hour and enables access to private repositories.
            </p>
          </div>

          {/* Security Guarantee Note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={15} color="#f4f4f5" />
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
