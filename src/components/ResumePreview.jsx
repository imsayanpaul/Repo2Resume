import React, { useState } from 'react';
import { Copy, Check, Download, Edit3, RefreshCw, FileCode, Layers, Eye, Loader2, Info, ExternalLink, Github, Globe, Terminal, Sparkles, Wand2, Send, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const TONES = [
  { 
    id: 'xyz', 
    label: 'Google XYZ Formula',
    tagline: 'Google XYZ Formula',
    tooltip: 'Accomplished [X] as measured by [Y] by doing [Z]. Emphasizes quantitative metrics, speed, and performance results.'
  },
  { 
    id: 'star', 
    label: 'STAR Method',
    tagline: 'Situation, Task, Action, Result',
    tooltip: 'Focuses on the engineering challenge solved, key technical actions taken, and final project outcomes.'
  },
  { 
    id: 'technical', 
    label: 'Technical Depth',
    tagline: 'Architecture & System Design',
    tooltip: 'Highlights system architecture, database schemas, clean code standards, and framework implementations.'
  },
  { 
    id: 'ats', 
    label: 'ATS Minimal',
    tagline: 'ATS Parser Optimization',
    tooltip: 'Concise 1-2 line bullet points with strong action verbs engineered for Applicant Tracking Systems (ATS).'
  }
];

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
        links.push(`<a href="${item.html_url}" style="color: #2563eb; text-decoration: none;">GitHub</a>`);
      }
      if (config.showDemo && config.demoUrl) {
        links.push(`<a href="${config.demoUrl}" style="color: #2563eb; text-decoration: none;">Live Demo</a>`);
      }
      const linkSuffix = links.length > 0 ? ` &nbsp;|&nbsp; ${links.join(' &nbsp;|&nbsp; ')}` : '';
      const bulletsList = item.bullets.map(b => `<li style="margin-bottom: 4px;">${b}</li>`).join('');

      return `
        <div style="margin-bottom: 18px; font-family: Arial, sans-serif;">
          <div style="font-size: 13pt; font-weight: bold; color: #111827;">
            ${item.repoName}${linkSuffix}
          </div>
          <div style="font-size: 10pt; color: #4b5563; margin-top: 2px; margin-bottom: 6px;">
            <strong>Technologies:</strong> ${item.techStack.join(', ')}
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
      if (config.showGithub && item.html_url) latexLinks.push(`\\href{${item.html_url}}{\\emph{GitHub}}`);
      if (config.showDemo && config.demoUrl) latexLinks.push(`\\href{${config.demoUrl}}{\\emph{Live Demo}}`);

      const linksStr = latexLinks.length > 0 ? ` $|$ ${latexLinks.join(' $|$ ')}` : '';
      const bulletsText = item.bullets.map(b => `    \\item ${b}`).join('\n');
      return `\\resumeProjectHeading\n    {\\textbf{${item.repoName}}${linksStr} $|$ \\emph{${item.techStack.join(', ')}}}{}\n    \\resumeItemListStart\n${bulletsText}\n    \\resumeItemListEnd`;
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
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.85 } });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomRegenerateSubmit = (e) => {
    e.preventDefault();
    if (customPromptText.trim()) {
      onRegenerate(customPromptText.trim());
      setIsCustomPromptOpen(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', minHeight: 0 }}>
      
      {/* Top Toolbar: Tone Switcher & View Modes */}
      <div className="preview-top-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
        
        {/* Tone Selector */}
        <div className="tone-selector-bar">
          {TONES.map(t => {
            const isActive = activeTone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onToneChange(t.id)}
                onMouseEnter={() => setHoveredTone(t.id)}
                onMouseLeave={() => setHoveredTone(null)}
                title={t.tooltip}
                disabled={isGenerating}
                style={{ fontSize: '0.76rem', padding: '4px 10px', height: '28px', gap: '5px' }}
              >
                {isGenerating && isActive && <Loader2 size={11} className="spin" />}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Format Selector & Actions */}
        <div className="preview-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', background: '#0f0f12', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-muted)' }}>
            <button
              className={`btn btn-sm ${viewMode === 'formatted' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('formatted')}
              title="Formatted Card View"
              style={{ padding: '3px 8px', fontSize: '0.76rem' }}
            >
              <Eye size={13} /> Preview
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'markdown' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('markdown')}
              title="Markdown format"
              style={{ padding: '3px 8px', fontSize: '0.76rem' }}
            >
              <FileCode size={13} /> MD
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'latex' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('latex')}
              title="LaTeX format"
              style={{ padding: '3px 8px', fontSize: '0.76rem' }}
            >
              LaTeX
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'json' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('json')}
              title="JSON Resume format"
              style={{ padding: '3px 8px', fontSize: '0.76rem' }}
            >
              JSON
            </button>
          </div>

          <button 
            type="button" 
            className={`btn ${copied ? 'btn-secondary' : 'btn-primary'} btn-sm`} 
            onClick={handleCopy} 
            disabled={generatedBullets.length === 0 || isGenerating} 
            title="Copy formatted resume text to Clipboard" 
            style={{ 
              height: '32px', 
              fontSize: '0.8rem',
              fontWeight: '700',
              padding: '0 14px',
              gap: '6px',
              borderRadius: 'var(--radius-sm)',
              boxShadow: generatedBullets.length > 0 && !copied ? '0 0 16px rgba(255, 255, 255, 0.3)' : 'none'
            }}
          >
            {copied ? <Check size={14} color="#ffffff" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Resume'}</span>
          </button>
        </div>

      </div>

      {/* Dynamic Hover Tooltip Explanation Banner */}
      <div style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        background: '#121215',
        border: '1px solid var(--border-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.76rem',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        <Info size={13} color="#a1a1aa" style={{ flexShrink: 0 }} />
        <span style={{ lineHeight: '1.4' }}>
          <strong style={{ color: '#ffffff' }}>{activeToneObj.label}:</strong> {activeToneObj.tooltip}
        </span>
      </div>

      {/* Main Content Area */}
      {isGenerating ? (
        /* Loading Skeleton State */
        <div style={{ padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#ffffff', padding: '12px', background: '#18181b', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
            <Loader2 size={16} className="spin" />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
              Gemini AI is analyzing codebase & generating ATS bullets...
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="pulse-skeleton" style={{ width: '180px', height: '20px' }} />
              <div className="pulse-skeleton" style={{ width: '140px', height: '16px' }} />
            </div>
            <div className="pulse-skeleton" style={{ width: '100%', height: '14px' }} />
            <div className="pulse-skeleton" style={{ width: '92%', height: '14px' }} />
            <div className="pulse-skeleton" style={{ width: '85%', height: '14px' }} />
          </div>
        </div>
      ) : generatedBullets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Resume Bullets Generated Yet
          </h3>
          <p style={{ maxWidth: '380px', margin: '0 auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Select repositories from the left panel and click <strong>"Generate Resume Text"</strong> to build ATS-optimized project bullets.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* Formatted Interactive Editor View */}
          {viewMode === 'formatted' && (
            <div className="resume-paper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ffffff' }}>
                  PROJECTS & TECHNICAL EXPERIENCES
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click text to edit inline</span>
              </div>

              {generatedBullets.map((repoItem, repoIndex) => {
                const config = getProjectLinkConfig(repoItem.repoId);

                return (
                  <div key={repoItem.repoId} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: repoIndex < generatedBullets.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    
                    {/* Repo Title & Tech Stack */}
                    <div className="repo-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#ffffff' }}>
                          {repoItem.repoName}
                        </h4>
                        
                        {config.showGithub && itemLinkBadge(repoItem.html_url, 'GitHub', <Github size={11} />)}
                        {config.showDemo && config.demoUrl && itemLinkBadge(config.demoUrl, 'Live Demo', <Globe size={11} />)}
                      </div>

                      <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {repoItem.techStack.join(' • ')}
                      </span>
                    </div>

                    {/* Per-Project Link Controls Toolbar */}
                    <div className="project-links-bar">
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '600' }}>Links:</span>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: config.showGithub ? '#ffffff' : 'var(--text-muted)' }}>
                        <input 
                          type="checkbox" 
                          checked={config.showGithub} 
                          onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { showGithub: e.target.checked })} 
                          style={{ accentColor: '#ffffff' }}
                        />
                        <Github size={12} /> GitHub Link
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: config.showDemo ? '#ffffff' : 'var(--text-muted)' }}>
                        <input 
                          type="checkbox" 
                          checked={config.showDemo} 
                          onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { showDemo: e.target.checked })} 
                          style={{ accentColor: '#ffffff' }}
                        />
                        <Globe size={12} /> Live Demo
                      </label>

                      {config.showDemo && (
                        <div className="demo-url-container" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>URL:</span>
                          <input 
                            type="url"
                            className="input-field"
                            placeholder="https://app.vercel.app..."
                            value={config.demoUrl || ''}
                            onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { demoUrl: e.target.value })}
                            style={{ padding: '2px 6px', fontSize: '0.74rem', height: '22px', width: '180px' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Bullet Points List */}
                    <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {repoItem.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => onBulletEdit(repoIndex, bulletIndex, e.target.innerText)}
                            style={{ outline: 'none', borderBottom: '1px dashed transparent', transition: 'border 0.2s' }}
                            onFocus={(e) => e.target.style.borderBottom = '1px dashed #ffffff'}
                          >
                            {bullet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {/* Raw Code Views */}
          {viewMode !== 'formatted' && (
            <div style={{ position: 'relative' }}>
              <pre className="font-mono" style={{
                background: '#0a0a0c',
                border: '1px solid var(--border-muted)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontSize: '0.82rem',
                color: '#f4f4f5',
                whiteSpace: 'pre-wrap',
                maxHeight: '500px',
                overflowY: 'auto'
              }}>
                {viewMode === 'markdown' && getMarkdownText()}
                {viewMode === 'latex' && getLatexText()}
                {viewMode === 'json' && getJsonText()}
              </pre>
            </div>
          )}

        </div>
      )}

      {/* Footer Regenerate & Specific Request Actions */}
      {generatedBullets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-muted)', flexShrink: 0 }}>
          
          {/* Expandable Custom Instruction Input Bar */}
          {isCustomPromptOpen && (
            <div className="glass-panel animate-fade-in-up" style={{ padding: '12px 14px', background: '#121216', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wand2 size={14} color="#ffffff" /> Regenerate with Specific Request
                </span>
                <button type="button" className="btn-ghost" onClick={() => setIsCustomPromptOpen(false)} style={{ padding: '2px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Quick Suggestion Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  'Emphasize 40% speedup & quantitative metrics',
                  'Highlight testing, security & code coverage',
                  'Focus on microservice backend architecture',
                  'Make concise for a 1-page resume'
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCustomPromptText(chip)}
                    style={{ fontSize: '0.73rem', padding: '3px 9px', height: '24px', borderRadius: '12px', background: '#18181b', border: '1px solid #27272a' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Custom Input & Send Action */}
              <form onSubmit={handleCustomRegenerateSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Focus more on Redis caching, Docker, and AWS deployment..."
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  style={{ height: '36px', fontSize: '0.82rem', background: '#0a0a0c' }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={isGenerating || !customPromptText.trim()} style={{ height: '36px', padding: '0 14px', gap: '6px', whiteSpace: 'nowrap' }}>
                  <Send size={13} /> Generate
                </button>
              </form>
            </div>
          )}

          {/* Bottom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCustomPromptOpen(!isCustomPromptOpen)}
              style={{ fontSize: '0.78rem', gap: '6px', borderStyle: 'dashed' }}
            >
              <Wand2 size={13} />
              <span>{isCustomPromptOpen ? 'Close Custom Request' : 'Regenerate with Specific Prompt...'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onRegenerate()}
              disabled={isGenerating}
              style={{ fontSize: '0.78rem', gap: '6px' }}
            >
              <RefreshCw size={13} className={isGenerating ? 'spin' : ''} />
              <span>Standard Regenerate</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

function itemLinkBadge(url, label, icon) {
  if (!url) return null;
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.72rem',
        color: '#f4f4f5',
        background: '#18181b',
        padding: '2px 8px',
        borderRadius: '4px',
        border: '1px solid #27272a',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
    >
      {icon} <span>{label}</span> <ExternalLink size={10} style={{ flexShrink: 0 }} />
    </a>
  );
}
