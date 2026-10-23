/**
 * Resume Bullet Generator Service
 * Supports Google XYZ Formula ("Accomplished X using Y resulting in Z"), STAR method,
 * and more. Template bullets come back instantly from repo evidence; AI bullets
 * (a visitor's own Gemini key, or the deployment's Groq/Gemini via /api/generate)
 * replace them when ready.
 */
import { generateWithAI, evidenceLevel, MIN_STARS_TO_CITE, MIN_COMMITS_TO_CITE } from './aiCore.js';

/**
 * Instant, offline bullets built only from repo evidence (README features,
 * detected stack, infrastructure files, real commit count).
 */
export function generateTemplateBullets(repo, tone = 'xyz', jdKeywords = []) {
  return { bullets: generateHeuristicBullets(repo, tone, jdKeywords), source: 'heuristic', provider: null, model: null, unverified: [], techStack: repo.detected_deps || [], evidence: evidenceLevel(toAiInput(repo)) };
}

/**
 * AI bullets. Tries a visitor's own Gemini key first (direct from the browser),
 * then the deployment's providers. Returns null when no AI is available.
 * @param {Object} options - { serverAi: true when /api/generate has a provider configured }
 * @returns {Promise<{bullets, source: 'ai', provider, model, unverified, techStack} | null>}
 * @throws when every configured AI path fails
 */
export async function generateAiBullets(repo, tone = 'xyz', apiKey = '', jdKeywords = [], customInstruction = '', { serverAi = false } = {}) {
  const userKey = (apiKey || '').trim();
  if (!userKey && !serverAi) return null;

  const input = toAiInput(repo);
  let userKeyError = null;
  let result = null;
  if (userKey) {
    try {
      result = await generateWithAI(input, { tone, jdKeywords, customInstruction, keys: { gemini: userKey }, order: ['gemini'] });
    } catch (err) {
      userKeyError = err;
    }
  }
  if (!result && serverAi) {
    result = await generateViaServer(input, { tone, jdKeywords, customInstruction });
  }
  if (!result) throw userKeyError || new Error('AI generation failed.');

  // Kept separate from detected_deps, so one AI answer never becomes
  // "evidence" for the next one
  if (result.techStack?.length > 0) repo.ai_stack = result.techStack;
  return { ...result, source: 'ai', unverified: result.unverified || [] };
}

/**
 * Template first, then AI if available: the single-call form used by the eval script.
 */
export async function generateRepoBullets(repo, tone = 'xyz', apiKey = '', jdKeywords = [], customInstruction = '', options = {}) {
  try {
    const ai = await generateAiBullets(repo, tone, apiKey, jdKeywords, customInstruction, options);
    if (ai) return { ...ai, aiError: null };
  } catch (err) {
    return { ...generateTemplateBullets(repo, tone, jdKeywords), aiError: err.message };
  }
  return { ...generateTemplateBullets(repo, tone, jdKeywords), aiError: null };
}

// Only the fields the prompt needs, so the server request stays small
export function toAiInput(repo) {
  return {
    name: repo.name,
    description: repo.description === 'No description provided.' ? '' : repo.description,
    language: repo.language === 'Codebase' ? '' : repo.language,
    detected_deps: repo.detected_deps || [],
    // Stack the repo itself proves (language, topics, manifests); always kept
    confirmed_deps: [...new Set([...(repo.strong_deps || []), ...(repo.manifest_deps || [])])],
    topics: repo.topics || [],
    stargazers_count: repo.stargazers_count || 0,
    forks_count: repo.forks_count || 0,
    commits_count: repo.commits_count ?? null,
    readmeText: (repo.readmeText || '').slice(0, 2000),
    commit_subjects: repo.commit_subjects || [],
    top_level_files: repo.top_level_files || []
  };
}

async function generateViaServer(input, { tone, jdKeywords, customInstruction }) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: input, tone, jdKeywords, customInstruction })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `AI service error (${res.status}).`);
  return data;
}

