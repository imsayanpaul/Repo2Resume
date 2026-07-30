import React, { useState, useMemo } from 'react';
import { Star, GitFork, CheckSquare, Square, Filter, Code2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { matchRepoToJd } from '../services/jdMatcher';

export default function RepoSelector({ 
  user, 
  repos, 
  selectedRepoIds, 
  onToggleSelect, 
  onSelectAll, 
  onDeselectAll,
  jdKeywords,
  onGenerate,
  isGenerating
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
        const matchesText = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            r.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLang = selectedLang === 'ALL' || r.language === selectedLang;
        return matchesText && matchesLang;
      })
      .sort((a, b) => (b.scorePercent || 0) - (a.scorePercent || 0) || b.stargazers_count - a.stargazers_count);
  }, [repos, searchTerm, selectedLang, jdKeywords]);

  return (
    <div className="glass-panel repo-sidebar" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* User Info Header */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <img 
            src={user.avatar_url} 
            alt={user.name} 
            style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--border-accent)' }} 
          />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{user.name}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{user.username} • {user.public_repos || repos.length} Repositories</p>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Language Filter */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text"
          className="input-field"
          placeholder="Filter repositories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '150px' }}
        />
        <select 
          className="input-field"
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          style={{ width: 'auto', minWidth: '110px' }}
        >
          {availableLangs.map(l => (
            <option key={l} value={l}>{l === 'ALL' ? 'All Languages' : l}</option>
          ))}
        </select>
      </div>

      {/* Selection Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          Selected: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedRepoIds.length}</strong> / {repos.length} repos
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onSelectAll} className="btn-ghost" style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>Select All</button>
          <button type="button" onClick={onDeselectAll} className="btn-ghost" style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>Deselect</button>
        </div>
      </div>

      {/* Repositories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
        {processedRepos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.6 }} />
            <p>No repositories match your filter criteria.</p>
          </div>
        ) : (
          processedRepos.map(repo => {
            const isSelected = selectedRepoIds.includes(repo.id);

            return (
              <div 
                key={repo.id}
                onClick={() => onToggleSelect(repo.id)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* Top Title Bar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isSelected ? <CheckSquare size={18} color="#8b5cf6" /> : <Square size={18} color="#6b7280" />}
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: isSelected ? '#a5b4fc' : 'var(--text-primary)' }}>
                      {repo.name}
                    </h3>
                  </div>

                  {/* JD Match Badge if available */}
                  {jdKeywords && jdKeywords.length > 0 && repo.scorePercent > 0 && (
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                      {repo.scorePercent}% JD Match
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {repo.description}
                </p>

                {/* Tech Stack & Stats Badges */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  <span className="badge badge-primary">
                    <Code2 size={12} /> {repo.language}
                  </span>

                  {repo.detected_deps?.slice(0, 3).map(dep => (
                    <span key={dep} className="badge" style={{ fontSize: '0.7rem' }}>
                      {dep}
                    </span>
                  ))}

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Star size={12} color="#f59e0b" /> {repo.stargazers_count}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <GitFork size={12} /> {repo.forks_count}
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Generate Action Button */}
      <button 
        type="button" 
        className="btn btn-primary"
        disabled={selectedRepoIds.length === 0 || isGenerating}
        onClick={onGenerate}
        style={{
          marginTop: '8px',
          width: '100%',
          opacity: (selectedRepoIds.length === 0 || isGenerating) ? 0.6 : 1,
          cursor: (selectedRepoIds.length === 0 || isGenerating) ? 'not-allowed' : 'pointer'
        }}
      >
        {isGenerating ? (
          <>
            <Loader2 size={18} className="spin" />
            <span>Generating AI Bullets...</span>
          </>
        ) : (
          <>
            <Sparkles size={18} />
            <span>Generate Resume Text ({selectedRepoIds.length})</span>
          </>
        )}
      </button>

    </div>
  );
}
