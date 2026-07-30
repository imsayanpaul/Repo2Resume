import React, { useState } from 'react';
import { X, Sparkles, FileText, CheckCircle2, Tag } from 'lucide-react';
import { extractJdKeywords } from '../services/jdMatcher';

export default function JdMatcherModal({ isOpen, onClose, onApplyJd, currentJdText, activeKeywords }) {
  const [text, setText] = useState(currentJdText || '');
  const [extracted, setExtracted] = useState(activeKeywords || []);

  if (!isOpen) return null;

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    const keywords = extractJdKeywords(newText);
    setExtracted(keywords);
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Job Description Keyword Matcher</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Paste a target job posting below. Repo2Resume will automatically extract required technical skills, score your repositories, and customize generated bullet points to boost your ATS match score.
        </p>

        {/* Text Area */}
        <textarea
          className="input-field"
          rows={7}
          placeholder="Paste Job Description text here (e.g. Looking for a Senior Full-Stack Engineer with experience in React, TypeScript, Docker, Redis, and PostgreSQL...)"
          value={text}
          onChange={handleTextChange}
          style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: '16px' }}
        />

        {/* Extracted Keywords Preview */}
        {extracted.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
              <Tag size={14} /> Extracted Required Skills ({extracted.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {extracted.map(skill => (
                <span key={skill} className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                  <CheckCircle2 size={12} /> {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear} style={{ color: '#ef4444' }}>
            Clear & Disable Filter
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <Sparkles size={16} /> Apply & Score Repos
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
