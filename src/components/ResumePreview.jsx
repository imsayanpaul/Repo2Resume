import React, { useState, useRef } from 'react';
import { Copy, Check, Loader2, RefreshCw, Wand2, X, Upload, FileUp, CheckCircle, AlertCircle } from 'lucide-react';
import { injectProjectsIntoDocx, downloadDocxBlob } from '../services/docxInjector';
import { PixelDoc } from './Header';

const TONES = [
  {
    id: 'xyz',
    label: 'XYZ',
    name: 'Google XYZ',
    tooltip: 'What you built, its concrete scope, and how you built it, in one line each.'
  },
  {
    id: 'star',
    label: 'STAR',
    name: 'STAR',
    tooltip: 'The problem the project solves, what you built, and what it now does.'
  },
  {
    id: 'technical',
    label: 'Technical',
    name: 'Technical depth',
    tooltip: 'Architecture and data flow: how the pieces connect, as the repo shows them.'
  },
  {
    id: 'ats',
    label: 'ATS',
    name: 'ATS minimal',
    tooltip: 'Short, keyword-dense lines that parse cleanly in applicant tracking systems.'
  }
];

const VIEWS = [
  { id: 'formatted', label: 'Page' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'latex', label: 'LaTeX' },
  { id: 'json', label: 'JSON' }
];

const SUGGESTIONS = [
  'Emphasize features and integrations from the README',
  'Highlight testing, security and CI',
  'Focus on the backend architecture',
  'Make it concise for a one-page résumé'
];

const PROVIDER_LABELS = { groq: 'Groq', gemini: 'Gemini' };

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Characters like % (comment), & (alignment), # and _ break pdflatex if left raw
const LATEX_REPLACEMENTS = {
  '\\': '\\textbackslash{}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  '<': '\\textless{}', '>': '\\textgreater{}'
};

