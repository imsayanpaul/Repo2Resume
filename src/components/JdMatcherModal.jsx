import React, { useState } from 'react';
import { X } from 'lucide-react';
import { extractJdKeywords } from '../services/jdMatcher';

const SAMPLE_ROLES = [
  {
    label: 'Full-stack lead',
    text: 'Looking for a Senior Full-Stack Engineer with strong expertise in React, TypeScript, Node.js, GraphQL, PostgreSQL, Docker, and AWS. Responsible for architecting scalable cloud services, implementing CI/CD pipelines, and driving performance optimization.'
  },
  {
    label: 'Frontend architect',
    text: 'Seeking a Lead Frontend Engineer proficient in Next.js, React, TypeScript, TailwindCSS, State Management (Zustand/Redux), Web Vitals optimization, and micro-frontend architecture.'
  },
  {
    label: 'Backend & systems',
    text: 'We are hiring a Principal Systems Engineer skilled in Go, Rust, Python, Distributed Systems, Redis, Kubernetes, Kafka, gRPC, and microservice telemetry.'
  }
];

export default function JdMatcherModal({ isOpen, onClose, onApplyJd, currentJdText, activeKeywords }) {
  const [text, setText] = useState(currentJdText || '');
  const [extracted, setExtracted] = useState(activeKeywords || []);

  if (!isOpen) return null;

  const handleTextChange = (newText) => {
    setText(newText);
    setExtracted(extractJdKeywords(newText));
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
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="jd-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="dialog-head">
          <div>
            <h2 id="jd-title">Match a job description</h2>
            <p>Paste a posting. Projects that use its skills move to the top, and bullets mention those skills where the project really uses them.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="dialog-body">
          <div>
            <textarea
              className="field"
              rows={7}
              placeholder="Paste the job description here"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              aria-label="Job description"
            />
            <div className="try-row" style={{ marginTop: 10 }}>
              <span>Or try a sample</span>
              {SAMPLE_ROLES.map(role => (
                <button key={role.label} type="button" onClick={() => handleTextChange(role.text)}>{role.label}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">
              {extracted.length > 0 ? `Skills found (${extracted.length})` : 'Skills found'}
            </p>
            {extracted.length > 0 ? (
              <div className="skill-list">
                {extracted.map(skill => <span key={skill} className="tag tag-accent">{skill}</span>)}
              </div>
            ) : (
              <p className="hint" style={{ marginTop: 0 }}>Technologies named in the posting will show here as you paste.</p>
            )}
          </div>
        </div>

        <div className="dialog-foot">
          {(text || extracted.length > 0) && (
            <button type="button" className="btn btn-ghost btn-danger-text btn-sm" onClick={handleClear}>Clear matching</button>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={extracted.length === 0 && !currentJdText}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
