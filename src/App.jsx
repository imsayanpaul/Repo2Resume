import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import RepoSelector from './components/RepoSelector';
import ResumePreview from './components/ResumePreview';
import JdMatcherModal from './components/JdMatcherModal';
import SettingsModal from './components/SettingsModal';
import { fetchUserRepos } from './services/github';
import { generateRepoBullets } from './services/aiGenerator';
import { AlertTriangle, Search, Github, Code2, CheckCircle2, Zap, ShieldCheck, ExternalLink, Globe } from 'lucide-react';

export default function App() {
  // Application State
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState([]);
  const [generatedBullets, setGeneratedBullets] = useState([]);
  const [bulletsCache, setBulletsCache] = useState({}); // { [toneId]: resultsArray }
  
  const [activeTone, setActiveTone] = useState('xyz');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  // Modals
  const [isJdOpen, setIsJdOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [rateLimitReason, setRateLimitReason] = useState(null); // 'github' | 'gemini' | null
  const [jdText, setJdText] = useState('');
  const [jdKeywords, setJdKeywords] = useState([]);

  // Local Storage & Environment API Keys
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gitresume_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('gitresume_gh_token') || '');

  // Generate Bullets for selected repos with Cache Support
  const handleGenerateBullets = useCallback(async (toneOverride = null, forceRegenerate = false) => {
    if (selectedRepoIds.length === 0) return;
    const toneToUse = toneOverride || activeTone;

    if (!forceRegenerate && bulletsCache[toneToUse]) {
      setGeneratedBullets(bulletsCache[toneToUse]);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const selectedRepos = repos.filter(r => selectedRepoIds.includes(r.id));
      const results = [];

      for (const repo of selectedRepos) {
        const bullets = await generateRepoBullets(repo, toneToUse, geminiApiKey, jdKeywords);
        results.push({
          repoId: repo.id,
          repoName: repo.name,
          description: repo.description,
          techStack: repo.detected_deps?.length > 0 ? repo.detected_deps : [repo.language],
          bullets,
          html_url: repo.html_url
        });
      }

      setGeneratedBullets(results);
      setBulletsCache(prev => ({
        ...prev,
        [toneToUse]: results
      }));
    } catch (err) {
      console.error('Error generating bullets:', err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('quota') || msg.includes('429') || msg.includes('403')) {
        setRateLimitReason('gemini');
        setIsSettingsOpen(true);
      }
      setErrorMsg(msg || 'Failed to generate resume bullet points.');
    } finally {
      setLoading(false);
    }
  }, [repos, selectedRepoIds, activeTone, geminiApiKey, jdKeywords, bulletsCache]);

  // Fetch Live GitHub User Repos
  const handleSearchUser = async (username) => {
    if (!username || !username.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchUserRepos(username.trim(), githubToken);
      setUserData(data.user);
      setRepos(data.repos);
      setGeneratedBullets([]);
      setBulletsCache({});
      const topIds = data.repos.slice(0, 3).map(r => r.id);
      setSelectedRepoIds(topIds);
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('rate limit') || msg.includes('403') || msg.includes('429')) {
        setRateLimitReason('github');
        setIsSettingsOpen(true);
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Repo Selection Handlers
  const handleToggleSelectRepo = (id) => {
    setSelectedRepoIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setBulletsCache({});
  };

  const handleSelectAll = () => {
    setSelectedRepoIds(repos.map(r => r.id));
    setBulletsCache({});
  };

  const handleDeselectAll = () => {
    setSelectedRepoIds([]);
    setBulletsCache({});
  };

  // Inline Bullet Edit Handler
  const handleBulletEdit = (repoIndex, bulletIndex, newText) => {
    setGeneratedBullets(prev => {
      const next = [...prev];
      next[repoIndex].bullets[bulletIndex] = newText;
      
      setBulletsCache(cache => ({
        ...cache,
        [activeTone]: next
      }));

      return next;
    });
  };

  // Tone Change Handler
  const handleToneChange = (newTone) => {
    setActiveTone(newTone);

    if (bulletsCache[newTone]) {
      setGeneratedBullets(bulletsCache[newTone]);
    } else {
      handleGenerateBullets(newTone, false);
    }
  };

  const handleForceRegenerate = () => {
    handleGenerateBullets(activeTone, true);
  };

  const handleSaveGeminiKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('gitresume_gemini_key', key);
  };

  const handleSaveGithubToken = (token) => {
    setGithubToken(token);
    localStorage.setItem('gitresume_gh_token', token);
  };

  const handleApplyJd = (text, keywords) => {
    setJdText(text);
    setJdKeywords(keywords);
    setBulletsCache({});
  };

  // Return to Homepage / Clear Active Workspace
  const handleGoHome = () => {
    setUserData(null);
    setRepos([]);
    setSelectedRepoIds([]);
    setGeneratedBullets([]);
    setBulletsCache({});
    setSearchInput('');
    setErrorMsg(null);
  };

  return (
    <div className={`app-container ${userData ? 'workspace-active' : ''}`}>
      
      {/* Executive Clean Header */}
      <Header 
        onGoHome={handleGoHome}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenJdModal={() => setIsJdOpen(true)}
        activeUsername={userData?.username}
        hasJdKeywords={jdKeywords.length > 0}
        hasApiKey={Boolean(geminiApiKey)}
      />

      {/* Error Alert Banner */}
      {errorMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.86rem'
        }}>
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button type="button" className="btn-ghost" onClick={() => setErrorMsg(null)} style={{ cursor: 'pointer', color: '#fca5a5', fontSize: '0.8rem' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!userData ? (
        /* Premium Executive Hero Experience */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '960px', margin: '24px auto 0 auto', width: '100%' }}>
          
          {/* Main Hero Box */}
          <div className="glass-panel animate-fade-in-up" style={{ padding: '52px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            
            <div>
              <h2 style={{ fontSize: '2.75rem', fontWeight: '700', lineHeight: '1.25', marginBottom: '14px', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                Turn GitHub Repositories into <br />
                <span className="font-serif-italic" style={{ color: '#ffffff', fontSize: '1.22em', paddingRight: '4px' }}>ATS-Winning</span> Resume Bullets.
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '620px', margin: '0 auto', lineHeight: '1.6' }}>
                Inspect public GitHub repositories, extract technical architecture and dependencies, and generate quantified Google XYZ formula achievements.
              </p>
            </div>

            {/* Direct Search Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearchUser(searchInput); }} style={{ width: '100%', maxWidth: '500px', display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Github size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter GitHub username (e.g. imsayanpaul)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{ paddingLeft: '44px', height: '48px', fontSize: '0.94rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '48px', padding: '0 24px', fontSize: '0.9rem' }} disabled={loading}>
                {loading ? 'Analyzing...' : 'Generate Bullets'}
              </button>
            </form>

            {/* Quick Profile Suggestions */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>Sample profiles:</span>
              {['imsayanpaul', 'gaearon', 'yyx99', 'torvalds'].map(name => (
                <button
                  key={name}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSearchUser(name)}
                  style={{ fontSize: '0.78rem', padding: '3px 10px', height: '28px' }}
                >
                  @{name}
                </button>
              ))}
            </div>

          </div>

          {/* Clean Executive Sample Output Card */}
          <div className="glass-panel glass-panel-hoverable animate-fade-in-up delay-1" style={{ padding: '24px', border: '1px solid var(--border-muted)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={16} color="var(--accent-silver)" />
                <span style={{ fontSize: '0.88rem', fontWeight: '600', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                  Sample Project Output — facebook/react
                </span>
              </div>
              <span className="badge" style={{ fontSize: '0.72rem' }}>
                Google XYZ Formula
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#ffffff' }}>
                    react-concurrent-renderer
                  </h4>
                  
                  {/* Sample GitHub Link Badge */}
                  <a 
                    href="https://github.com/facebook/react" 
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
                    <Github size={11} /> GitHub <ExternalLink size={9} />
                  </a>

                  {/* Sample Live Demo Link Badge */}
                  <a 
                    href="https://react.dev" 
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
                    <Globe size={11} /> Live Demo <ExternalLink size={9} />
                  </a>
                </div>

                <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  TypeScript • WebAssembly • Reconciliation Engine
                </span>
              </div>

              {/* Sample Links Control Bar */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '2px', fontSize: '0.76rem', background: '#18181b', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: '600' }}>Links:</span>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default', color: '#ffffff' }}>
                  <input type="checkbox" checked readOnly style={{ accentColor: '#ffffff' }} />
                  <Github size={12} /> GitHub Link
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default', color: '#ffffff' }}>
                  <input type="checkbox" checked readOnly style={{ accentColor: '#ffffff' }} />
                  <Globe size={12} /> Live Demo
                </label>
              </div>

              <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <li>
                  <strong style={{ color: '#ffffff' }}>Accomplished 40% reduction in UI paint latency</strong> by architecting a time-slicing concurrent scheduler using requestIdleCallback web APIs.
                </li>
                <li>
                  <strong style={{ color: '#ffffff' }}>Engineered non-blocking reconciliation pipeline</strong> supporting priority-based updates across 10,000+ simultaneous DOM node mutations.
                </li>
                <li>
                  <strong style={{ color: '#ffffff' }}>Optimized memory allocation profile by 32%</strong> through custom Fiber tree pooling and generational garbage collection hooks.
                </li>
              </ul>
            </div>

          </div>

          {/* Feature Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            <div className="glass-panel glass-panel-hoverable animate-fade-in-up delay-2" style={{ padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <Zap size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '3px', color: '#ffffff' }}>Google XYZ Formula</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  Quantifies achievements: "Accomplished [X] as measured by [Y], by doing [Z]" for technical resume scanners.
                </p>
              </div>
            </div>

            <div className="glass-panel glass-panel-hoverable animate-fade-in-up delay-2" style={{ padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '3px', color: '#ffffff' }}>ATS Scanner Ready</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  Generates clean Markdown, LaTeX, and JSON formats ready to paste directly into standard resume builders.
                </p>
              </div>
            </div>

            <div className="glass-panel glass-panel-hoverable animate-fade-in-up delay-3" style={{ padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#18181b', border: '1px solid #27272a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '3px', color: '#ffffff' }}>JD Keyword Matcher</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                  Matches target job description skills against repo dependencies to highlight relevant tech experience.
                </p>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Active User Workspace Dual Pane Layout */
        <main className="main-layout">
          
          {/* Left Sidebar: Repositories Selector */}
          <RepoSelector 
            user={userData}
            repos={repos}
            selectedRepoIds={selectedRepoIds}
            onToggleSelect={handleToggleSelectRepo}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            jdKeywords={jdKeywords}
            onGenerate={handleForceRegenerate}
            isGenerating={loading}
          />

          {/* Right Main Panel: Live Resume Preview & Editor */}
          <ResumePreview 
            generatedBullets={generatedBullets}
            onToneChange={handleToneChange}
            activeTone={activeTone}
            onBulletEdit={handleBulletEdit}
            onRegenerate={handleForceRegenerate}
            isGenerating={loading}
          />

        </main>
      )}

      {/* Modals */}
      <JdMatcherModal 
        isOpen={isJdOpen}
        onClose={() => setIsJdOpen(false)}
        onApplyJd={handleApplyJd}
        currentJdText={jdText}
        activeKeywords={jdKeywords}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setRateLimitReason(null);
        }}
        geminiApiKey={geminiApiKey}
        onSaveGeminiKey={handleSaveGeminiKey}
        githubToken={githubToken}
        onSaveGithubToken={handleSaveGithubToken}
        rateLimitReason={rateLimitReason}
        onClearRateLimitReason={() => setRateLimitReason(null)}
      />

    </div>
  );
}
