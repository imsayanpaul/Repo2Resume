import React, { useEffect, useState } from 'react';

// Real lines from imsayanpaul/Reeldex. `used` marks the lines that ended up in the bullets.
const FILES = [
  {
    id: 'readme',
    name: 'README.md',
    lines: [
      ['## Features'],
      ['- timed transcripts', true],
      ['- .srt subtitle export', true],
      ['- one-click translation'],
      ['- Ask Dex: chat with saved reels', true]
    ]
  },
  {
    id: 'req',
    name: 'requirements.txt',
    lines: [
      ['fastapi>=0.109.0', true],
      ['sqlalchemy>=2.0.25', true],
      ['psycopg2-binary>=2.9.9', true],
      ['groq>=0.11.0', true],
      ['yt-dlp>=2024.3.10', true]
    ]
  },
  {
    id: 'pkg',
    name: 'frontend/package.json',
    lines: [
      ['"react": "^19.2.8",', true],
      ['"radix-ui": "^1.6.7",'],
      ['"tailwindcss": "^4.3.3",', true],
      ['"vite": "^8.2.0"']
    ]
  },
  {
    id: 'git',
    name: 'git log --author',
    lines: [['209 commits by imsayanpaul', true]]
  }
];

// Bullets as [text, sourceFileId?] pieces
const BULLETS = [
  [['Built Reeldex, a searchable second brain for Instagram Reels that '], ['transcribes each DMed reel', 'readme'], [' with '], ['Whisper on Groq', 'req'], [' and sorts it by topic.']],
  [['Designed a '], ['FastAPI', 'req'], [' backend that pulls audio with '], ['yt-dlp', 'req'], [' and stores '], ['timed transcripts', 'readme'], [' in '], ['PostgreSQL', 'req'], [' through '], ['SQLAlchemy', 'req'], ['.']],
  [['Added '], ['"Ask Dex"', 'readme'], [', a chat across saved reels, plus '], ['.srt subtitle export', 'readme'], [', in a '], ['React', 'pkg'], [' and '], ['Tailwind CSS', 'pkg'], [' frontend, over '], ['209 commits', 'git'], ['.']]
];

const READ_MS = 700;
const SHOW_MS = 2200;

function Blocks() {
  return <span className="blocks" aria-hidden="true"><i /><i /><i /><i /></span>;
}

export default function RepoTrace() {
  const [active, setActive] = useState(0);
  const [reading, setReading] = useState(true);
  const [paused, setPaused] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Cycle: read a file (blocky loader), then light up what it fed, then move on
  useEffect(() => {
    if (paused || reduced) { setReading(false); return; }
    setReading(true);
    const t1 = setTimeout(() => setReading(false), READ_MS);
    const t2 = setTimeout(() => setActive(a => (a + 1) % FILES.length), READ_MS + SHOW_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, paused, reduced]);

  const lit = !reading;
  const activeId = FILES[active].id;

  return (
    <div className="trace" onMouseLeave={() => setPaused(false)}>
      <div className="trace-files">
        {FILES.map((file, i) => {
          const isActive = i === active;
          return (
            <div
              key={file.id}
              className={`file ${isActive ? 'is-active' : ''}`}
              onMouseEnter={() => { setPaused(true); setActive(i); }}
            >
              <div className="file-bar">
                <span>{file.name}</span>
                <span className="file-state">{isActive && reading ? <Blocks /> : isActive ? 'read' : ''}</span>
              </div>
              <div className="file-body">
                {file.lines.map(([text, used], l) => (
                  <span key={l} className={`file-line ${isActive && lit && used ? 'is-lit' : ''}`}>{text}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <article className="page resume trace-page" aria-label="Résumé entry built from these files">
        <div className="resume-section">Projects</div>
        <div className="resume-head">
          <span className="resume-title">Reeldex</span>
          <span className="resume-links"><a href="https://github.com/imsayanpaul/Reeldex" target="_blank" rel="noreferrer">GitHub</a></span>
          <span className="resume-stack">Python, FastAPI, React, PostgreSQL</span>
        </div>
        <ul>
          {BULLETS.map((parts, b) => (
            <li key={b}>
              {parts.map(([text, src], p) => (
                src
                  ? <span key={p} className={`tok ${src === activeId && lit ? 'is-lit' : ''}`}>{text}</span>
                  : <React.Fragment key={p}>{text}</React.Fragment>
              ))}
            </li>
          ))}
        </ul>
        <p className="trace-caption">
          {lit ? <>from <strong>{FILES[active].name}</strong></> : <>reading {FILES[active].name} <Blocks /></>}
        </p>
      </article>
    </div>
  );
}
