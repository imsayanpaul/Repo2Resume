/**
 * Deterministic README parsing: pulls the feature list and stated tech stack
 * out of a project's README so the template engine can say specific, true
 * things without an AI call.
 */

const FEATURE_HEADING = /^(key\s+)?(features?|highlights|capabilities|functionality|core features|what (it|this) does)\b/i;
const BOILERPLATE_HEADING = /\b(install|installation|usage|setup|getting started|quick ?start|requirements|prerequisites|license|contribut|run(ning)?|build(ing)?|test(ing)?|faq|api|options|cli|config(uration)?|deploy|development|changelog|credits|acknowledg|support|related|roadmap|todo|environment|project structure|table of contents|contents)\b/i;
const STACK_HEADING = /^(tech(nology)?\s*stack|built\s+with|stack|technologies(\s+used)?|tools(\s+used)?|made\s+with)\b/i;

// Strip markdown so "- **Fast search** — find any reel" becomes plain text
function plain(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')              // images / badges
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')           // links -> text
    .replace(/<[^>]+>/g, '')                           // inline HTML
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/:[a-z0-9_+-]+:/gi, '')                   // :sparkles:
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '') // emoji
    .replace(/^\s*\d+[.)]\s+/, '')                     // "1. Feature" -> "Feature"
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split into headings (with level) and body lines, ignoring fenced code,
 * where "# install deps" is a shell comment, not a heading.
 */
function parseLines(readme) {
  const out = [];
  let inFence = false;
  for (const line of readme.replace(/\r/g, '').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const md = line.match(/^(#{1,6})\s+(.*)$/);
    const bold = line.match(/^\*\*([^*]+)\*\*:?\s*$/);   // "**Features**" used as a heading
    if (md) out.push({ heading: plain(md[2]), level: md[1].length });
    else if (bold) out.push({ heading: plain(bold[1]), level: 7 });
    else out.push({ text: line });
  }
  return out;
}

function sectionEnd(lines, start) {
  const level = lines[start].level;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].heading !== undefined && lines[i].level <= level) return i;
  }
  return lines.length;
}

function listItemsIn(lines, from, to) {
  const items = [];
  for (let i = from; i < to; i++) {
    const m = lines[i].text?.match(/^\s{0,3}(?:[-*+]|\d+[.)])\s+(.+)$/);
    if (m) items.push(m[1]);
  }
  return items;
}

const STOP_START = /^(the|a|an|and|or|it|you|your|this|that|these|with|for|to|of)\b/i;

/**
 * Turn a heading or list item into a short noun phrase for a bullet, or null
 * when it won't read well there:
 * "**Dynamic Container Support**: Works on sites…" -> "dynamic container support"
 * "Hands-Free Auto-Scroll" -> "hands-free auto-scroll"
 */
function featurePhrase(raw, properNouns) {
  const labelled = raw.match(/^\s*(?:\*\*|__)([^*_]{3,60})(?:\*\*|__)\s*[:\-–—]?\s*(.*)$/);
  let phrase = labelled ? labelled[1] : raw;
  phrase = plain(phrase).split(/\s[–—-]\s|:\s/)[0].replace(/[.;:,!]+$/, '').trim();
  if (/\b(phones?|mobile)\b/i.test(phrase)) return 'a mobile-friendly interface';
  const words = phrase.split(/\s+/);
  // Commas mid-phrase ("Instagram, no password") read badly inside a bullet
  if (words.length < 2 || words.length > 8 || phrase.includes(',') || STOP_START.test(phrase)) return null;
  // Lowercase Title Case words unless the README capitalizes them mid-sentence,
  // so "Dynamic Container Support" -> "dynamic container support" while names
  // like "Instagram", "Dex" and "Google" stay capitalized
  return words
    .map(w => w.split('-').map(part => (/^[A-Z][a-z]+$/.test(part) && !properNouns.has(part) ? part.toLowerCase() : part)).join('-'))
    .join(' ');
}

function featuresFromSection(lines, start, properNouns) {
  const end = sectionEnd(lines, start);
  // Sub-headings ("### Resume builder") are the features when a section uses them
  const subs = lines.slice(start + 1, end).filter(l => l.heading !== undefined);
  if (subs.length >= 2) {
    const subLevel = Math.min(...subs.map(s => s.level));
    return subs.filter(s => s.level === subLevel).map(s => featurePhrase(s.heading, properNouns));
  }
  return listItemsIn(lines, start + 1, end).map(item => featurePhrase(item, properNouns));
}

function bestHeading(lines, pattern) {
  let best = -1;
  lines.forEach((l, i) => {
    if (l.heading !== undefined && pattern.test(l.heading) && (best === -1 || l.level < lines[best].level)) best = i;
  });
  return best;
}

