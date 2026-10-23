import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import RepoSelector from './components/RepoSelector';
import ResumePreview from './components/ResumePreview';
import JdMatcherModal from './components/JdMatcherModal';
import SettingsModal from './components/SettingsModal';
import Footer from './components/Footer';
import { fetchUserRepos, enrichRepoDetails, setServerGithub } from './services/github';
import { generateTemplateBullets, generateAiBullets } from './services/resumeEngine';
import { AlertTriangle, Loader2 } from 'lucide-react';

// Storage can throw in private windows or with site data blocked
function readStorage(key) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* keys just won't persist */ }
}

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

  // Visitor's own keys (browser only). Deployment keys live server-side behind /api.
  const [geminiApiKey, setGeminiApiKey] = useState(() => readStorage('gitresume_gemini_key'));
  const [githubToken, setGithubToken] = useState(() => readStorage('gitresume_gh_token'));
  const [serverConfig, setServerConfig] = useState({ serverAi: false, serverGithub: false });

  // Ask the deployment which keys it holds; a static host without /api just leaves both false
  useEffect(() => {
    fetch('/api/config')
      .then(res => (res.ok ? res.json() : null))
      .then(cfg => {
        if (!cfg) return;
        const next = { serverAi: Boolean(cfg.serverAi), serverGithub: Boolean(cfg.serverGithub) };
        setServerConfig(next);
        setServerGithub(next.serverGithub);
      })
      .catch(() => {});
  }, []);

  const aiEnabled = Boolean(geminiApiKey) || serverConfig.serverAi;

  // Generate Bullets for selected repos with Cache Support
  const handleGenerateBullets = useCallback(async (toneOverride = null, forceRegenerate = false, customInstruction = '') => {
    if (selectedRepoIds.length === 0) return;
    const toneToUse = toneOverride || activeTone;

    if (!forceRegenerate && !customInstruction && bulletsCache[toneToUse]) {
      setGeneratedBullets(bulletsCache[toneToUse]);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const selectedRepos = repos.filter(r => selectedRepoIds.includes(r.id));
      const results = new Array(selectedRepos.length);
      const aiErrors = new Set();
      let templateCount = 0;
      // Show whatever is ready, in the repos' original order
      const publish = () => setGeneratedBullets(results.filter(Boolean));

      const toEntry = (repo, result, pending) => ({
        repoId: repo.id,
        repoName: repo.name,
        description: repo.description,
        // A résumé stack line names the main tools, not every dependency
        techStack: ((repo.ai_stack?.length ? repo.ai_stack : repo.detected_deps)?.length > 0
          ? (repo.ai_stack?.length ? repo.ai_stack : repo.detected_deps)
          : [repo.language]).slice(0, 6),
        bullets: result.bullets,
        html_url: repo.html_url,
        source: result.source,
        provider: result.provider,
        model: result.model,
        unverified: result.unverified || [],
        evidence: result.evidence || 'rich',
        pending
      });

      const generateOne = async (repo, index) => {
        await enrichRepoDetails(repo, githubToken);
        // Template bullets appear immediately; AI replaces them when it answers
        results[index] = toEntry(repo, generateTemplateBullets(repo, toneToUse, jdKeywords), aiEnabled);
        publish();
        if (!aiEnabled) return;

        // A rejected key fails identically for every repo, so stop retrying it
        const keyRejected = [...aiErrors].some(e => /rejected/.test(e));
        try {
          const ai = await generateAiBullets(
            repo, toneToUse, keyRejected ? '' : geminiApiKey, jdKeywords, customInstruction,
            { serverAi: serverConfig.serverAi }
          );
          results[index] = ai ? toEntry(repo, ai, false) : { ...results[index], pending: false };
        } catch (err) {
          aiErrors.add(err.message);
          templateCount++;
          results[index] = { ...results[index], pending: false };
        }
        publish();
      };

      // A few repos at a time: AI calls can take seconds each,
      // but firing all of them at once trips free-tier rate limits
      const CONCURRENCY = 3;
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, selectedRepos.length) }, async () => {
        while (next < selectedRepos.length) {
          const index = next++;
          await generateOne(selectedRepos[index], index);
        }
      }));

      publish();
      setBulletsCache(prev => ({
        ...prev,
        [toneToUse]: results
      }));

      const notices = [];
      if (aiErrors.size > 0) {
        const scope = templateCount === results.length ? 'these bullets come' : `${templateCount} of ${results.length} projects come`;
        notices.push(`AI generation failed, so ${scope} from the offline template engine. ${[...aiErrors][0]}`);
      }
      const incomplete = selectedRepos.filter(r => r.enrichIncomplete).length;
      if (incomplete > 0) {
        notices.push(`GitHub's API limit was reached, so file listings and commit counts are missing for ${incomplete} project${incomplete > 1 ? 's' : ''}. Add a GitHub token in Settings for a higher limit.`);
      }
      if (notices.length > 0) setErrorMsg(notices.join(' '));
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
  }, [repos, selectedRepoIds, activeTone, geminiApiKey, githubToken, serverConfig, aiEnabled, jdKeywords, bulletsCache]);

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
      setSelectedRepoIds([]);
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
    const next = generatedBullets.map((item, i) => i !== repoIndex ? item : {
      ...item,
      bullets: item.bullets.map((b, j) => j === bulletIndex ? newText : b)
    });
    setGeneratedBullets(next);
    setBulletsCache(cache => ({
      ...cache,
      [activeTone]: next
    }));
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

  const handleForceRegenerate = (customInstruction = '') => {
    handleGenerateBullets(activeTone, true, typeof customInstruction === 'string' ? customInstruction : '');
  };

  const handleSaveGeminiKey = (key) => {
    setGeminiApiKey(key);
    writeStorage('gitresume_gemini_key', key);
  };

  const handleSaveGithubToken = (token) => {
    setGithubToken(token);
    writeStorage('gitresume_gh_token', token);
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

  const sampleProfiles = ['imsayanpaul', 'gaearon', 'yyx990803', 'torvalds'];

  return (
    <div className="shell">
      <Header
        onGoHome={handleGoHome}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeUsername={userData?.username}
        hasApiKey={aiEnabled}
      />

      {errorMsg && (
        <div className="notice" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span className="notice-body">{errorMsg}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setErrorMsg(null)}>
            Dismiss
          </button>
        </div>
      )}

      {!userData ? (
        <>
          <main className="landing">
            <section className="hero">
              <div>
                <p className="eyebrow"><span className="dot dot-on" aria-hidden="true" /> for the Projects section of a résumé</p>
                <h1>Your GitHub repos, written up as <em>résumé bullets</em> you can defend.</h1>
                <p className="hero-sub">
                  Repo2Resume reads each project's README, dependency files and commit history, then drafts bullets that say what you actually built. Every number is checked against the repo.
                </p>

                <form
                  className="search"
                  onSubmit={(e) => { e.preventDefault(); handleSearchUser(searchInput); }}
                >
                  <label className="search-input">
                    <span className="search-prefix">github.com/</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      autoComplete="off"
                      spellCheck="false"
                      aria-label="GitHub username or profile URL"
                    />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <><span className="blocks" aria-hidden="true"><i /><i /><i /><i /></span> Reading repos</> : 'Load repositories'}
                  </button>
                </form>

                <div className="try-row">
                  <span>Or try</span>
                  {sampleProfiles.map(name => (
                    <button key={name} type="button" onClick={() => handleSearchUser(name)}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* A real output next to the sources it was built from */}
              <div className="demo" aria-label="Example output for the Reeldex repository">
                <div className="win">
                  <div className="win-bar">
                    <span className="win-title">RESUME.DOC</span>
                    <span className="win-meta">reeldex</span>
                    <span className="win-btns" aria-hidden="true"><span /><span /></span>
                  </div>
                  <div className="page resume" style={{ border: 0 }}>
                    <div className="resume-section">Projects</div>
                    <div className="resume-entry">
                      <div className="resume-head">
                        <span className="resume-title">Reeldex</span>
                        <span className="resume-links"><a href="https://github.com/imsayanpaul/Reeldex" target="_blank" rel="noreferrer">GitHub</a></span>
                        <span className="resume-stack">Python, FastAPI, React, PostgreSQL</span>
                      </div>
                      <ul>
                        <li>Built a searchable second brain for Instagram Reels that transcribes each DMed reel with Whisper and sorts it by topic.</li>
                        <li>Designed a FastAPI pipeline that receives Instagram DMs via webhook and stores transcripts in PostgreSQL through SQLAlchemy.</li>
                        <li>Shipped "Ask Dex", a chat that answers questions across saved reels, over 209 commits.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="win">
                  <div className="win-bar">
                    <span className="win-title">SOURCES.LOG</span>
                  </div>
                  <ul className="log">
                    <li><span className="ok">ok</span><span>README.md <span className="k">→ features, purpose</span></span><span className="k">12 KB</span></li>
                    <li><span className="ok">ok</span><span>requirements.txt <span className="k">→ FastAPI, SQLAlchemy</span></span><span className="k">deps</span></li>
                    <li><span className="ok">ok</span><span>package.json <span className="k">→ React, Vite</span></span><span className="k">deps</span></li>
                    <li><span className="ok">ok</span><span>git log <span className="k">→ 209 commits by author</span></span><span className="k">count</span></li>
                    <li><span className="ok">ok</span><span>numbers checked <span className="k">→ 0 invented</span></span><span className="k">pass</span></li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="steps" aria-label="How it works">
              <div className="step">
                <p className="step-num">01</p>
                <h3>Reads the repo</h3>
                <p>README feature lists, package.json and requirements.txt, Dockerfiles, CI workflows and your own commit messages.</p>
              </div>
              <div className="step">
                <p className="step-num">02</p>
                <h3>Drafts in seconds</h3>
                <p>Plain-English bullets appear immediately; AI-written versions replace them about a second later. Pick XYZ, STAR, technical or ATS style.</p>
              </div>
              <div className="step">
                <p className="step-num">03</p>
                <h3>Checks every claim</h3>
                <p>Unbacked numbers and tech get rewritten or flagged, and thin repos are marked for review. Export to Word, LaTeX, Markdown or JSON.</p>
              </div>
            </section>
          </main>

          <Footer
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenJdModal={() => setIsJdOpen(true)}
          />
        </>
      ) : (
        <main className={`workspace ${errorMsg ? 'with-notice' : ''}`}>
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
            onOpenJdModal={() => setIsJdOpen(true)}
            hasJdKeywords={jdKeywords.length > 0}
          />

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
        serverConfig={serverConfig}
      />
    </div>
  );
}