function escapeLatex(str) {
  // Single pass, so braces added by one replacement aren't escaped by another
  return String(str ?? '').replace(/[\\~^<>&%$#_{}]/g, ch => LATEX_REPLACEMENTS[ch] || `\\${ch}`);
}

// URLs go inside \href{}, where only %, # and \ need escaping
function escapeLatexUrl(url) {
  return String(url ?? '').replace(/([%#\\])/g, '\\$1');
}

export default function ResumePreview({
  generatedBullets, 
  onToneChange, 
  activeTone, 
  onBulletEdit, 
  onRegenerate, 
  isGenerating 
}) {
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'markdown' | 'latex' | 'json'
  const [copied, setCopied] = useState(false);
  const [hoveredTone, setHoveredTone] = useState(null);
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const [customPromptText, setCustomPromptText] = useState('');

  // Resume Upload State
  const [uploadedDocx, setUploadedDocx] = useState(null); // { file: File, name: string }
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectStatus, setInjectStatus] = useState(null); // 'success' | 'error' | null
  const [injectError, setInjectError] = useState('');
  const docxInputRef = useRef(null);

  // Per-Project Link Settings: { [repoId]: { showGithub: true, showDemo: false, demoUrl: '' } }
  const [projectLinkConfigs, setProjectLinkConfigs] = useState({});

  const activeToneObj = TONES.find(t => t.id === (hoveredTone || activeTone)) || TONES[0];

  const getProjectLinkConfig = (repoId) => {
    return projectLinkConfigs[repoId] || { showGithub: true, showDemo: false, demoUrl: '' };
  };

  const updateProjectLinkConfig = (repoId, updates) => {
    setProjectLinkConfigs(prev => ({
      ...prev,
      [repoId]: {
        ...getProjectLinkConfig(repoId),
        ...updates
      }
    }));
  };

  // Helper to construct Markdown string
  const getMarkdownText = () => {
    return generatedBullets.map(item => {
      const config = getProjectLinkConfig(item.repoId);
      const links = [];
      if (config.showGithub && item.html_url) links.push(`[GitHub](${item.html_url})`);
      if (config.showDemo && config.demoUrl) links.push(`[Live Demo](${config.demoUrl})`);
      
      const linkSuffix = links.length > 0 ? ` | ${links.join(' | ')}` : '';
      const bulletsText = item.bullets.map(b => `  * ${b}`).join('\n');
      return `### ${item.repoName}${linkSuffix}\n**Technologies:** ${item.techStack.join(', ')}\n${bulletsText}`;
    }).join('\n\n');
  };

  // Helper to construct Rich HTML string (for MS Word / Google Docs)
  const getRichHtmlText = () => {
    const repoBlocks = generatedBullets.map(item => {
      const config = getProjectLinkConfig(item.repoId);
      const links = [];
      if (config.showGithub && item.html_url) {
        links.push(`<a href="${escapeHtml(item.html_url)}" style="color: #2563eb; text-decoration: none;">GitHub</a>`);
      }
      if (config.showDemo && config.demoUrl) {
        links.push(`<a href="${escapeHtml(config.demoUrl)}" style="color: #2563eb; text-decoration: none;">Live Demo</a>`);
      }
      const linkSuffix = links.length > 0 ? ` &nbsp;|&nbsp; ${links.join(' &nbsp;|&nbsp; ')}` : '';
      const bulletsList = item.bullets.map(b => `<li style="margin-bottom: 4px;">${escapeHtml(b)}</li>`).join('');

      return `
        <div style="margin-bottom: 18px; font-family: Arial, sans-serif;">
          <div style="font-size: 13pt; font-weight: bold; color: #111827;">
            ${escapeHtml(item.repoName)}${linkSuffix}
          </div>
          <div style="font-size: 10pt; color: #4b5563; margin-top: 2px; margin-bottom: 6px;">
            <strong>Technologies:</strong> ${escapeHtml(item.techStack.join(', '))}
          </div>
          <ul style="margin-top: 4px; margin-bottom: 8px; padding-left: 22px; font-size: 10.5pt; color: #1f2937; line-height: 1.45;">
            ${bulletsList}
          </ul>
        </div>
      `;
    }).join('');

    return `<div style="font-family: Arial, sans-serif;">${repoBlocks}</div>`;
  };

  // Helper to construct LaTeX snippet string
  const getLatexText = () => {
    return generatedBullets.map(item => {
      const config = getProjectLinkConfig(item.repoId);
      const latexLinks = [];
      if (config.showGithub && item.html_url) latexLinks.push(`\\href{${escapeLatexUrl(item.html_url)}}{\\emph{GitHub}}`);
      if (config.showDemo && config.demoUrl) latexLinks.push(`\\href{${escapeLatexUrl(config.demoUrl)}}{\\emph{Live Demo}}`);

      const linksStr = latexLinks.length > 0 ? ` $|$ ${latexLinks.join(' $|$ ')}` : '';
      // Jake's template defines \resumeItem; a bare \item inside \resumeItemListStart loses its formatting
      const bulletsText = item.bullets.map(b => `      \\resumeItem{${escapeLatex(b)}}`).join('\n');
      return `\\resumeProjectHeading\n    {\\textbf{${escapeLatex(item.repoName)}}${linksStr} $|$ \\emph{${escapeLatex(item.techStack.join(', '))}}}{}\n    \\resumeItemListStart\n${bulletsText}\n    \\resumeItemListEnd`;
    }).join('\n\n');
  };

  // Helper to construct JSON Resume string
  const getJsonText = () => {
    const projects = generatedBullets.map(item => {
      const config = getProjectLinkConfig(item.repoId);
      return {
        name: item.repoName,
        description: item.description,
        url: config.showGithub ? item.html_url : undefined,
        demoUrl: config.showDemo ? config.demoUrl : undefined,
        highlights: item.bullets,
        keywords: item.techStack
      };
    });
    return JSON.stringify({ projects }, null, 2);
  };

  const handleCopy = async () => {
    let plainText = '';
    if (viewMode === 'markdown') plainText = getMarkdownText();
    else if (viewMode === 'latex') plainText = getLatexText();
    else if (viewMode === 'json') plainText = getJsonText();
    else plainText = getMarkdownText();

    const htmlText = getRichHtmlText();

    try {
      if (viewMode === 'formatted' && window.ClipboardItem) {
        const blobPlain = new Blob([plainText], { type: 'text/plain' });
        const blobHtml = new Blob([htmlText], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': blobPlain,
            'text/html': blobHtml
          })
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch (err) {
      console.warn('ClipboardItem fallback to writeText:', err);
      await navigator.clipboard.writeText(plainText);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomRegenerateSubmit = (e) => {
    e.preventDefault();
    if (customPromptText.trim()) {
      onRegenerate(customPromptText.trim());
      setIsCustomPromptOpen(false);
    }
  };

  // Resume Upload Handlers
  const handleDocxUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      setInjectError('Please upload a .docx file (Word document).');
      setInjectStatus('error');
      setTimeout(() => setInjectStatus(null), 4000);
      return;
    }
    setUploadedDocx({ file, name: file.name });
    if (generatedBullets.length === 0) {
      setInjectStatus('info');
      setInjectError('');
    } else {
      setInjectStatus(null);
      setInjectError('');
    }
  };

  const handleInjectIntoResume = async () => {
    if (!uploadedDocx) return;
    if (generatedBullets.length === 0) {
      setInjectError('Please generate resume bullets first! Select repositories on the left and click "Generate Resume Bullets".');
      setInjectStatus('error');
      return;
    }
    
    setIsInjecting(true);
    setInjectStatus(null);
    setInjectError('');
    try {
      const modifiedBlob = await injectProjectsIntoDocx(
        uploadedDocx.file,
        generatedBullets,
        projectLinkConfigs
      );
      downloadDocxBlob(modifiedBlob, uploadedDocx.name);
      setInjectStatus('success');
      setTimeout(() => setInjectStatus(null), 5000);
    } catch (err) {
      console.error('DOCX injection failed:', err);
      setInjectError(err.message || 'Failed to inject projects into resume.');
      setInjectStatus('error');
    } finally {
      setIsInjecting(false);
    }
  };

  const handleRemoveUploadedDocx = () => {
    setUploadedDocx(null);
    setInjectStatus(null);
    setInjectError('');
    if (docxInputRef.current) docxInputRef.current.value = '';
  };

  const hasBullets = generatedBullets.length > 0;
  const docxMessage = !uploadedDocx ? null
    : injectStatus === 'error' ? injectError
    : injectStatus === 'success' ? 'Projects added. The updated file has been downloaded.'
    : hasBullets ? 'Ready to add these projects to its Projects section.'
    : 'Write bullets first, then add them to this résumé.';

  return (
    <section className="win preview" aria-label="Résumé preview">
      <div className="win-bar">
        <span className="win-title">RESUME.DOC</span>
        <span className="win-meta">{hasBullets ? `${generatedBullets.length} ${generatedBullets.length === 1 ? 'project' : 'projects'} · ${VIEWS.find(v => v.id === viewMode)?.label.toLowerCase()}` : 'empty'}</span>
        <span className="win-btns" aria-hidden="true"><span /><span /></span>
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Writing style">
          {TONES.map(t => (
            <button
              key={t.id}
              type="button"
              aria-pressed={activeTone === t.id}
              onClick={() => onToneChange(t.id)}
              onMouseEnter={() => setHoveredTone(t.id)}
              onMouseLeave={() => setHoveredTone(null)}
              onFocus={() => setHoveredTone(t.id)}
              onBlur={() => setHoveredTone(null)}
              disabled={isGenerating}
              title={t.tooltip}
            >
              {isGenerating && activeTone === t.id && <Loader2 size={12} className="spin" aria-hidden="true" />}
              {t.label}
            </button>
          ))}
        </div>

        <div className="seg" role="group" aria-label="Output format">
          {VIEWS.map(v => (
            <button key={v.id} type="button" aria-pressed={viewMode === v.id} onClick={() => setViewMode(v.id)}>
              {v.label}
            </button>
          ))}
        </div>

        <span className="toolbar-spacer" />

        <input ref={docxInputRef} type="file" accept=".docx" onChange={handleDocxUpload} hidden />
        {!uploadedDocx ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => docxInputRef.current?.click()}
            disabled={isGenerating}
            title="Add these projects into your existing Word résumé"
          >
            <Upload size={14} aria-hidden="true" /> Word résumé
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleInjectIntoResume}
            disabled={isInjecting || !hasBullets}
            title={`Add projects to ${uploadedDocx.name}`}
          >
            {isInjecting ? <><Loader2 size={14} className="spin" aria-hidden="true" /> Adding…</> : <><FileUp size={14} aria-hidden="true" /> Add to .docx</>}
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleCopy}
          disabled={!hasBullets || isGenerating}
        >
          {copied ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy {viewMode === 'formatted' ? 'for Word/Docs' : VIEWS.find(v => v.id === viewMode)?.label}</>}
        </button>
      </div>

      <div className="tone-hint">
        <strong>{activeToneObj.name}:</strong> {activeToneObj.tooltip}
      </div>

      {uploadedDocx && (
        <div className={`docx-bar ${injectStatus === 'error' ? 'is-error' : injectStatus === 'success' ? 'is-success' : ''}`} role="status">
          {injectStatus === 'error' ? <AlertCircle size={14} aria-hidden="true" /> : injectStatus === 'success' ? <CheckCircle size={14} aria-hidden="true" /> : <FileUp size={14} aria-hidden="true" />}
          <span><span className="file">{uploadedDocx.name}</span> · {docxMessage}</span>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={handleRemoveUploadedDocx} aria-label="Remove uploaded résumé">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="desk">
        {isGenerating && !hasBullets ? (
          <div className="page">
            <div className="skeleton-status"><span className="blocks" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span> reading repositories</div>
            <div className="skeleton-line" style={{ width: '30%' }} />
            <div className="skeleton-line" style={{ width: '96%', marginTop: 22 }} />
            <div className="skeleton-line" style={{ width: '90%' }} />
            <div className="skeleton-line" style={{ width: '82%' }} />
          </div>
        ) : !hasBullets ? (
          <div className="empty-state">
            <PixelDoc className="empty-art" />
            <h3>Nothing written yet</h3>
            <p>Pick the projects you want on your résumé from the list, then choose <strong>Write bullets</strong>. A draft shows here right away and is refined by AI a moment later.</p>
          </div>
        ) : viewMode === 'formatted' ? (
          <>
            <div className="page-hint">
              <span>Click any bullet to edit it.</span>
              <span className="hide-sm">Notes in grey are for you and aren't copied.</span>
            </div>
            <article className="page resume">
              <div className="resume-section">Projects</div>

              {generatedBullets.map((repoItem, repoIndex) => {
                const config = getProjectLinkConfig(repoItem.repoId);
                return (
                  <div key={repoItem.repoId} className={`resume-entry ${repoItem.pending ? 'is-pending' : ''}`}>
                    <div className="entry-notes">
                      <span className={`src ${repoItem.source === 'ai' ? 'is-ai' : ''}`} title={repoItem.source === 'ai' ? 'Written by AI from the README, files and detected stack' : 'Built from README features, detected stack and repo stats'}>
                        {repoItem.pending
                          ? <><span className="blocks" aria-hidden="true"><i /><i /><i /><i /></span> draft · AI rewrite on the way</>
                          : repoItem.source === 'ai' ? `AI · ${PROVIDER_LABELS[repoItem.provider] || ''} ${shortModel(repoItem.model)}` : 'draft · offline engine'}
                      </span>
                      <label>
                        <input type="checkbox" checked={config.showGithub} onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { showGithub: e.target.checked })} />
                        GitHub link
                      </label>
                      <label>
                        <input type="checkbox" checked={config.showDemo} onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { showDemo: e.target.checked })} />
                        Demo link
                      </label>
                      {config.showDemo && (
                        <input
                          type="url"
                          placeholder="https://your-demo.app"
                          value={config.demoUrl || ''}
                          onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { demoUrl: e.target.value })}
                          aria-label={`Demo URL for ${repoItem.repoName}`}
                        />
                      )}
                    </div>

                    {repoItem.evidence === 'thin' && (
                      <p className="flag"><AlertCircle size={13} aria-hidden="true" /> This repo has little to go on (no README, few commit messages). Check these bullets, or add a README with a Features section.</p>
                    )}
                    {repoItem.unverified?.length > 0 && (
                      <p className="flag"><AlertCircle size={13} aria-hidden="true" /> {repoItem.unverified.join(', ')} isn't in the repo. Verify or remove before using.</p>
                    )}

                    <div className="resume-head">
                      <span className="resume-title">{repoItem.repoName}</span>
                      <span className="resume-links">
                        {config.showGithub && repoItem.html_url && <a href={repoItem.html_url} target="_blank" rel="noreferrer">GitHub</a>}
                        {config.showDemo && config.demoUrl && <a href={config.demoUrl} target="_blank" rel="noreferrer">Demo</a>}
                      </span>
                      <span className="resume-stack">{repoItem.techStack.join(', ')}</span>
                    </div>

                    <ul>
                      {repoItem.bullets.map((bullet, bulletIndex) => (
                        // Keyed on the text so a regenerate remounts the contentEditable instead of
                        // React patching a text node the user's typing may have replaced
                        <li key={`${bulletIndex}:${bullet}`}>
                          <span
                            className="editable"
                            // Editing a bullet that's about to be replaced would lose the edit
                            contentEditable={!repoItem.pending}
                            suppressContentEditableWarning
                            onBlur={(e) => onBulletEdit(repoIndex, bulletIndex, e.target.innerText)}
                          >
                            {bullet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </article>
          </>
        ) : (
          <pre className="code-view">
            {viewMode === 'markdown' && getMarkdownText()}
            {viewMode === 'latex' && getLatexText()}
            {viewMode === 'json' && getJsonText()}
          </pre>
        )}
      </div>

      {hasBullets && (
        <div className="regen">
          {isCustomPromptOpen && (
            <>
              <div className="chips">
                {SUGGESTIONS.map(chip => (
                  <button key={chip} type="button" className="chip" onClick={() => setCustomPromptText(chip)}>{chip}</button>
                ))}
              </div>
              <form onSubmit={handleCustomRegenerateSubmit}>
                <input
                  type="text"
                  className="field"
                  placeholder="e.g. Focus on the Redis caching and the Docker setup"
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  aria-label="Instruction for rewriting the bullets"
                  autoFocus
                />
                <button type="submit" className="btn btn-primary" disabled={isGenerating || !customPromptText.trim()}>
                  Rewrite
                </button>
              </form>
            </>
          )}
          <div className="regen-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsCustomPromptOpen(!isCustomPromptOpen)}>
              <Wand2 size={14} aria-hidden="true" /> {isCustomPromptOpen ? 'Hide instructions' : 'Rewrite with instructions'}
            </button>
            <span className="toolbar-spacer" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRegenerate()} disabled={isGenerating}>
              <RefreshCw size={14} className={isGenerating ? 'spin' : ''} aria-hidden="true" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// "openai/gpt-oss-120b" -> "gpt-oss-120b"
function shortModel(model) {
  return (model || '').split('/').pop();
}