/**
 * Feature phrases from commit subjects, for repos without a usable README:
 * "feat(docx): add resume upload and project injection" -> "resume upload and project injection"
 * Only feature-shaped commits count; fixes, refactors and chores don't.
 */
export function featuresFromCommits(subjects = []) {
  const phrases = [];
  for (const subject of subjects) {
    const conventional = subject.match(/^feat(?:\([^)]*\))?!?:\s*(.+)$/i);
    const verbLed = subject.match(/^(?:add(?:ed|s)?|implement(?:ed|s)?|support(?:ed|s)?|introduce(?:d|s)?|build|built|create(?:d|s)?)\s+(.+)$/i);
    let text = conventional ? conventional[1] : verbLed ? verbLed[1] : null;
    if (!text) continue;
    text = text
      .replace(/^(add(?:ed|s)?|implement(?:ed|s)?|support(?:ed|s)?|introduce(?:d|s)?|create(?:d|s)?)\s+/i, '')
      .replace(/\s+[-–—]\s+.*$/, '')          // drop "- long explanation"
      .replace(/\s*\(#\d+\)$/, '')            // PR numbers
      .replace(/[.;:,]+$/, '')
      .trim();
    const words = text.split(/\s+/);
    if (words.length < 2 || words.length > 8 || /^(the|a|an|some|more|new)\s*$/i.test(words[0])) continue;
    // Rework of existing code isn't a feature a recruiter can picture
    if (/\b(overhaul|refactor|cleanup|clean up|rework|improve(ment)?s?|tweak|polish|tests?)\b/i.test(text)) continue;
    if (!/^[A-Z]{2,}/.test(text)) text = text[0].toLowerCase() + text.slice(1);
    phrases.push(text);
  }
  return [...new Set(phrases)].slice(0, 6);
}

/**
 * @returns {{ features: string[], stack: string[] }}
 */
export function extractReadmeFacts(readme) {
  if (!readme || typeof readme !== 'string') return { features: [], stack: [] };
  const lines = parseLines(readme);
  // Capitalized words that follow an all-lowercase word in prose are names
  // ("send it on Instagram"); list items and tables are skipped because their
  // Title Case labels would count every word as a name
  const prose = lines
    .map(l => l.text || '')
    .filter(t => !/^\s*([-*+|>]|\d+[.)])/.test(t))
    .join(' ')
    .replace(/https?:\/\/\S+/g, ' ');
  const properNouns = new Set([...prose.matchAll(/\b[a-z]+,?\s+([A-Z][a-z]+)\b/g)].map(m => m[1]));
  // Also a name: written capitalized 3+ times and never in lowercase ("Ask Dex", "Google XYZ")
  const counts = {};
  // URLs, inline code and HTML attributes ("reeldex.io", "/dex") aren't prose casing
  const countable = lines.map(l => l.heading ?? l.text).join(' ')
    .replace(/https?:\/\/\S+|`[^`]*`|<[^>]+>|\([^)]*[/.][^)]*\)/g, ' ');
  for (const w of countable.match(/(?<![\w./-])[A-Za-z][a-z]+(?![\w./-])/g) || []) {
    const key = w.toLowerCase();
    counts[key] = counts[key] || { upper: 0, lower: 0 };
    counts[key][w[0] === w[0].toUpperCase() ? 'upper' : 'lower']++;
  }
  for (const [key, c] of Object.entries(counts)) {
    if (c.upper >= 3 && c.lower === 0) properNouns.add(key[0].toUpperCase() + key.slice(1));
  }

  let features = [];
  const featureIdx = bestHeading(lines, FEATURE_HEADING);
  if (featureIdx !== -1) features = featuresFromSection(lines, featureIdx, properNouns).filter(Boolean);

  // No Features section: take the first list outside setup/usage boilerplate
  // that yields at least 3 usable phrases
  if (features.length < 2) {
    let currentHeading = '';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].heading !== undefined) { currentHeading = lines[i].heading; continue; }
      if (BOILERPLATE_HEADING.test(currentHeading) || !/^\s{0,3}(?:[-*+]|\d+[.)])\s+/.test(lines[i].text || '')) continue;
      let end = i;
      while (end < lines.length && lines[end].heading === undefined) end++;
      const candidate = listItemsIn(lines, i, end).map(item => featurePhrase(item, properNouns)).filter(Boolean);
      if (candidate.length >= 3) { features = candidate; break; }
      i = end - 1;
    }
  }

  let stack = [];
  const stackIdx = bestHeading(lines, STACK_HEADING);
  if (stackIdx !== -1) {
    stack = listItemsIn(lines, stackIdx + 1, sectionEnd(lines, stackIdx))
      .map(item => plain(item).split(/[:\-–—(]/)[0].trim())
      .filter(t => t.length > 1 && t.length < 40);
  }

  return { features: [...new Set(features)].slice(0, 6), stack: [...new Set(stack)].slice(0, 12) };
}
