/**
 * GitHub API Service
 * Handles fetching repositories, language metrics, dependencies, and demo mock profiles.
 */
import { extractReadmeFacts } from './readmeFacts.js';

/**
 * Sanitize and extract clean username from raw input (URLs, @handles, etc.)
 */
export function extractCleanUsername(input) {
  if (!input) return '';
  let str = input.trim();
  if (str.startsWith('@')) {
    str = str.substring(1);
  }
  if (str.includes('github.com/')) {
    const parts = str.split('github.com/')[1].split('/')[0].split('?')[0].split('#')[0];
    return parts.trim();
  }
  return str.split('/')[0].split('?')[0].split('#')[0].trim();
}

// Demo Mock Profiles for instant offline exploration
export const DEMO_PROFILES = {
  octocat: {
    username: 'alexdev-pro',
    name: 'Alex Rivera',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    bio: 'Full-Stack & Systems Engineer | Open Source Contributor',
    public_repos: 14,
    repos: [
      {
        id: 101,
        name: 'nexus-quant-trader',
        full_name: 'alexdev-pro/nexus-quant-trader',
        description: 'High-frequency algorithmic trading platform with real-time backtesting engine, WebSocket streaming, and risk management analytics.',
        html_url: 'https://github.com/alexdev-pro/nexus-quant-trader',
        language: 'TypeScript',
        stargazers_count: 342,
        forks_count: 58,
        topics: ['algorithmic-trading', 'websockets', 'react', 'nodejs', 'redis', 'timescale-db'],
        updated_at: '2026-07-20T14:20:00Z',
        languages_breakdown: { TypeScript: 65, Rust: 20, Python: 10, Dockerfile: 5 },
        detected_deps: ['React', 'Node.js', 'Redis', 'TimescaleDB', 'TypeScript', 'Docker', 'WebSockets', 'RxJS'],
        commits_count: 184
      },
      {
        id: 102,
        name: 'neural-doc-search',
        full_name: 'alexdev-pro/neural-doc-search',
        description: 'Semantic vector search engine and RAG pipeline for querying enterprise documentation using embeddings and hybrid BM25 scoring.',
        html_url: 'https://github.com/alexdev-pro/neural-doc-search',
        language: 'Python',
        stargazers_count: 215,
        forks_count: 29,
        topics: ['rag', 'llm', 'vector-database', 'fastapi', 'python', 'langchain', 'pinecone'],
        updated_at: '2026-07-15T09:12:00Z',
        languages_breakdown: { Python: 82, TypeScript: 12, HTML: 6 },
        detected_deps: ['Python', 'FastAPI', 'LangChain', 'Pinecone', 'OpenAI API', 'PyTest', 'Docker'],
        commits_count: 92
      },
      {
        id: 103,
        name: 'gitresume-generator',
        full_name: 'alexdev-pro/gitresume-generator',
        description: 'AI-driven GitHub repository scanner that transforms commits and dependencies into Google XYZ formula ATS resume bullets.',
        html_url: 'https://github.com/alexdev-pro/gitresume-generator',
        language: 'JavaScript',
        stargazers_count: 189,
        forks_count: 24,
        topics: ['resume-builder', 'ats-optimization', 'react', 'vite', 'gemini-api', 'github-api'],
        updated_at: '2026-07-28T11:45:00Z',
        languages_breakdown: { JavaScript: 70, CSS: 20, HTML: 10 },
        detected_deps: ['React', 'Vite', 'Gemini API', 'Lucide React', 'GitHub REST API'],
        commits_count: 65
      },
      {
        id: 104,
        name: 'distributed-kv-store',
        full_name: 'alexdev-pro/distributed-kv-store',
        description: 'Distributed key-value database implementing Raft consensus protocol with WAL persistence and gRPC node synchronization.',
        html_url: 'https://github.com/alexdev-pro/distributed-kv-store',
        language: 'Go',
        stargazers_count: 410,
        forks_count: 72,
        topics: ['distributed-systems', 'raft-consensus', 'grpc', 'golang', 'database-engine'],
        updated_at: '2026-06-30T18:00:00Z',
        languages_breakdown: { Go: 94, Protobuf: 6 },
        detected_deps: ['Go', 'gRPC', 'Protocol Buffers', 'Raft Consensus', 'BoltDB'],
        commits_count: 140
      }
    ]
  }
};

