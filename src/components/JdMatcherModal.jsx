import React, { useState } from 'react';
import { X, Target, CheckCircle2, Tag, Zap, Code2, Sparkles } from 'lucide-react';
import { extractJdKeywords } from '../services/jdMatcher';

const SAMPLE_ROLES = [
  {
    label: 'Full-Stack Lead',
    text: 'Looking for a Senior Full-Stack Engineer with strong expertise in React, TypeScript, Node.js, GraphQL, PostgreSQL, Docker, and AWS. Responsible for architecting scalable cloud services, implementing CI/CD pipelines, and driving performance optimization.'
  },
  {
    label: 'Frontend Architect',
    text: 'Seeking a Lead Frontend Engineer proficient in Next.js, React, TypeScript, TailwindCSS, State Management (Zustand/Redux), Web Vitals optimization, and micro-frontend architecture.'
  },
  {
    label: 'Backend & Systems',
    text: 'We are hiring a Principal Systems Engineer skilled in Go, Rust, Python, Distributed Systems, Redis, Kubernetes, Kafka, gRPC, and microservice telemetry.'
  }
];

export default function JdMatcherModal({ isOpen, onClose, onApplyJd, currentJdText, activeKeywords }) {
  const [text, setText] = useState(currentJdText || '');
  const [extracted, setExtracted] = useState(activeKeywords || []);

  if (!isOpen) return null;

  const handleTextChange = (newText) => {
    setText(newText);
    const keywords = extractJdKeywords(newText);
    setExtracted(keywords);
  };

  const handleSelectSample = (sampleText) => {
    handleTextChange(sampleText);
  };

  const handleSave = () => {
    onApplyJd(text, extracted);
    onClose();
  };

  const handleClear = () => {
    setText('');
    setExtracted([]);
    onApplyJd('', []);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', border: '1px solid var(--border-accent)', background: '#121216' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Target size={20} color="#ffffff" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
              Job Description <span className="font-serif-italic" style={{ fontWeight: '400', fontSize: '1.12em' }}>Keyword Matcher</span>
            </h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.55' }}>
          Paste a target job posting below. Repo2Resume extracts required technical skills, scores repository relevance, and aligns generated resume bullet points with ATS criteria.
        </p>

        {/* Quick Sample Presets Bar */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} /> Try sample roles:
          </span>
          {SAMPLE_ROLES.map(role => (
            <button
              key={role.label}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleSelectSample(role.text)}
              style={{ fontSize: '0.74rem', padding: '3px 9px', height: '26px' }}
            >
              {role.label}
            </button>
          ))}
        </div>

        {/* Text Area Input */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <textarea
            className="input-field"
            rows={6}
            placeholder="Paste Job Description text here (e.g. Looking for a Senior Full-Stack Engineer proficient in React, TypeScript, Docker, Redis, and PostgreSQL...)"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ 
              resize: 'vertical', 
              fontFamily: 'inherit', 
              fontSize: '0.86rem', 
              lineHeight: '1.5', 
              background: '#0d0d10', 
              borderColor: 'var(--border-muted)',
              padding: '12px' 
            }}
          />
        </div>

        {/* Extracted Keywords Skill Badges */}
        {extracted.length > 0 ? (
          <div style={{ marginBottom: '20px', padding: '14px', background: '#18181b', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#ffffff' }}>
                <Tag size={13} /> Extracted Required Skills ({extracted.length}):
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Auto-Matched
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {extracted.map(skill => (
                <span key={skill} className="badge badge-primary" style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                  <CheckCircle2 size={11} /> {skill}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '20px', padding: '12px 14px', background: '#18181b', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Paste a job description above to automatically parse technologies and score project relevance.
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {text || extracted.length > 0 ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear} style={{ color: '#f87171', fontSize: '0.78rem' }}>
              Clear & Disable Filter
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: '0.86rem' }}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} style={{ fontSize: '0.86rem' }}>
              <CheckCircle2 size={15} /> Apply & Score Repos
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
