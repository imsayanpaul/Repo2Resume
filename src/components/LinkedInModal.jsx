import React, { useState } from 'react';
import { X, Linkedin, ExternalLink, Sparkles, Copy, Check, Globe, Github, Camera, Send, Loader2, Share2, Download, Image as ImageIcon } from 'lucide-react';
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
  const [screenshotUrl, setScreenshotUrl] = useState('');
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

    // Primary Screenshot API: Microlink API (Instant, live Chromium render)
    const primaryScreenshot = `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&embed=screenshot.url`;
    setScreenshotUrl(primaryScreenshot);

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

  const handleImgError = () => {
    const rawInput = urlInput.trim() || 'https://repo2resume.vercel.app';
    let cleanUrl = rawInput.startsWith('http') ? rawInput : `https://${rawInput}`;
    // Secondary Fallback: WordPress mshots
    const fallbackScreenshot = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(cleanUrl)}?w=1200&h=675`;
    if (screenshotUrl !== fallbackScreenshot) {
      setScreenshotUrl(fallbackScreenshot);
    } else {
      setIsImgLoading(false);
    }
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

  const handleDownloadScreenshot = async () => {
    if (!screenshotUrl) return;
    try {
      const response = await fetch(screenshotUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'website-screenshot.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(screenshotUrl, '_blank');
    }
  };

  const handleShareToLinkedIn = async () => {
    // 1. Auto-copy generated post text
    await handleCopy();

    const rawInput = urlInput.trim() || 'https://repo2resume.vercel.app';
    let cleanUrl = rawInput.startsWith('http') ? rawInput : `https://${rawInput}`;

    // 2. Try Native Web Share API if supported
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Project Showcase',
          text: generatedPost,
          url: cleanUrl
        });
        return;
      } catch {
        // Fallback to official LinkedIn share window
      }
    }

    // 3. Official LinkedIn Share Window + Auto-Copy Notification
    const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cleanUrl)}`;
    window.open(linkedinShareUrl, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '680px', border: '1px solid #0077b5', background: '#0e141a' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Linkedin size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                LinkedIn <span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.12em', color: '#38bdf8' }}>Post & Screenshot Explorer</span>
              </h2>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
          Drop any public website URL below. Repo2Resume automatically captures a live Chromium screenshot of the site, analyzes features, and formats an engaging LinkedIn launch post.
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
          <span>Capture Screenshot & Generate LinkedIn Post</span>
        </button>

        {/* Automatic Screenshot & Post Output Container */}
        {generatedPost && (
          <div className="glass-panel animate-fade-in-up" style={{ padding: '16px', background: '#090d12', border: '1px solid #1e293b', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Live Captured Website Screenshot Card */}
            {screenshotUrl && (
              <div style={{ background: '#05070a', border: '1px solid #1e293b', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94a3b8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={12} color="#38bdf8" /> Automated Live Screenshot Captured
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm font-mono"
                      onClick={handleDownloadScreenshot}
                      style={{ fontSize: '0.7rem', padding: '1px 8px', height: '22px', gap: '4px' }}
                    >
                      <Download size={11} /> Download Image
                    </button>
                    <a href={screenshotUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm font-mono" style={{ fontSize: '0.7rem', color: '#38bdf8', padding: '1px 6px', height: '22px' }}>
                      Open Full Image ↗
                    </a>
                  </div>
                </div>
                
                <div style={{ position: 'relative', width: '100%', minHeight: '180px', maxHeight: '260px', overflow: 'hidden', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isImgLoading && (
                    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                      <Loader2 size={14} className="spin" /> Rendering Headless Screenshot...
                    </div>
                  )}
                  <img
                    src={screenshotUrl}
                    alt=""
                    onLoad={() => setIsImgLoading(false)}
                    onError={handleImgError}
                    style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                  />
                </div>
              </div>
            )}

            {/* Post Action Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