function buildHeaders(personalToken, accept = 'application/vnd.github+json') {
  const headers = { 'Accept': accept };
  if (personalToken) headers['Authorization'] = `Bearer ${personalToken}`;
  return headers;
}

// Set from /api/config: true when the deployment has its own GITHUB_TOKEN
let useServerGithub = false;
export function setServerGithub(enabled) {
  useServerGithub = Boolean(enabled);
}

/**
 * GET a GitHub API path. A visitor's own token goes straight to GitHub;
 * otherwise use the deployment's /api/github proxy when it has a token
 * (5,000/hour shared) and fall back to unauthenticated calls (60/hour per IP).
 */
function ghFetch(path, personalToken = '') {
  if (!personalToken && useServerGithub) {
    return fetch(`/api/github?path=${encodeURIComponent(path)}`);
  }
  return fetch(`https://api.github.com${path}`, { headers: buildHeaders(personalToken) });
}

// Enrichment results keyed by repo + last update, so revisits cost no API calls
// v2: entries also carry parsed README features
const CACHE_PREFIX = 'r2r:enrich:v2:';
function readCache(key) {
  try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + key) || 'null'); } catch { return null; }
}
function writeCache(key, value) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

/**
 * Turn a failed GitHub response into a user-facing error.
 * GitHub signals rate limiting with 403 or 429 and x-ratelimit-remaining: 0.
 */
function githubError(res, fallbackMsg) {
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (res.status === 429 || (res.status === 403 && remaining === '0')) {
    return new Error('GitHub API rate limit exceeded. Please add a Personal Access Token in Settings.');
  }
  if (res.status === 401) {
    return new Error('GitHub rejected the Personal Access Token (401). Check or remove it in Settings.');
  }
  return new Error(`${fallbackMsg} (${res.status}).`);
}

/**
 * Fetch GitHub user profile and repositories
 */
export async function fetchUserRepos(rawInput, personalToken = '') {
  const username = extractCleanUsername(rawInput);
  if (!username || !/^[A-Za-z0-9-]{1,39}$/.test(username)) {
    throw new Error('Please enter a valid GitHub username or profile URL.');
  }

  // 1. Fetch User Profile
  const userRes = await ghFetch(`/users/${username}`, personalToken);
  if (!userRes.ok) {
    if (userRes.status === 404) {
      throw new Error(`GitHub user "${username}" not found.`);
    }
    throw githubError(userRes, 'Failed to fetch user profile');
  }
  const userProfile = await userRes.json();

  // 2. Fetch Repositories (paginated, up to 500)
  const rawRepos = [];
  for (let page = 1; page <= 5; page++) {
    const repoRes = await ghFetch(`/users/${username}/repos?sort=updated&per_page=100&page=${page}`, personalToken);
    if (!repoRes.ok) {
      throw githubError(repoRes, `Failed to fetch repositories for "${username}"`);
    }
    const pageRepos = await repoRes.json();
    rawRepos.push(...pageRepos);
    if (pageRepos.length < 100) break;
  }

  // Forks are other people's work and the <username>/<username> repo is the
  // profile README, so neither belongs in a resume's Projects section
  const repos = rawRepos
    .filter(r => !r.fork && r.name.toLowerCase() !== userProfile.login.toLowerCase())
    .map(r => toRepoModel(r, userProfile.login));

  return {
    user: {
      username: userProfile.login,
      name: userProfile.name || userProfile.login,
      avatar_url: userProfile.avatar_url,
      bio: userProfile.bio || 'Software Developer',
      public_repos: userProfile.public_repos
    },
    repos
  };
}

/**
 * Shape a GitHub API repo into the app's repo model
 */
function toRepoModel(r, login) {
  const deps = extractFallbackDepsFromRepo(r);
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    owner: r.owner?.login || login,
    description: r.description || 'No description provided.',
    html_url: r.html_url,
    language: r.language || 'Codebase',
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    topics: r.topics || [],
    updated_at: r.updated_at,
    languages_breakdown: r.language ? { [r.language]: 100 } : {},
    detected_deps: [...deps.strong, ...deps.weak],
    strong_deps: deps.strong,
    weak_deps: deps.weak,
    commits_count: null, // Real count is filled in by enrichRepoDetails for selected repos
    enriched: false
  };
}

/**
 * Fetch one repository by "owner/name" (used by the eval script)
 */
