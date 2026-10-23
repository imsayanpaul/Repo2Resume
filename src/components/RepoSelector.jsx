import React, { useState, useMemo } from 'react';
import { Star, GitFork, Briefcase } from 'lucide-react';
import { matchRepoToJd } from '../services/jdMatcher';

// GitHub's own language colors
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  Vue: '#41b883',
  Codebase: '#8a857b'
};

// 8×8 tick on the pixel grid
function PixelTick() {
  return (
    <svg width="10" height="10" viewBox="0 0 8 8" shapeRendering="crispEdges">
      <path d="M6 1h1v2H6v1H5v1H4v1H3v1H2V6H1V4h1v1h1V4h1V3h1V2h1z" fill="currentColor" />
    </svg>
  );
}

// Strip GitHub shortcode emojis (e.g. :zap:, :sparkles:)
function cleanDescription(desc) {
  if (!desc || desc === 'No description provided.') return '';
  return desc.replace(/:[a-z0-9_+-]+:/gi, '').trim();
}

export default function RepoSelector({
  user,
  repos,
  selectedRepoIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  jdKeywords,
  onGenerate,
  isGenerating,
  onOpenJdModal,
  hasJdKeywords
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLang, setSelectedLang] = useState('ALL');

  const availableLangs = useMemo(
    () => Array.from(new Set(repos.map(r => r.language).filter(Boolean))).sort(),
    [repos]
  );

  // Filtered, JD-scored and sorted
  const processedRepos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return repos
      .map(r => ({ ...r, ...matchRepoToJd(r, jdKeywords) }))
      .filter(r => {
        const matchesText = r.name.toLowerCase().includes(term) || cleanDescription(r.description).toLowerCase().includes(term);
        const matchesLang = selectedLang === 'ALL' || r.language === selectedLang;
        return matchesText && matchesLang;
      })
      .sort((a, b) => (b.scorePercent || 0) - (a.scorePercent || 0) || b.stargazers_count - a.stargazers_count);
  }, [repos, searchTerm, selectedLang, jdKeywords]);

  const count = selectedRepoIds.length;

  return (
    <aside className="win picker" aria-label="Repositories">
      <div className="win-bar">
        <span className="win-title">PROJECTS.LST</span>
        <span className="win-meta">{count}/{repos.length}</span>
      </div>
      <div className="picker-head">
        {user && (
          <div className="profile">
            <img src={user.avatar_url} alt="" />
            <div style={{ minWidth: 0 }}>
              <div className="profile-name">{user.name}</div>
              <div className="profile-meta">@{user.username} · {repos.length} {repos.length === 1 ? 'project' : 'projects'}</div>
            </div>
          </div>
        )}

        <div className="picker-filters">
          <input
            type="search"
            className="field"
            placeholder="Filter projects"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Filter repositories"
          />
          <select
            className="field"
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            aria-label="Filter by language"
          >
            <option value="ALL">All languages</option>
            {availableLangs.map(l => <option key={l} value={l}>{l === 'Codebase' ? 'Unknown' : l}</option>)}
          </select>
        </div>

        <div className="picker-bulk">
          <span><span className="mono">{count}</span> of {repos.length} selected</span>
          <span className="picker-bulk-actions">
            <button type="button" className="link-btn" onClick={onSelectAll}>Select all</button>
            <button type="button" className="link-btn" onClick={onDeselectAll} disabled={count === 0}>Clear</button>
          </span>
        </div>
      </div>

      <div className="repo-list">
        {processedRepos.length === 0 ? (
          <p className="empty-list">No repositories match this filter.</p>
        ) : (
          processedRepos.map(repo => {
            const isSelected = selectedRepoIds.includes(repo.id);
            const desc = cleanDescription(repo.description);
            const deps = (repo.detected_deps || []).filter(dep => dep !== repo.language).slice(0, 3);

            return (
              <button
                key={repo.id}
                type="button"
                className={`repo-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onToggleSelect(repo.id)}
                aria-pressed={isSelected}
              >
                <span className="check" aria-hidden="true"><PixelTick /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="repo-name">
                    <span>{repo.name}</span>
                    {jdKeywords?.length > 0 && repo.scorePercent > 0 && (
                      <span className="match" title={`Matches: ${repo.matchedKeywords.join(', ')}`}>{repo.scorePercent}% match</span>
                    )}
                  </span>
                  {desc && <span className="repo-desc">{desc}</span>}
                  <span className="repo-meta">
                    {repo.language && repo.language !== 'Codebase' && (
                      <span><i className="lang-dot" style={{ background: LANG_COLORS[repo.language] || '#8a857b' }} />{repo.language}</span>
                    )}
                    {deps.length > 0 && <span>{deps.join(' · ')}</span>}
                    {repo.stargazers_count > 0 && <span><Star size={11} />{repo.stargazers_count}</span>}
                    {repo.forks_count > 0 && <span><GitFork size={11} />{repo.forks_count}</span>}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="picker-foot">
        <button
          type="button"
          className={`btn btn-secondary ${hasJdKeywords ? 'jd-on' : ''}`}
          onClick={onOpenJdModal}
        >
          <Briefcase size={15} aria-hidden="true" />
          {hasJdKeywords ? `Matching ${jdKeywords.length} job skills` : 'Match a job description'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={count === 0 || isGenerating}
          onClick={onGenerate}
        >
          {isGenerating
            ? <><span className="blocks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span> Writing bullets</>
            : count === 0 ? 'Select projects to write up' : `Write bullets for ${count} ${count === 1 ? 'project' : 'projects'}`}
        </button>
      </div>
    </aside>
  );
}
