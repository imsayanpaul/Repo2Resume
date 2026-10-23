import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  geminiApiKey,
  onSaveGeminiKey,
  githubToken,
  onSaveGithubToken,
  rateLimitReason,
  onClearRateLimitReason,
  serverConfig = {}
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
    <div className="overlay" onClick={handleCloseModal}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <h2 id="settings-title">Settings</h2>
            <p>
              {serverConfig.serverAi
                ? 'AI writing is already set up on this site. Your own keys are optional.'
                : 'This site has no AI key configured, so bullets come from the offline engine unless you add a Gemini key.'}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={handleCloseModal} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="dialog-body">
          {rateLimitReason && (
            <div className="callout is-warn">
              <strong><AlertTriangle size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                {rateLimitReason === 'github' ? 'GitHub limit reached.' : 'AI quota reached.'}
              </strong>{' '}
              {rateLimitReason === 'github'
                ? 'GitHub allows 60 requests an hour without a token. Add one below to raise that to 5,000.'
                : 'The shared AI quota is used up for now. Add your own Gemini key below to keep going.'}
            </div>
          )}

          <div>
            <div className="field-row">
              <label className="label" htmlFor="gemini-key">Your Gemini API key <span className="muted">(optional)</span></label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Get a free key</a>
            </div>
            <input
              id="gemini-key"
              type="password"
              className="field mono"
              placeholder="AIza…"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              autoComplete="off"
            />
            <p className="hint">Used first when set, sent straight from your browser to Google.</p>
          </div>

          <div>
            <div className="field-row">
              <label className="label" htmlFor="gh-token">Your GitHub token <span className="muted">(optional)</span></label>
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create one</a>
            </div>
            <input
              id="gh-token"
              type="password"
              className="field mono"
              placeholder="github_pat_…"
              value={ghToken}
              onChange={(e) => setGhToken(e.target.value)}
              autoComplete="off"
            />
            <p className="hint">
              {serverConfig.serverGithub
                ? 'This site already shares a token, so you rarely need one. A fine-grained token with no permissions is enough.'
                : 'Raises GitHub’s limit from 60 to 5,000 requests an hour. A fine-grained token with no permissions is enough.'}
            </p>
          </div>

          <div className="callout">
            <strong>Where keys live.</strong> Keys you enter here stay in this browser's local storage. The site's own AI and GitHub keys are kept on its server and never reach your browser.
          </div>

          <details className="more">
            <summary>Run it yourself</summary>
            <div className="code-block">{`git clone https://github.com/imsayanpaul/Repo2Resume.git
cd Repo2Resume && npm install
npm run dev`}</div>
          </details>
        </div>

        <div className="dialog-foot">
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