export async function fetchRepo(fullName, personalToken = '') {
  const res = await ghFetch(`/repos/${fullName}`, personalToken);
  if (!res.ok) throw githubError(res, `Failed to fetch ${fullName}`);
  const r = await res.json();
  return toRepoModel(r, r.owner?.login);
}

/**
 * Every technology name the detectors know, for checking claims in bullets
 */
export function knownTechNames() {
  return [...new Set([...keywordsMap.map(([, name]) => name), ...Object.values(MANIFEST_PACKAGES)])];
}

/**
 * Programmatically fetch raw README.md content for a repository
 */
export async function fetchRepoReadme(fullName) {
  if (!fullName) return '';
  const text = await fetchRawFile(fullName, 'README.md');
  return text.slice(0, 2000); // Excerpt for prompt
}

/**
 * Fetch real detail for a selected repository: README excerpt, dependencies
 * from root manifests, and the owner's commit count. Costs 3-6 API calls, so it
 * only runs for repos the user generates bullets for, and results are cached
 * until the repo is next updated.
 * Mutates and returns the repo. Each lookup is best-effort.
 */
export async function enrichRepoDetails(repo, personalToken = '') {
  if (!repo?.full_name || repo.enriched) return repo;
  const cacheKey = `${repo.full_name}@${repo.updated_at}`;
  const cached = readCache(cacheKey);
  if (cached) {
    applyEnrichment(repo, cached);
    return repo;
  }

  const api = `/repos/${repo.full_name}`;
  const [rootFiles, commits] = await Promise.all([
    fetchJson(`${api}/contents/`, personalToken),
    fetchCommitCount(api, repo.owner, personalToken)
  ]);

  const manifestDeps = new Set();
  let readmeText = '';
  const MANIFESTS = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'cargo.toml'];

  if (Array.isArray(rootFiles)) {
    const byName = new Map(rootFiles.map(f => [f.name.toLowerCase(), f.name]));
    if (['dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml'].some(n => byName.has(n))) manifestDeps.add('Docker');
    if (byName.has('tsconfig.json')) manifestDeps.add('TypeScript');
    if (byName.has('.github')) {
      const workflows = await fetchJson(`${api}/contents/.github/workflows`, personalToken);
      if (Array.isArray(workflows) && workflows.length > 0) manifestDeps.add('GitHub Actions');
    }

    const readmeName = rootFiles.map(f => f.name).find(n => /^readme(\.(md|markdown|rst|txt))?$/i.test(n));
    const manifests = MANIFESTS.filter(n => byName.has(n));
    const [readme, ...texts] = await Promise.all([
      readmeName ? fetchRawFile(repo.full_name, readmeName) : Promise.resolve(''),
      ...manifests.map(n => fetchRawFile(repo.full_name, byName.get(n)))
    ]);
    readmeText = readme;
    manifests.forEach((file, i) => {
      if (texts[i]) detectDepsFromManifest(file, texts[i]).forEach(d => manifestDeps.add(d));
    });
    // With a manifest in hand, description-only guesses that it doesn't confirm are dropped
    if (manifests.length > 0) repo.weak_deps = [];
  } else {
    // API listing failed (usually the rate limit). raw.githubusercontent.com isn't
    // API-limited, so still try the common file names directly.
    const [readme, ...texts] = await Promise.all([
      fetchRawFile(repo.full_name, 'README.md'),
      ...MANIFESTS.slice(0, 2).map(n => fetchRawFile(repo.full_name, n))
    ]);
    readmeText = readme;
    MANIFESTS.slice(0, 2).forEach((file, i) => {
      if (texts[i]) detectDepsFromManifest(file, texts[i]).forEach(d => manifestDeps.add(d));
    });
    if (texts.some(Boolean)) repo.weak_deps = [];
  }

  const enrichment = {
    manifestDeps: Array.from(manifestDeps),
    weakDeps: repo.weak_deps || [],
    commits: typeof commits === 'number' ? commits : null,
    readmeText: (readmeText || '').slice(0, 2000),
    // Parsed from the full README before it's trimmed for the prompt
    readmeFeatures: extractReadmeFacts(readmeText).features
  };
  applyEnrichment(repo, enrichment);

  // A rate-limited or failed pass is retried on the next generate instead of cached
  repo.enriched = Array.isArray(rootFiles);
  repo.enrichIncomplete = !repo.enriched;
  if (repo.enriched) writeCache(cacheKey, enrichment);
  return repo;
}

