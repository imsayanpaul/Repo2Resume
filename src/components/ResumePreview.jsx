import React, { useState } from 'react';
import { Copy, Check, Download, Edit3, RefreshCw, FileCode, Layers, Eye, Loader2, Info, ExternalLink, Github, Globe, Terminal } from 'lucide-react';
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

  return (
    <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', minHeight: 0 }}>
      
      {/* Top Toolbar: Tone Switcher & View Modes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
        
        {/* Tone Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#0f0f12', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy} disabled={generatedBullets.length === 0 || isGenerating} title="Copy text to Clipboard" style={{ height: '30px', fontSize: '0.78rem' }}>
            {copied ? <Check size={13} color="#ffffff" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

      </div>

      {/* Dynamic Hover Tooltip Explanation Banner */}
      <div style={{
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        background: '#18181b',
        border: '1px solid var(--border-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        <Info size={14} color="var(--text-primary)" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#ffffff' }}>{activeToneObj.label}:</strong> {activeToneObj.tooltip}
        </span>
      </div>

      {/* Main Content Area */}
      {isGenerating ? (
        /* Skeletal Loader State */
        <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#ffffff', padding: '12px', background: '#18181b', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
            <Loader2 size={16} className="spin" />
            <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>
              Analyzing codebase & generating ATS bullets...
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
          <FileText size={40} style={{ marginBottom: '12px', opacity: 0.4, color: '#ffffff' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff', marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
            No Resume Bullets <span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.08em' }}>Generated Yet</span>
          </h3>
          <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.84rem', lineHeight: '1.5' }}>
            Select repositories from the left panel and click <strong>"Generate Resume Bullets"</strong> to build ATS-optimized project bullets.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* Formatted Interactive Editor View */}
          {viewMode === 'formatted' && (
            <div className="resume-paper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: '700', letterSpacing: '0.02em', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                  PROJECTS & <span className="font-serif-italic" style={{ fontSize: '1.08em', fontWeight: '400' }}>Technical Experiences</span>
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Click any bullet to edit inline</span>
              </div>

              {generatedBullets.map((repoItem, repoIndex) => {
                const config = getProjectLinkConfig(repoItem.repoId);

                return (
                  <div key={repoItem.repoId} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '14px', borderBottom: repoIndex < generatedBullets.length - 1 ? '1px solid var(--border-muted)' : 'none' }}>
                    
                    {/* Repo Title & Tech Stack */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: '600', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '2px', fontSize: '0.76rem', background: '#18181b', padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
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

      {/* Footer Regenerate Action */}
      {generatedBullets.length > 0 && !isGenerating && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-muted)', flexShrink: 0 }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onRegenerate}
            disabled={isGenerating}
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} className={isGenerating ? 'spin' : ''} />
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
        fontSize: '0.7rem',
        color: '#f4f4f5',
        background: '#18181b',
        padding: '2px 7px',
        borderRadius: '4px',
        border: '1px solid #27272a',
        textDecoration: 'none'
      }}
    >
      {icon} {label} <ExternalLink size={9} />
    </a>
  );
}