/**
 * Smart Heuristic Bullet Generator following Google's XYZ formula & ATS guidelines
 * This is the offline fallback when no API key is available.
 */
function generateHeuristicBullets(repo, tone, jdKeywords = []) {
  const name = formatRepoName(repo.name);
  const lang = repo.language && repo.language !== 'Codebase' ? repo.language : 'modern tooling';
  // Four names keep the lead bullet within about 30 words; the full stack shows in the title line
  const techStack = repo.detected_deps.length > 0 ? repo.detected_deps.slice(0, 4).join(', ') : lang;
  const arch = getArchitectureDetail(repo, lang);
  const starsText = repo.stargazers_count >= MIN_STARS_TO_CITE ? `, earning ${repo.stargazers_count} GitHub stars` : '';
  const desc = (repo.description || '').toLowerCase();
  
  // Extract what the project actually does from description
  const projectPurpose = extractProjectPurpose(repo);
  const featureHighlights = extractFeatureHighlights(repo);
  
  // Pick varied action verbs per project (deterministic based on repo name)
  const verbs = pickVerbSet(repo.name);
  
  // Highlight JD keywords if matching
  const matchingJd = jdKeywords.filter(k => 
    repo.detected_deps.some(d => d.toLowerCase().includes(k.toLowerCase())) ||
    repo.topics.some(t => t.toLowerCase().includes(k.toLowerCase())) ||
    desc.includes(k.toLowerCase())
  );
  const jdHighlight = matchingJd.length > 0 ? `, with emphasis on ${matchingJd.slice(0, 3).join(', ')}` : '';

  // Every clause below is built from evidence (description, detected stack, real
  // commit count, stars); nothing claims latency, scale or quality we can't see
  // README feature lists are the most specific true content we have
  const readmeFeatures = repo.readme_features || [];
  // Fit features into about 12 words so the lead bullet stays near 30;
  // the ones that don't fit go to the second bullet
  const leadFeatures = [];
  let featureWords = 0;
  for (const f of readmeFeatures) {
    const n = f.split(/\s+/).length;
    if (leadFeatures.length >= 3 || (leadFeatures.length >= 2 && featureWords + n > 12)) break;
    if (n > 7) continue;
    leadFeatures.push(f);
    featureWords += n;
  }
  const featureClause = leadFeatures.length >= 2
    ? `, featuring ${joinList(leadFeatures)}`
    : (featureHighlights ? ` that ${featureHighlights}` : '');
  const extraFeatures = readmeFeatures.filter(f => !leadFeatures.includes(f) && f.split(/\s+/).length <= 7).slice(0, 2);
  const baseImpl = getImplementationDetail(repo);
  const impl = baseImpl || (extraFeatures.length > 0 ? `delivering ${joinList(extraFeatures)}` : '');
  // Cite at most one repo statistic: stars in the lead bullet, or commits in the last
  const closing = getClosingBullet(repo, verbs, { citeCommits: !starsText });

  if (tone === 'xyz') {
    return [
      `${verbs.lead} ${name}, ${projectPurpose}${featureClause}, built with ${techStack}${jdHighlight}${starsText}.`,
      `${verbs.mid} ${arch}${impl ? `, ${impl}` : ''}.`,
      closing
    ];
  }

  if (tone === 'star') {
    return [
      `Identified a need for ${getProjectNeed(repo)}; ${verbs.lead.toLowerCase()} ${name} using ${techStack} — ${projectPurpose}${featureClause}${starsText}.`,
      `${verbs.mid} ${arch}${impl ? `, ${impl}` : ''}.`,
      closing
    ];
  }

  if (tone === 'technical') {
    return [
      `${verbs.lead} ${name}${jdHighlight} — ${projectPurpose}${featureClause} — using ${techStack}.`,
      `${getTechnicalLayers(repo, lang)}.`,
      closing
    ];
  }

  // Default ATS Minimalist
  return [
    `${verbs.lead} ${name} using ${techStack} — ${projectPurpose}${featureClause}${starsText}.`,
    `${verbs.mid} ${arch}${impl ? `, ${impl}` : ''}.`,
    closing
  ];
}

