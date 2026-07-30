import React, { useState } from 'react';
import { Copy, Check, Download, Edit3, Sparkles, RefreshCw, FileCode, Printer, Layers, FileText, Loader2, Info, ExternalLink, Github, Globe } from 'lucide-react';
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
      // Use ClipboardItem API for Dual Format (HTML for Word/Docs + Plain Text for Markdown/Notepad)
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
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Toolbar: Tone Switcher & View Modes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Tone Selector with Tooltips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
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
                style={{ fontSize: '0.78rem', gap: '6px', position: 'relative' }}
              >
                {isGenerating && isActive && <Loader2 size={12} className="spin" />}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Format Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            <button
              className={`btn btn-sm ${viewMode === 'formatted' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('formatted')}
              title="Formatted Card View (Word / Docs friendly)"
            >
              <FileText size={14} /> Preview
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'markdown' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('markdown')}
              title="Markdown text"
            >
              <FileCode size={14} /> MD
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'latex' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('latex')}
              title="LaTeX resume format"
            >
              LaTeX
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'json' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setViewMode('json')}
              title="JSON Resume format"
            >
              JSON
            </button>
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy} disabled={generatedBullets.length === 0 || isGenerating} title="Copy formatted text to Clipboard">
            {copied ? <Check size={14} color="#6ee7b7" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint} disabled={generatedBullets.length === 0 || isGenerating} title="Print or Save as PDF">
            <Printer size={14} />
          </button>
        </div>

      </div>

      {/* Dynamic Hover Tooltip Explanation Banner */}
      <div style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(6, 182, 212, 0.07)',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        transition: 'all 0.2s ease'
      }}>
        <Info size={14} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: 'var(--accent-cyan)' }}>{activeToneObj.label}:</strong> {activeToneObj.tooltip}
        </span>
      </div>

      {/* Main Content Area */}
      {isGenerating ? (
        /* Loading Skeleton State */
        <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '28px', minHeight: '400px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--accent-violet)', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <Loader2 size={18} className="spin" />
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
              Gemini AI is analyzing codebase & generating ATS bullets...
            </span>
          </div>

          {/* Skeleton Repo Block 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="pulse-skeleton" style={{ width: '180px', height: '22px' }} />
              <div className="pulse-skeleton" style={{ width: '140px', height: '18px' }} />
            </div>
            <div className="pulse-skeleton" style={{ width: '100%', height: '16px' }} />
            <div className="pulse-skeleton" style={{ width: '92%', height: '16px' }} />
            <div className="pulse-skeleton" style={{ width: '85%', height: '16px' }} />
          </div>

          {/* Skeleton Repo Block 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="pulse-skeleton" style={{ width: '160px', height: '22px' }} />
              <div className="pulse-skeleton" style={{ width: '140px', height: '18px' }} />
            </div>
            <div className="pulse-skeleton" style={{ width: '96%', height: '16px' }} />
            <div className="pulse-skeleton" style={{ width: '88%', height: '16px' }} />
          </div>

        </div>
      ) : generatedBullets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Sparkles size={40} style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--accent-violet)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Resume Bullets Generated Yet
          </h3>
          <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.88rem' }}>
            Select repositories from the left panel and click <strong>"Generate Resume Text"</strong> to build ATS-optimized project bullets.
          </p>
        </div>
      ) : (
        <div style={{ minHeight: '400px' }}>
          
          {/* Formatted Interactive Editor View */}
          {viewMode === 'formatted' && (
            <div className="resume-paper" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ borderBottom: '2px solid var(--border-accent)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PROJECTS & TECHNICAL EXPERIENCES
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click any text to edit inline</span>
              </div>

              {generatedBullets.map((repoItem, repoIndex) => {
                const config = getProjectLinkConfig(repoItem.repoId);

                return (
                  <div key={repoItem.repoId} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: repoIndex < generatedBullets.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    
                    {/* Repo Title & Tech Stack */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {repoItem.repoName}
                        </h4>
                        
                        {/* GitHub Link Badge */}
                        {config.showGithub && itemLinkBadge(repoItem.html_url, 'GitHub', <Github size={12} />)}
                        
                        {/* Live Demo Link Badge */}
                        {config.showDemo && config.demoUrl && itemLinkBadge(config.demoUrl, 'Live Demo', <Globe size={12} />)}
                      </div>

                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {repoItem.techStack.join(' • ')}
                      </span>
                    </div>

                    {/* Per-Project Link Controls Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '2px', fontSize: '0.78rem', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600' }}>Project Links:</span>
                      
                      {/* GitHub Checkbox */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: config.showGithub ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        <input 
                          type="checkbox" 
                          checked={config.showGithub} 
                          onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { showGithub: e.target.checked })} 
                          style={{ accentColor: 'var(--accent-violet)' }}
                        />
                        <Github size={13} /> GitHub Link
                      </label>

                      {/* Live Demo Checkbox */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: config.showDemo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        <input 
                          type="checkbox" 
                          checked={config.showDemo} 
                          onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { showDemo: e.target.checked })} 
                          style={{ accentColor: 'var(--accent-cyan)' }}
                        />
                        <Globe size={13} /> Live Demo
                      </label>

                      {/* Live Demo URL input (shown only if showDemo is checked for this project) */}
                      {config.showDemo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Demo URL:</span>
                          <input 
                            type="url"
                            className="input-field"
                            placeholder="https://my-app.vercel.app..."
                            value={config.demoUrl || ''}
                            onChange={(e) => updateProjectLinkConfig(repoItem.repoId, { demoUrl: e.target.value })}
                            style={{ padding: '2px 8px', fontSize: '0.78rem', height: '24px', width: '220px' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Bullet Points List */}
                    <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {repoItem.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => onBulletEdit(repoIndex, bulletIndex, e.target.innerText)}
                            style={{ outline: 'none', borderBottom: '1px dashed transparent', transition: 'border 0.2s' }}
                            onFocus={(e) => e.target.style.borderBottom = '1px dashed var(--accent-violet)'}
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

          {/* Raw Code Views (Markdown, LaTeX, JSON) */}
          {viewMode !== 'formatted' && (
            <div style={{ position: 'relative' }}>
              <pre style={{
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: '#a5b4fc',
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

      {/* Footer Regenerate Action */}
      {generatedBullets.length > 0 && !isGenerating && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onRegenerate}
            disabled={isGenerating}
          >
            <RefreshCw size={14} className={isGenerating ? 'spin' : ''} />
            <span>Regenerate Bullets</span>
          </button>
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
        color: 'var(--accent-cyan)',
        background: 'rgba(6, 182, 212, 0.1)',
        padding: '2px 8px',
        borderRadius: '4px',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        textDecoration: 'none'
      }}
    >
      {icon} {label} <ExternalLink size={10} />
    </a>
  );
}
