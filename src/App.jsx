import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import RepoSelector from './components/RepoSelector';
import ResumePreview from './components/ResumePreview';
import JdMatcherModal from './components/JdMatcherModal';
import SettingsModal from './components/SettingsModal';
import { fetchUserRepos } from './services/github';
import { generateRepoBullets } from './services/aiGenerator';
import { AlertTriangle, Sparkles, Search, Github } from 'lucide-react';

export default function App() {
  // Application State - Starts empty until user searches
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState([]);
  const [generatedBullets, setGeneratedBullets] = useState([]);
  const [bulletsCache, setBulletsCache] = useState({}); // { [toneId]: resultsArray }
  
  const [activeTone, setActiveTone] = useState('xyz');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  // Settings & JD Modals
  const [isJdOpen, setIsJdOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [jdText, setJdText] = useState('');
  const [jdKeywords, setJdKeywords] = useState([]);

  // Local Storage & Environment API Keys
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gitresume_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('gitresume_gh_token') || '');

  // Generate Bullets for selected repos with Cache Support
  const handleGenerateBullets = useCallback(async (toneOverride = null, forceRegenerate = false) => {
    if (selectedRepoIds.length === 0) return;
    const toneToUse = toneOverride || activeTone;

    // Check Cache first if not forcing regeneration
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
      // Save into cache for instant switching back
      setBulletsCache(prev => ({
        ...prev,
        [toneToUse]: results
      }));
    } catch (err) {
      console.error('Error generating bullets:', err);
      setErrorMsg(err.message || 'Failed to generate resume bullet points.');
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
      setBulletsCache({}); // Reset cache for new user
      // Select top 3 repos by default
      const topIds = data.repos.slice(0, 3).map(r => r.id);
      setSelectedRepoIds(topIds);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Repo Selection Handlers (Resets cache when repo selection changes)
  const handleToggleSelectRepo = (id) => {
    setSelectedRepoIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setBulletsCache({}); // Invalidate cache for new repo combination
  };

  const handleSelectAll = () => {
    setSelectedRepoIds(repos.map(r => r.id));
    setBulletsCache({});
  };

  const handleDeselectAll = () => {
    setSelectedRepoIds([]);
    setBulletsCache({});
  };

  // Inline Bullet Edit Handler (Updates both state and cache)
  const handleBulletEdit = (repoIndex, bulletIndex, newText) => {
    setGeneratedBullets(prev => {
      const next = [...prev];
      next[repoIndex].bullets[bulletIndex] = newText;
      
      // Keep cache in sync with user edits
      setBulletsCache(cache => ({
        ...cache,
        [activeTone]: next
      }));

      return next;
    });
  };

  // Tone Change Handler (Instant switch if cached)
  const handleToneChange = (newTone) => {
    setActiveTone(newTone);

    if (bulletsCache[newTone]) {
      // Instant switch from cache with 0 delay & 0 loading
      setGeneratedBullets(bulletsCache[newTone]);
    } else {
      // Generate only if not in cache
      handleGenerateBullets(newTone, false);
    }
  };

  // Explicit Regenerate Trigger (Bypasses cache)
  const handleForceRegenerate = () => {
    handleGenerateBullets(activeTone, true);
  };

  // Save Settings
  const handleSaveGeminiKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('gitresume_gemini_key', key);
  };

  const handleSaveGithubToken = (token) => {
    setGithubToken(token);
    localStorage.setItem('gitresume_gh_token', token);
  };

  // Apply Job Description (Resets cache so bullets align with new JD)
  const handleApplyJd = (text, keywords) => {
    setJdText(text);
    setJdKeywords(keywords);
    setBulletsCache({});
  };

  return (
    <div className="app-container">
      
      {/* App Header */}
      <Header 
        onSearch={handleSearchUser}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenJdModal={() => setIsJdOpen(true)}
        activeUsername={userData?.username}
        hasJdKeywords={jdKeywords.length > 0}
        hasApiKey={Boolean(geminiApiKey)}
      />

      {/* Error Alert */}
      {errorMsg && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={20} color="#ef4444" />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button type="button" className="btn-ghost" onClick={() => setErrorMsg(null)} style={{ cursor: 'pointer', color: '#fca5a5' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!userData ? (
        /* Welcome Hero Screen */
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '750px', margin: '40px auto 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Sparkles size={36} color="#ffffff" />
          </div>

          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>
              Turn GitHub Repos into <span className="gradient-text">ATS Resume Bullets</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '560px', margin: '0 auto' }}>
              Enter any public GitHub username to automatically inspect project codebases, dependencies, and architecture, then generate Google XYZ formula bullet points.
            </p>
          </div>

          {/* Direct Search Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSearchUser(searchInput); }} style={{ width: '100%', maxWidth: '480px', display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Github size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Enter GitHub username or profile URL..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: '44px', height: '48px', fontSize: '1rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '48px', padding: '0 24px' }} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Quick Examples */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Or try popular profiles:</span>
            {['gaearon', 'yyx99', 'sindresorhus', 'torvalds'].map(name => (
              <button
                key={name}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSearchUser(name)}
                style={{ fontSize: '0.8rem' }}
              >
                @{name}
              </button>
            ))}
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
        onClose={() => setIsSettingsOpen(false)}
        geminiApiKey={geminiApiKey}
        onSaveGeminiKey={handleSaveGeminiKey}
        githubToken={githubToken}
        onSaveGithubToken={handleSaveGithubToken}
      />

    </div>
  );
}