/**
 * Pick varied action verb sets per project using a deterministic hash
 * so each project gets different starters while staying stable across regenerations.
 */
function pickVerbSet(repoName) {
  // Verb sets: [lead bullet, mid bullet, tail bullet]
  const verbSets = [
    { lead: 'Architected and deployed', mid: 'Engineered', tail: 'Implemented' },
    { lead: 'Designed and built', mid: 'Developed', tail: 'Integrated' },
    { lead: 'Built and shipped', mid: 'Optimized', tail: 'Established' },
    { lead: 'Developed', mid: 'Constructed', tail: 'Deployed' },
    { lead: 'Created and launched', mid: 'Streamlined', tail: 'Configured' },
    { lead: 'Developed and delivered', mid: 'Programmed', tail: 'Orchestrated' },
    { lead: 'Built and released', mid: 'Crafted', tail: 'Instituted' },
  ];
  
  // Simple deterministic hash from repo name
  let hash = 0;
  for (let i = 0; i < repoName.length; i++) {
    hash = ((hash << 5) - hash) + repoName.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return verbSets[Math.abs(hash) % verbSets.length];
}

/**
 * Extract a meaningful project purpose from repo metadata.
 * Strips repo name prefix and converts to resume-worthy phrasing.
 */
function extractProjectPurpose(repo) {
  const desc = (repo.description || '').trim();
  if (!desc || desc === 'No description provided.') {
    // Generate from name and topics
    const topics = (repo.topics || []).slice(0, 3).map(t => t.replace(/-/g, ' ')).join(', ');
    if (topics) {
      return `a ${projectLanguage(repo)} project focused on ${topics}`;
    }
    return `a ${projectLanguage(repo)} project`;
  }
  
  // Clean the description
  let cleaned = desc
    .replace(/:[a-z0-9_+-]+:/gi, '')  // Remove GitHub emoji shortcodes
    .replace(/\s*\([^)]*\)/g, '')      // Remove asides like "(Deprecated: use X instead.)"
    .replace(/[!]{2,}/g, '')           // Remove excessive exclamation marks
    .trim();
  
  // Strip repo name prefix patterns like "Appliqa: ...", "Appliqa - ...", "Appliqa — ..."
  const repoName = repo.name.toLowerCase().replace(/[-_]/g, '');
  const prefixPatterns = [
    // "Typer: ...", "Typer - ...", "Typer, build great CLIs"
    new RegExp(`^${repo.name}\\s*[:–—,-]\\s*`, 'i'),
    new RegExp(`^${repoName}\\s*[:–—,-]\\s*`, 'i'),
    new RegExp(`^${formatRepoName(repo.name)}\\s*[:–—,-]\\s*`, 'i'),
  ];
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove leading articles and filler adverbs ("Instantly convert..." -> "convert...")
  cleaned = cleaned
    .replace(/^\s*(a|an|the)\s+/i, '')
    .replace(/^\s*(instantly|easily|quickly|simply|automatically|effortlessly|seamlessly)\s+/i, '')
    .trim();

  // A description that just repeats the repo name ("Ai Interview System") says nothing
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalize(cleaned.replace(/\.\s*$/, '')) === normalize(repo.name)) {
    cleaned = '';
  }
  
  // Remove trailing period
  cleaned = cleaned.replace(/\.\s*$/, '');
  
  if (!cleaned) {
    return `a ${projectLanguage(repo)} project`;
  }
  
  // Take the first sentence as the core purpose; the rest is usually detail
  let purpose = cleaned;
  const firstSentence = purpose.split(/[.!?;](?:\s|$)/)[0].trim();
  if (firstSentence.split(/\s+/).length >= 3 || purpose.length > 100) {
    purpose = firstSentence || purpose;
  }

  purpose = shortenPurpose(purpose);

  // Lowercase first letter for embedding in sentence, but keep acronyms like "AI" or "CLI"
  if (!/^[A-Z]{2,}/.test(purpose)) {
    purpose = purpose.charAt(0).toLowerCase() + purpose.slice(1);
  }

  // Descriptions written as instructions ("Copy a list once...", "Tweak React components...")
  // read as "a tool to <verb>...", not "a copy a list once..."
  const firstWord = purpose.split(/[\s,]/)[0].toLowerCase();
  // Projects named after their verb describe themselves that way too ("Slugify a string")
  if (IMPERATIVE_VERBS.has(firstWord) || firstWord === normalize(repo.name)) {
    return `a tool to ${purpose}`;
  }

  // Add appropriate article
  const article = /^[aeiou]/i.test(purpose) || /^[AEFHILMNORSX][A-Z]/.test(purpose) ? 'an' : 'a';

  return `${article} ${purpose}`;
}

