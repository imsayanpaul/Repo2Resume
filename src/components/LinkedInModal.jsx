import React, { useState } from 'react';
import { X, Linkedin, ExternalLink, Sparkles, Copy, Check, Globe, Github, Camera, Send, Loader2, Share2, Download, Image as ImageIcon, Smartphone, Monitor, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

const POST_STYLES = [
  {
    id: 'launch',
    label: '🚀 Product Launch',
    desc: 'High-converting launch post with problem, solution, & live demo link.'
  },
  {
    id: 'architecture',
    label: '🏗️ Tech Stack Spotlight',
    desc: 'Engineering deep-dive into system design, latency, & framework choices.'
  },
  {
    id: 'build_in_public',
    label: '💡 Build-in-Public Story',
    desc: 'Relatable developer update highlighting milestones & lessons learned.'
  }
];

export default function LinkedInModal({ isOpen, onClose, activeRepos = [] }) {
  const [urlInput, setUrlInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('launch');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedPost, setGeneratedPost] = useState('');
  
  // Multi-Screenshot State
  const [screenshotTabs, setScreenshotTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState('desktop');
  const [isImgLoading, setIsImgLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsImgLoading(true);

    const rawInput = urlInput.trim() || 'https://repo2resume.vercel.app';
    let cleanUrl = rawInput;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const encoded = encodeURIComponent(cleanUrl);

    // Multi-Viewport & Multi-Section Live Screenshot Suite
    const capturedScreenshots = [
      {
        id: 'desktop',
        label: '🖥️ Hero Desktop',
        icon: Monitor,
        url: `https://api.microlink.io/?url=${encoded}&screenshot=true&embed=screenshot.url`
      },
      {
        id: 'features',
        label: '⚡ Features & Layout',
        icon: Layers,
        url: `https://s.wordpress.com/mshots/v1/${encoded}?w=1200&h=800`
      },
      {
        id: 'mobile',
        label: '📱 Mobile View',
        icon: Smartphone,
        url: `https://api.microlink.io/?url=${encoded}&screenshot=true&viewport.width=375&viewport.height=812&embed=screenshot.url`
      }
    ];

    setScreenshotTabs(capturedScreenshots);
    setActiveTabId('desktop');

    setTimeout(() => {
      let targetName = 'Project Showcase';
      if (urlInput.includes('github.com/')) {
        targetName = urlInput.split('github.com/')[1] || 'GitHub Repository';
      } else if (urlInput) {
        try {
          targetName = new URL(cleanUrl).hostname;
        } catch {
          targetName = urlInput;
        }
      }

      let postContent = '';

      if (selectedStyle === 'launch') {
        postContent = `🚀 Excited to share what I've been building: ${targetName}!\n\n` +
          `Traditional resume builders write generic fluff. I wanted a tool that inspects actual GitHub codebases, extracts dependency frameworks, and formats achievements into Google's XYZ formula.\n\n` +
          `✨ Key Features:\n` +
          `• 🔍 Deep Repository & README Parsing (even if README is sparse)\n` +
          `• 🎯 Job Description Keyword Matcher to pass ATS screeners\n` +
          `• 📄 1-Click Exports to LaTeX, Markdown, & Rich HTML\n` +
          `• 🔒 100% Client-Side Privacy (Zero backend middleman servers)\n\n` +
          `👉 Check out the live demo here: ${cleanUrl}\n\n` +
          `#SoftwareEngineering #BuildInPublic #OpenSource #ReactJS #WebDevelopment #DeveloperTools #TechCareer`;
      } else if (selectedStyle === 'architecture') {
        postContent = `🏗️ Engineering Deep-Dive: System Architecture for ${targetName}\n\n` +
          `When building developer-facing tools, performance and design polish are non-negotiable. Here is the technical breakdown under the hood:\n\n` +
          `⚙️ Tech Stack & Implementation:\n` +
          `• Core Engine: React + Vite for high-speed client-side rendering\n` +
          `• AI Intelligence: Gemini 2.0 Flash Vision for real-time code analysis\n` +
          `• Styling: Executive Obsidian & Silver design system with CSS glassmorphism\n` +
          `• Automation: GitHub REST API metadata & AST keyword parser\n\n` +
          `Live Link & Repository: ${cleanUrl}\n\n` +
          `Would love to hear your feedback! Drop your thoughts below 👇\n\n` +
          `#SystemDesign #React #TypeScript #AI #WebArchitecture #FrontendEngineering #OpenSource`;
      } else {
        postContent = `💡 Build in Public Update: ${targetName}\n\n` +
          `Over the past few weeks, I set out to solve a real problem: converting complex GitHub projects into high-impact, ATS-optimized resume bullet points.\n\n` +
          `Today, I'm happy to announce the v1.0 release is live! It includes real-time Job Description matching, custom AI prompt regeneration, and full mobile responsiveness.\n\n` +
          `Try it out here: ${cleanUrl}\n\n` +
          `#BuildInPublic #SoftwareDeveloper #ResumeTips #AI #TechCommunity #ProductLaunch`;
      }

      setGeneratedPost(postContent);
      setIsGenerating(false);
    }, 700);
  };

  const handleImgError = (tabId) => {
    const rawInput = urlInput.trim() || 'https://repo2resume.vercel.app';
    let cleanUrl = rawInput.startsWith('http') ? rawInput : `https://${rawInput}`;
    const encoded = encodeURIComponent(cleanUrl);

    setScreenshotTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          url: `https://s.wordpress.com/mshots/v1/${encoded}?w=1200&h=800`
        };
      }
      return tab;
    }));
    setIsImgLoading(false);
  };

  const handleCopy = async () => {
    if (!generatedPost) return;
    try {
      await navigator.clipboard.writeText(generatedPost);
      setCopied(true);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const activeScreenshot = screenshotTabs.find(t => t.id === activeTabId) || screenshotTabs[0];

  const handleDownloadSingle = async (tab) => {
    if (!tab?.url) return;
    try {
      const response = await fetch(tab.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${tab.id}-screenshot.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(tab.url, '_blank');
    }
  };

  const handleDownloadAll = () => {
    screenshotTabs.forEach(tab => {
      handleDownloadSingle(tab);
    });
  };

  const handleShareToLinkedIn = async () => {
    await handleCopy();
    const rawInput = urlInput.trim() || 'https://repo2resume.vercel.app';
    let cleanUrl = rawInput.startsWith('http') ? rawInput : `https://${rawInput}`;

    const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cleanUrl)}`;
    window.open(linkedinShareUrl, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '720px', border: '1px solid #0077b5', background: '#0e141a' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Linkedin size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                Multi-Page <span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.12em', color: '#38bdf8' }}>Website Explorer & LinkedIn Generator</span>
              </h2>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
          Enter any website URL. Repo2Resume explores the site, captures <strong>multiple page & viewport screenshots</strong> (Desktop, Features, Mobile), and writes a LinkedIn launch post.
        </p>

        {/* URL Input Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ffffff' }}>
            Target Website or Repository URL:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="input-field"
                placeholder="e.g. https://repo2resume.vercel.app"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.84rem' }}
              />
            </div>
          </div>
        </div>

        {/* Style Selector */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ffffff', display: 'block', marginBottom: '8px' }}>
            Select LinkedIn Post Tone:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {POST_STYLES.map(style => (
              <button
                key={style.id}
                type="button"
                className={`btn ${selectedStyle === style.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setSelectedStyle(style.id)}
                style={{ justifyContent: 'flex-start', padding: '8px 10px', height: 'auto', textAlign: 'left', borderRadius: 'var(--radius-md)' }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.8rem' }}>{style.label}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: '2px', fontWeight: '400' }}>{style.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Trigger */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{ width: '100%', height: '40px', fontSize: '0.86rem', gap: '8px', marginBottom: '18px', background: '#0077b5', borderColor: '#0077b5', color: '#ffffff' }}
        >
          {isGenerating ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
          <span>Explore Site & Capture Multi-Page Screenshots</span>
        </button>

        {/* Multi-Screenshot Gallery Container */}
        {generatedPost && screenshotTabs.length > 0 && (
          <div className="glass-panel animate-fade-in-up" style={{ padding: '16px', background: '#090d12', border: '1px solid #1e293b', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Screenshot Multi-Tab Gallery */}
            <div style={{ background: '#05070a', border: '1px solid #1e293b', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              
              {/* Tab Selector Navigation Bar */}
              <div style={{ padding: '6px 10px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                
                {/* Viewport / Page Tabs */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {screenshotTabs.map(tab => {
                    const IconComp = tab.icon;
                    const isActive = activeTabId === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTabId(tab.id);
                          setIsImgLoading(true);
                        }}
                        className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                        style={{
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          height: '24px',
                          gap: '5px',
                          background: isActive ? '#0077b5' : 'transparent',
                          borderColor: isActive ? '#0077b5' : 'transparent',
                          color: isActive ? '#ffffff' : '#94a3b8'
                        }}
                      >
                        <IconComp size={12} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Multi Download Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm font-mono"
                    onClick={() => handleDownloadSingle(activeScreenshot)}
                    style={{ fontSize: '0.7rem', padding: '1px 8px', height: '24px', gap: '4px' }}
                    title="Download Current Screenshot"
                  >
                    <Download size={11} /> Save Current
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm font-mono"
                    onClick={handleDownloadAll}
                    style={{ fontSize: '0.7rem', padding: '1px 8px', height: '24px', gap: '4px', background: '#0077b5', borderColor: '#0077b5' }}
                    title="Download All 3 Screenshots for LinkedIn Carousel"
                  >
                    <Download size={11} /> Download All (3)
                  </button>
                </div>
              </div>
              
              {/* Image Preview Canvas */}
              <div style={{ position: 'relative', width: '100%', minHeight: '220px', maxHeight: '280px', overflow: 'hidden', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isImgLoading && (
                  <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <Loader2 size={14} className="spin" /> Capturing {activeScreenshot?.label}...
                  </div>
                )}
                {activeScreenshot && (
                  <img
                    src={activeScreenshot.url}
                    alt={activeScreenshot.label}
                    onLoad={() => setIsImgLoading(false)}
                    onError={() => handleImgError(activeScreenshot.id)}
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                )}
              </div>
            </div>

            {/* Post Action Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Linkedin size={14} /> Ready for LinkedIn Feed
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopy}
                  style={{ fontSize: '0.76rem', padding: '3px 10px', height: '28px' }}
                >
                  {copied ? <Check size={12} color="#ffffff" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy Post'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleShareToLinkedIn}
                  style={{ fontSize: '0.76rem', padding: '3px 10px', height: '28px', background: '#0077b5', borderColor: '#0077b5' }}
                >
                  <Share2 size={12} />
                  <span>Share on LinkedIn ↗</span>
                </button>
              </div>
            </div>

            {/* LinkedIn 1-Click Paste Notice Banner */}
            <div style={{ padding: '8px 12px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} flexShrink={0} />
              <span>
                <strong>Next step in LinkedIn tab:</strong> Press <strong>Ctrl + V</strong> (Paste) in the LinkedIn composer box to paste your AI text!
              </span>
            </div>

            {/* Generated Post Textarea */}
            <textarea
              className="input-field font-sans"
              rows={7}
              value={generatedPost}
              onChange={(e) => setGeneratedPost(e.target.value)}
              style={{ fontSize: '0.84rem', lineHeight: '1.6', background: '#05070a', color: '#f1f5f9', border: '1px solid #1e293b', resize: 'vertical' }}
            />
          </div>
        )}

      </div>
    </div>
  );
}