/**
 * Read a file from raw.githubusercontent.com: public repos only, CORS-enabled,
 * and not counted against the GitHub API rate limit.
 */
async function fetchRawFile(fullName, path) {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${fullName}/HEAD/${path.split('/').map(encodeURIComponent).join('/')}`);
    if (res.ok) return await res.text();
  } catch (err) {
    console.warn(`Raw file request failed: ${fullName}/${path}`, err);
  }
  return '';
}

function applyEnrichment(repo, { manifestDeps, weakDeps, commits, readmeText, readmeFeatures = [] }) {
  const deps = new Set([...(repo.strong_deps || []), ...weakDeps, ...manifestDeps]);
  repo.detected_deps = Array.from(deps);
  repo.manifest_deps = manifestDeps;
  if (typeof commits === 'number') repo.commits_count = commits;
  repo.readmeText = readmeText || '';
  repo.readme_features = readmeFeatures;
  repo.enriched = true;
}

async function fetchJson(path, personalToken) {
  try {
    const res = await ghFetch(path, personalToken);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`GitHub request failed: ${path}`, err);
  }
  return null;
}


/**
 * Count the owner's commits from the Link header of a one-per-page listing.
 */
async function fetchCommitCount(api, owner, personalToken) {
  try {
    const authorParam = owner ? `&author=${owner}` : '';
    const res = await ghFetch(`${api}/commits?per_page=1${authorParam}`, personalToken);
    if (!res.ok) return null; // 409 = empty repository
    const last = (res.headers.get('link') || '').match(/[?&]page=(\d+)>;\s*rel="last"/);
    if (last) return parseInt(last[1], 10);
    const body = await res.json();
    return Array.isArray(body) ? body.length : null;
  } catch {
    return null;
  }
}

// Package name -> display name, for manifest-based detection
const MANIFEST_PACKAGES = {
  // JavaScript / TypeScript
  react: 'React', 'react-native': 'React Native', next: 'Next.js', vue: 'Vue.js', nuxt: 'Nuxt.js',
  '@angular/core': 'Angular', svelte: 'Svelte', '@sveltejs/kit': 'SvelteKit', vite: 'Vite',
  tailwindcss: 'Tailwind CSS', express: 'Express', fastify: 'Fastify', '@nestjs/core': 'NestJS',
  koa: 'Koa', 'socket.io': 'Socket.io', ws: 'WebSockets', graphql: 'GraphQL', '@apollo/server': 'Apollo GraphQL',
  '@trpc/server': 'tRPC', prisma: 'Prisma', '@prisma/client': 'Prisma', 'drizzle-orm': 'Drizzle ORM',
  mongoose: 'Mongoose', mongodb: 'MongoDB', pg: 'PostgreSQL', mysql2: 'MySQL', redis: 'Redis', ioredis: 'Redis',
  sequelize: 'Sequelize', typeorm: 'TypeORM', firebase: 'Firebase', '@supabase/supabase-js': 'Supabase',
  stripe: 'Stripe', openai: 'OpenAI API', '@anthropic-ai/sdk': 'Claude API', '@google/generative-ai': 'Gemini API',
  '@google/genai': 'Gemini API', langchain: 'LangChain', redux: 'Redux', '@reduxjs/toolkit': 'Redux',
  zustand: 'Zustand', '@tanstack/react-query': 'React Query', jest: 'Jest', vitest: 'Vitest', cypress: 'Cypress',
  '@playwright/test': 'Playwright', electron: 'Electron', '@tauri-apps/api': 'Tauri', three: 'Three.js',
  d3: 'D3.js', 'chart.js': 'Chart.js', jsonwebtoken: 'JWT', passport: 'Passport.js', 'next-auth': 'NextAuth',
  typescript: 'TypeScript', jszip: 'JSZip',
  // Python
  fastapi: 'FastAPI', django: 'Django', flask: 'Flask', sqlalchemy: 'SQLAlchemy', pandas: 'Pandas', numpy: 'NumPy',
  'scikit-learn': 'scikit-learn', torch: 'PyTorch', tensorflow: 'TensorFlow', transformers: 'Hugging Face Transformers',
  'google-generativeai': 'Gemini API', 'google-genai': 'Gemini API', anthropic: 'Claude API', pytest: 'PyTest',
  celery: 'Celery', streamlit: 'Streamlit', selenium: 'Selenium', playwright: 'Playwright', beautifulsoup4: 'BeautifulSoup',
  pydantic: 'Pydantic', uvicorn: 'Uvicorn', psycopg2: 'PostgreSQL', 'psycopg2-binary': 'PostgreSQL', psycopg: 'PostgreSQL',
  pymongo: 'MongoDB', supabase: 'Supabase', boto3: 'AWS', 'opencv-python': 'OpenCV', pyperclip: 'Pyperclip',
  pyqt5: 'PyQt', pyqt6: 'PyQt', pyside6: 'PySide',
  // Go / Rust
  'github.com/gin-gonic/gin': 'Gin', 'github.com/gofiber/fiber': 'Fiber', 'google.golang.org/grpc': 'gRPC',
  tokio: 'Tokio', 'actix-web': 'Actix', axum: 'Axum', serde: 'Serde'
};

function detectDepsFromManifest(file, text) {
  const found = new Set();
  const add = (pkg) => {
    const display = MANIFEST_PACKAGES[(pkg || '').trim().toLowerCase()];
    if (display) found.add(display);
  };

  if (file === 'package.json') {
    try {
      const pkg = JSON.parse(text);
      Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).forEach(add);
    } catch { /* malformed package.json */ }
  } else if (file === 'requirements.txt') {
    text.split(/\r?\n/).forEach(line => add(line.split(/[<>=!~[;#\s]/)[0]));
  } else if (file === 'pyproject.toml') {
    (text.match(/["'][A-Za-z0-9_.-]+(?=[\s<>=!~[;"'])/g) || []).forEach(m => add(m.slice(1)));
    (text.match(/^[A-Za-z0-9_-]+(?=\s*=)/gm) || []).forEach(add);
  } else if (file === 'go.mod') {
    Object.keys(MANIFEST_PACKAGES)
      .filter(k => k.includes('/') && text.includes(k))
      .forEach(k => found.add(MANIFEST_PACKAGES[k]));
  } else if (file === 'cargo.toml') {
    const depsSection = text.split(/^\[dependencies\]/m)[1]?.split(/^\[/m)[0] || '';
    (depsSection.match(/^[A-Za-z0-9_-]+(?=\s*=)/gm) || []).forEach(add);
  }
  return Array.from(found);
}

// Keyword -> Display Name mapping (ordered by specificity)
const keywordsMap = [
  // Frontend
  ['reactjs', 'React'], ['react-native', 'React Native'], ['react', 'React'],
  ['nextjs', 'Next.js'], ['next.js', 'Next.js'],
  ['vue', 'Vue.js'], ['nuxt', 'Nuxt.js'],
  ['angular', 'Angular'], ['svelte', 'Svelte'],
  ['gatsby', 'Gatsby'], ['vite', 'Vite'],
  ['tailwind', 'Tailwind CSS'], ['bootstrap', 'Bootstrap'],
  ['material-ui', 'Material UI'],
  // Backend
  ['nodejs', 'Node.js'], ['node.js', 'Node.js'],
  ['express', 'Express'], ['fastapi', 'FastAPI'],
  ['django', 'Django'], ['flask', 'Flask'],
  ['spring-boot', 'Spring Boot'], ['spring', 'Spring Boot'],
  ['nestjs', 'NestJS'], ['rails', 'Ruby on Rails'],
  ['laravel', 'Laravel'], ['fastify', 'Fastify'],
  // Databases
  ['postgresql', 'PostgreSQL'], ['postgres', 'PostgreSQL'],
  ['mongodb', 'MongoDB'], ['mongo', 'MongoDB'],
  ['mysql', 'MySQL'], ['sqlite', 'SQLite'],
  ['redis', 'Redis'], ['elasticsearch', 'Elasticsearch'],
  ['dynamodb', 'DynamoDB'], ['neo4j', 'Neo4j'],
  // ORMs
  ['prisma', 'Prisma'], ['drizzle', 'Drizzle ORM'],
  ['sequelize', 'Sequelize'], ['typeorm', 'TypeORM'],
  ['mongoose', 'Mongoose'], ['sqlalchemy', 'SQLAlchemy'],
  // Cloud & BaaS
  ['firebase', 'Firebase'], ['supabase', 'Supabase'],
  ['aws', 'AWS'], ['azure', 'Azure'],
  ['vercel', 'Vercel'], ['heroku', 'Heroku'],
  // DevOps
  ['docker', 'Docker'], ['kubernetes', 'Kubernetes'], ['k8s', 'Kubernetes'],
  ['terraform', 'Terraform'], ['nginx', 'Nginx'],
  ['github-actions', 'GitHub Actions'],
  // APIs & Protocols
  ['graphql', 'GraphQL'], ['grpc', 'gRPC'],
  ['websocket', 'WebSockets'], ['socket.io', 'Socket.io'],
  ['trpc', 'tRPC'],
  // Auth
  ['jwt', 'JWT'], ['oauth', 'OAuth'], ['auth0', 'Auth0'],
  // AI & ML
  ['openai', 'OpenAI API'], ['gemini', 'Gemini API'],
  ['langchain', 'LangChain'], ['llm', 'LLM'],
  ['tensorflow', 'TensorFlow'], ['pytorch', 'PyTorch'],
  ['huggingface', 'Hugging Face'], ['pinecone', 'Pinecone'],
  ['machine-learning', 'Machine Learning'],
  // Messaging
  ['kafka', 'Apache Kafka'], ['rabbitmq', 'RabbitMQ'],
  // Payment
  ['stripe', 'Stripe'], ['twilio', 'Twilio'],
  // Languages
  ['typescript', 'TypeScript'], ['python', 'Python'],
  ['rust', 'Rust'], ['golang', 'Go'],
  // Testing
  ['jest', 'Jest'], ['cypress', 'Cypress'],
  ['playwright', 'Playwright'], ['pytest', 'PyTest'],
  // State
  ['redux', 'Redux'], ['zustand', 'Zustand'],
  // Desktop/Mobile
  ['electron', 'Electron'], ['tauri', 'Tauri'],
  ['chrome-extension', 'Chrome Extension'], ['chrome extension', 'Chrome Extension'],
  ];

/**
 * Quick heuristic tech stack detector from repository metadata & topics.
 * Returns strong matches (language, name, topics) and weak ones (description
 * prose), so a manifest can later overrule the weak guesses.
 */
function extractFallbackDepsFromRepo(repo) {
  const strongText = `${repo.name.toLowerCase().replace(/[_]/g, '-')} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const strong = new Set();
  const weak = new Set();

  if (repo.language) strong.add(repo.language);


  // Whole-word matching, so "trust" isn't Rust, "invite" isn't Vite and "reactive" isn't React
  const matches = (text, keyword) =>
    new RegExp(`(?<![a-z0-9])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`).test(text);

  // Topics and the repo name are deliberate tags: trust them
  for (const [keyword, displayName] of keywordsMap) {
    if (matches(strongText, keyword)) strong.add(displayName);
  }

  // The description is prose and often mentions things the project doesn't use
  // ("works on pages like ChatGPT, Gemini, and Grok"). AI services there only
  // count when the sentence says the project uses them or reads as a stack list.
  const sentences = (repo.description || '').toLowerCase().split(/(?<=[.!?;])\s+/);
  for (const sentence of sentences) {
    const found = keywordsMap.filter(([keyword]) => matches(sentence, keyword));
    for (const [keyword, displayName] of found) {
      if (strong.has(displayName)) continue;
      const isAiService = AI_SERVICE_KEYWORDS.has(keyword);
      // The cue must lead into this name ("built with Gemini"), not sit elsewhere in the sentence
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const usageCue = new RegExp(`\\b(using|uses|use|with|powered by|built (with|on)|via|integrat\\w*|leverag\\w*|backed by|on top of)\\s+(?:the\\s+)?(?:[\\w.-]+,?\\s+){0,2}${escaped}(?![a-z0-9])`).test(sentence);
      const otherTech = found.filter(([k]) => k !== keyword && !AI_SERVICE_KEYWORDS.has(k)).length;
      if (!isAiService || usageCue || otherTech >= 2) weak.add(displayName);
    }
  }

  return { strong: Array.from(strong), weak: Array.from(weak).filter(d => !strong.has(d)) };
}

const AI_SERVICE_KEYWORDS = new Set(['openai', 'gemini', 'llm', 'langchain', 'pinecone', 'huggingface']);