/**
 * Keep a description's core clause so the lead bullet stays near 30 words:
 * "a Chrome extension to anchor your exact reading position on any webpage
 * including dynamic panels like ChatGPT..." -> "a Chrome extension to anchor exact
 * reading position on any webpage". Also drops second person ("your"), which
 * doesn't belong on a resume.
 */
function shortenPurpose(purpose) {
  let p = purpose.replace(/\byour\s+/gi, '').replace(/\byou\s+/gi, 'users ');
  const cut = p.match(/^(.+?)\s(?:featuring|features|including|such as|like|ready to|so (?:that|you)|and (?:then )?return|which|that lets|letting|with support for)\b/i);
  if (cut && cut[1].split(/\s+/).length >= 3) p = cut[1].replace(/[,;:\s]+$/, '');
  const words = p.split(/\s+/);
  if (words.length > 16) {
    p = words.slice(0, 16).join(' ');
    // Don't end on a dangling connector or comma
    p = p.replace(/[,;]?\s+(and|or|to|of|for|with|in|on|the|a|an|by|from)$/i, '').replace(/[,;]$/, '');
  }
  return p.trim();
}

const IMPERATIVE_VERBS = new Set([
  'copy', 'paste', 'turn', 'convert', 'build', 'create', 'generate', 'make', 'track', 'manage', 'find',
  'search', 'get', 'tweak', 'use', 'run', 'transform', 'automate', 'scan', 'share', 'send', 'save',
  'download', 'upload', 'learn', 'write', 'read', 'deploy', 'monitor', 'organize', 'visualize', 'explore',
  'compare', 'analyze', 'analyse', 'summarize', 'summarise', 'extract', 'detect', 'play', 'chat', 'browse',
  'store', 'sync', 'schedule', 'plan', 'help', 'keep', 'add', 'export', 'import', 'render', 'test', 'check'
]);

/**
 * Extract specific feature highlights from the description.
 * Only returns content when there's a CLEAR enumerated feature list to avoid
 * duplicating the project purpose text.
 * Returns a string like "scans resumes, auto-generates cover letters, and tracks applications"
 */
function extractFeatureHighlights(repo) {
  const desc = (repo.description || '').trim();
  if (!desc || desc.length < 60) return '';
  
  const descLower = desc.toLowerCase();
  
  // Only match explicit feature list patterns like "Features X, Y, and Z"
  const featureListMatch = descLower.match(/(?:features?|supports?|includes?|provides?|offers?|enables?)\s+(.+)/i);
  if (featureListMatch) {
    const featureText = featureListMatch[1]
      .replace(/\.\s*$/, '')
      .replace(/,\s*and\s+/g, ', ')
      .split(/,\s*/)
      .filter(f => f.trim().length > 3 && f.trim().length < 60)
      .slice(0, 4);
    
    if (featureText.length >= 2) {
      const last = featureText.pop();
      return `${featureText.join(', ')}, and ${last}`;
    }
  }
  
  // No clear feature list found — return empty to avoid duplicating the purpose
  return '';
}

