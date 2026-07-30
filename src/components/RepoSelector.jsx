import React, { useState, useMemo } from 'react';
import { Star, GitFork, CheckSquare, Square, Filter, Code2, AlertCircle, Loader2, Terminal, Briefcase } from 'lucide-react';
import { matchRepoToJd } from '../services/jdMatcher';

// Helper to strip raw GitHub shortcode emojis (e.g. :zap:, :sparkles:)
function cleanDescription(desc) {
  if (!desc) return '';
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

  // Available Languages list
  const availableLangs = useMemo(() => {
    const langs = new Set(repos.map(r => r.language).filter(Boolean));
    return ['ALL', ...Array.from(langs)];
  }, [repos]);

  // Filtered & JD Scored Repos
  const processedRepos = useMemo(() => {
    return repos
      .map(r => {
        const jdMatch = matchRepoToJd(r, jdKeywords);
        return { ...r, ...jdMatch };
      })
      .filter(r => {
        const cleanDesc = cleanDescription(r.description);
        const matchesText = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            cleanDesc.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLang = selectedLang === 'ALL' || r.language === selectedLang;
        return matchesText && matchesLang;
      })
      .sort((a, b) => (b.scorePercent || 0) - (a.scorePercent || 0) || b.stargazers_count - a.stargazers_count);
  }, [repos, searchTerm, selectedLang, jdKeywords]);

  return (
    <div className="glass-panel repo-sidebar" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', minHeight: 0, overflowX: 'hidden' }}>
      
      {/* User Info Header */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px', flexShrink: 0, minWidth: 0, overflow: 'hidden' }}>
          <img 
            src={user.avatar_url} 
            alt={user.name} 
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-accent)' }} 
          />
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>{user.name}</h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }} className="font-mono">
              @{user.username} • {user.public_repos || repos.length} Repositories
            </p>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Language Filter */}
      <div className="repo-control-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
        <input 
          type="text"
          className="input-field"
          placeholder="Filter repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '140px', height: '36px', padding: '0 12px', fontSize: '0.84rem', lineHeight: '36px', boxSizing: 'border-box' }}
        />
        <select 
          className="input-field repo-lang-select"
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          style={{ width: 'auto', minWidth: '125px', height: '36px', fontSize: '0.84rem', lineHeight: '36px', boxSizing: 'border-box' }}
        >
          {availableLangs.map(l => (
            <option key={l} value={l}>{l === 'ALL' ? 'All Languages' : l}</option>
          ))}
        </select>
      </div>

      {/* Selection Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', flexShrink: 0 }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          Selected: <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{selectedRepoIds.length}</strong> / {repos.length} repos
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button type="button" onClick={onSelectAll} className="btn btn-ghost btn-sm" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', padding: '2px 8px' }}>
            Select All
          </button>
          <span style={{ color: 'var(--border-muted)', fontSize: '0.75rem' }}>|</span>
          <button type="button" onClick={onDeselectAll} className="btn btn-ghost btn-sm" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', padding: '2px 8px' }}>
            Deselect
          </button>
        </div>
      </div>

      {/* Repositories Scrollable List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        {processedRepos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <AlertCircle size={26} style={{ marginBottom: '8px', opacity: 0.6 }} />
            <p style={{ fontSize: '0.84rem' }}>No repositories match your filter criteria.</p>
          </div>
        ) : (
          processedRepos.map(repo => {
            const isSelected = selectedRepoIds.includes(repo.id);
            const cleanedDesc = cleanDescription(repo.description);

            return (
              <div 
                key={repo.id}
                onClick={() => onToggleSelect(repo.id)}
                style={{
                  padding: '11px 13px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? '#1c1c22' : '#141418',
                  border: isSelected ? '1px solid var(--border-accent)' : '1px solid var(--border-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {/* Top Title Bar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    {isSelected ? <CheckSquare size={16} color="#ffffff" style={{ flexShrink: 0 }} /> : <Square size={16} color="#71717a" style={{ flexShrink: 0 }} />}
                    <h3 style={{ fontSize: '0.88rem', fontWeight: '600', color: isSelected ? '#ffffff' : 'var(--text-primary)', fontFamily: 'var(--font-display)', wordBreak: 'break-word' }}>
                      {repo.name}
                    </h3>
                  </div>

                  {/* JD Match Badge */}
                  {jdKeywords && jdKeywords.length > 0 && repo.scorePercent > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '1px 6px', flexShrink: 0 }}>
                      {repo.scorePercent}% Match
                    </span>
                  )}
                </div>

                {/* Cleaned Description */}
                {cleanedDesc && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
                    {cleanedDesc}
                  </p>
                )}

                {/* Tech Stack & Stats Badges */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', marginTop: '2px', width: '100%' }}>
                  {repo.language && (
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                      <Code2 size={11} /> {repo.language}
                    </span>
                  )}

                  {repo.detected_deps?.slice(0, 3).map(dep => (
                    <span key={dep} className="badge" style={{ fontSize: '0.68rem' }}>
                      {dep}
                    </span>
                  ))}

                  <div className="font-mono" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Star size={11} color="#e2e8f0" /> {repo.stargazers_count}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <GitFork size={11} /> {repo.forks_count}
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Pinned Bottom Actions */}
      <div style={{ flexShrink: 0, paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Match Job Description Button */}
        <button 
          type="button" 
          className="btn btn-sm"
          onClick={onOpenJdModal}
          title="Match Job Description keywords"
          style={{ 
            width: '100%',
            gap: '8px', 
            height: '40px', 
            fontSize: '0.82rem',
            fontWeight: '600',
            borderRadius: 'var(--radius-md)',
            border: hasJdKeywords ? '1px solid rgba(255, 255, 255, 0.5)' : '1px dashed rgba(255, 255, 255, 0.25)',
            background: hasJdKeywords ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            color: hasJdKeywords ? '#ffffff' : '#d4d4d8',
            boxShadow: hasJdKeywords ? '0 0 12px rgba(255, 255, 255, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Briefcase size={14} />
          <span>{hasJdKeywords ? '✓ JD Match Active' : 'Match Job Description'}</span>
        </button>

        {/* Generate Resume Bullets */}
        <button 
          type="button" 
          className="btn btn-primary"
          disabled={selectedRepoIds.length === 0 || isGenerating}
          onClick={onGenerate}
          style={{
            width: '100%',
            opacity: (selectedRepoIds.length === 0 || isGenerating) ? 0.6 : 1,
            cursor: (selectedRepoIds.length === 0 || isGenerating) ? 'not-allowed' : 'pointer',
            height: '42px'
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="spin" />
              <span>Generating AI Bullets...</span>
            </>
          ) : (
            <>
              <Terminal size={16} />
              <span>Generate Resume Bullets ({selectedRepoIds.length})</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
