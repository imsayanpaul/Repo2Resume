import React, { useState } from 'react';
import { X, Linkedin, ExternalLink, Sparkles, Copy, Check, Globe, Github, Camera, Send, Loader2, Share2 } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      let targetName = 'Project Showcase';
      let targetUrl = urlInput.trim() || 'https://repo2resume.vercel.app';
      
      if (urlInput.includes('github.com/')) {
        targetName = urlInput.split('github.com/')[1] || 'GitHub Repository';
      } else if (urlInput) {
        try {
          targetName = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`).hostname;
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
          `👉 Check out the live demo here: ${targetUrl}\n\n` +
          `#SoftwareEngineering #BuildInPublic #OpenSource #ReactJS #WebDevelopment #DeveloperTools #TechCareer`;
      } else if (selectedStyle === 'architecture') {
        postContent = `🏗️ Engineering Deep-Dive: System Architecture for ${targetName}\n\n` +
          `When building developer-facing tools, performance and design polish are non-negotiable. Here is the technical breakdown under the hood:\n\n` +
          `⚙️ Tech Stack & Implementation:\n` +
          `• Core Engine: React + Vite for high-speed client-side rendering\n` +
          `• AI Intelligence: Gemini 2.0 Flash Vision for real-time code analysis\n` +
          `• Styling: Executive Obsidian & Silver design system with CSS glassmorphism\n` +
          `• Automation: GitHub REST API metadata & AST keyword parser\n\n` +
          `Live Link & Repository: ${targetUrl}\n\n` +
          `Would love to hear your feedback! Drop your thoughts below 👇\n\n` +
          `#SystemDesign #React #TypeScript #AI #WebArchitecture #FrontendEngineering #OpenSource`;
      } else {
        postContent = `💡 Build in Public Update: ${targetName}\n\n` +
          `Over the past few weeks, I set out to solve a real problem: converting complex GitHub projects into high-impact, ATS-optimized resume bullet points.\n\n` +
          `Today, I'm happy to announce the v1.0 release is live! It includes real-time Job Description matching, custom AI prompt regeneration, and full mobile responsiveness.\n\n` +
          `Try it out here: ${targetUrl}\n\n` +
          `#BuildInPublic #SoftwareDeveloper #ResumeTips #AI #TechCommunity #ProductLaunch`;
      }

      setGeneratedPost(postContent);
      setIsGenerating(false);
    }, 600);
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

  const handleShareToLinkedIn = () => {
    handleCopy();
    const encodedText = encodeURIComponent(generatedPost || 'Check out this project!');
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodedText}`, '_blank');
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
                LinkedIn <span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.12em', color: '#38bdf8' }}>Post Generator</span>
              </h2>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
          Turn any public website or GitHub repository link into an engaging, high-converting LinkedIn post with automated tech stack highlights and call-to-action hashtags.
        </p>

        {/* URL Input Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ffffff' }}>
            Website or GitHub Repository Link:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="input-field"
                placeholder="https://repo2resume.vercel.app or github.com/username/repo"
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
          {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          <span>Generate LinkedIn Post</span>
        </button>

        {/* Post Preview Output */}
        {generatedPost && (
          <div className="glass-panel animate-fade-in-up" style={{ padding: '16px', background: '#090d12', border: '1px solid #1e293b', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
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

            <textarea
              className="input-field font-sans"
              rows={8}
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