function joinList(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

// "Codebase" is the placeholder for repos GitHub couldn't classify
function projectLanguage(repo) {
  return repo.language && repo.language !== 'Codebase' ? repo.language : 'software';
}

function withArticle(word) {
  return `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;
}

function findDep(repo, ...keys) {
  return (repo.detected_deps || []).find(d => keys.some(k => d.toLowerCase().includes(k)));
}

const FRONTEND_KEYS = ['react', 'vue', 'angular', 'svelte', 'next.js'];
const BACKEND_KEYS = ['fastapi', 'express', 'flask', 'django', 'nestjs', 'spring', 'fastify', 'koa', 'gin', 'actix', 'axum'];
const DATABASE_KEYS = ['postgres', 'mongo', 'mysql', 'sqlite', 'supabase', 'firebase', 'dynamodb', 'redis'];
const ORM_KEYS = ['prisma', 'sqlalchemy', 'mongoose', 'sequelize', 'typeorm', 'drizzle'];
const AI_KEYS = ['gemini', 'openai', 'claude api', 'langchain', 'hugging face', 'pytorch', 'tensorflow', 'scikit'];
const REALTIME_KEYS = ['websocket', 'socket.io', 'grpc'];

/**
 * Architecture phrase naming the technology that justifies it,
 * so a React frontend isn't described as being built "using Python"
 */
function getArchitectureDetail(repo, lang) {
  const frontend = findDep(repo, ...FRONTEND_KEYS);
  const backend = findDep(repo, ...BACKEND_KEYS);
  if (frontend && backend) return `${withArticle(frontend)} frontend backed by ${withArticle(backend)} ${/api$/i.test(backend) ? 'backend' : 'API'}`;
  if (frontend) return `a component-based ${frontend} interface`;
  if (backend) return `${withArticle(backend)} backend for the app's core endpoints`;
  const containers = findDep(repo, 'docker', 'kubernetes');
  if (containers) return `containerized services packaged with ${containers}`;
  if (/^(html|css|scss)$/i.test(lang)) return 'the page structure and styling with HTML and CSS';
  const libraries = (repo.detected_deps || []).filter(d => d !== lang && !LANGUAGE_NAMES.has(d));
  const base = lang !== 'modern tooling' ? `the core application logic in ${lang}` : 'the core application logic';
  return libraries.length > 0 ? `${base} with ${libraries.slice(0, 3).join(', ')}` : base;
}

const LANGUAGE_NAMES = new Set(['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'HTML', 'CSS', 'C', 'C++', 'C#', 'Ruby', 'PHP', 'Kotlin', 'Swift', 'Shell']);

/**
 * What the stack shows the project does under the hood, e.g.
 * "persisting data in PostgreSQL through SQLAlchemy and integrating the Gemini API"
 */
function getImplementationDetail(repo) {
  const parts = [];
  const db = findDep(repo, ...DATABASE_KEYS);
  const orm = findDep(repo, ...ORM_KEYS);
  if (db) parts.push(`persisting data in ${db}${orm ? ` through ${orm}` : ''}`);
  const ai = findDep(repo, ...AI_KEYS);
  if (ai) parts.push(`integrating ${/api$/i.test(ai) ? `the ${ai}` : ai} for its AI features`);
  const realtime = findDep(repo, ...REALTIME_KEYS);
  if (realtime) parts.push(`pushing live updates over ${realtime}`);
  if (parts.length === 0) return '';
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * Technical-depth bullet: the system's layers as the dependencies show them
 */
function getTechnicalLayers(repo, lang) {
  const layers = [];
  const frontend = findDep(repo, ...FRONTEND_KEYS);
  const backend = findDep(repo, ...BACKEND_KEYS);
  const db = findDep(repo, ...DATABASE_KEYS);
  const orm = findDep(repo, ...ORM_KEYS);
  const ai = findDep(repo, ...AI_KEYS);
  const realtime = findDep(repo, ...REALTIME_KEYS);
  if (frontend) layers.push(`${withArticle(frontend)} client`);
  if (backend) layers.push(`${withArticle(backend)} ${/api$/i.test(backend) ? 'service' : 'API'} layer`);
  if (db) layers.push(`${db} persistence${orm ? ` via ${orm}` : ''}`);
  if (realtime) layers.push(`${realtime} messaging`);
  if (ai) layers.push(`${ai} integration`);
  if (layers.length >= 2) {
    return `Structured the system into ${layers.slice(0, -1).join(', ')}${layers.length > 2 ? ',' : ''} and ${layers[layers.length - 1]}`;
  }
  if (layers.length === 1) return `Built ${layers[0]}${lang !== 'modern tooling' ? ` in ${lang}` : ''}, keeping responsibilities in separate modules`;
  return `Organized the ${lang !== 'modern tooling' ? `${lang} ` : ''}codebase into focused modules with clear responsibilities`;
}

// Only names infrastructure the repo actually shows evidence of, so a static
// site isn't credited with "CI/CD pipelines and automated test coverage"
function getInfraDetail(repo) {
  const parts = [];
  if (findDep(repo, 'docker')) parts.push('Docker containerization');
  if (findDep(repo, 'kubernetes')) parts.push('Kubernetes orchestration');
  if (findDep(repo, 'github actions')) parts.push('GitHub Actions CI/CD pipelines');
  const testTool = findDep(repo, 'jest', 'vitest', 'pytest', 'cypress', 'playwright');
  if (testTool) parts.push(`automated ${testTool} test suites`);
  const baas = findDep(repo, 'supabase', 'firebase');
  if (baas) parts.push(`${withArticle(baas)}-backed cloud data layer`);
  const cloud = findDep(repo, 'aws', 'gcp', 'azure', 'vercel');
  if (cloud) parts.push(`${cloud} cloud deployment`);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/**
 * Third bullet: real infrastructure and the real commit count, or a modest
 * statement about structure when the repo shows neither
 */
function getClosingBullet(repo, verbs, { citeCommits = true } = {}) {
  const infra = getInfraDetail(repo);
  const commits = citeCommits && typeof repo.commits_count === 'number' && repo.commits_count >= MIN_COMMITS_TO_CITE ? repo.commits_count : null;
  if (infra) {
    return `${verbs.tail} ${infra}${commits ? `, shipping the project across ${commits} commits` : ''}.`;
  }
  if (commits) {
    return `Developed the project iteratively across ${commits} commits, keeping features in modular, maintainable components.`;
  }
  return 'Organized the codebase into modular, maintainable components.';
}

function getProjectNeed(repo) {
  const desc = (repo.description || '').toLowerCase();
  if (desc.includes('resume') || desc.includes('career') || desc.includes('job')) return 'streamlined career tools and job application workflows';
  if (/\bai\b|\bml\b|machine learning/.test(desc)) return 'intelligent automation and AI-driven decision support';
  if (desc.includes('chat') || desc.includes('message') || desc.includes('real-time')) return 'real-time communication and collaborative user experiences';
  if (desc.includes('e-commerce') || desc.includes('shop') || /\bstore\b/.test(desc)) return 'modern e-commerce and digital transaction workflows';
  if (desc.includes('paste') || desc.includes('clipboard') || desc.includes('copy')) return 'efficient clipboard management and text processing tools';
  if (desc.includes('interview') || desc.includes('quiz') || desc.includes('assessment')) return 'structured skill assessment and interview preparation workflows';
  return 'a focused tool for this workflow';
}

/**
 * Format raw repo names like 'nexus-quant-trader' -> 'Nexus Quant Trader'
 */
function formatRepoName(raw) {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

