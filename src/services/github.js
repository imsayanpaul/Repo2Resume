/**
 * GitHub API Service
 * Handles fetching repositories, language metrics, dependencies, and demo mock profiles.
 */

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
  if (!username) {
    throw new Error('Please enter a valid GitHub username or profile URL.');
  }

  const headers = buildHeaders(personalToken);

  // 1. Fetch User Profile
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
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
    const repoRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&page=${page}`, { headers });
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
    .map(r => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner?.login || userProfile.login,
      description: r.description || 'No description provided.',
      html_url: r.html_url,
      language: r.language || 'Codebase',
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      topics: r.topics || [],
      updated_at: r.updated_at,
      languages_breakdown: r.language ? { [r.language]: 100 } : {},
      detected_deps: extractFallbackDepsFromRepo(r),
      commits_count: null, // Real count is filled in by enrichRepoDetails for selected repos
      enriched: false
    }));

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
 * Programmatically fetch raw README.md content for a repository
 */
export async function fetchRepoReadme(fullName, personalToken = '') {
  if (!fullName) return '';
  const text = await fetchRaw(`https://api.github.com/repos/${fullName}/readme`, personalToken);
  return text.slice(0, 2000); // Excerpt for prompt
}

/**
 * Fetch real detail for a selected repository: dependencies from root
 * manifests and the owner's commit count. Costs 2-4 API calls, so it only
 * runs for repos the user generates bullets for.
 * Mutates and returns the repo. Each lookup is best-effort.
 */
export async function enrichRepoDetails(repo, personalToken = '') {
  if (!repo?.full_name || repo.enriched) return repo;
  const headers = buildHeaders(personalToken);
  const api = `https://api.github.com/repos/${repo.full_name}`;

  const [rootFiles, commits] = await Promise.all([
    fetchJson(`${api}/contents/`, headers),
    fetchCommitCount(api, repo.owner, headers)
  ]);

  const deps = new Set(repo.detected_deps || []);
  if (Array.isArray(rootFiles)) {
    const byName = new Map(rootFiles.map(f => [f.name.toLowerCase(), f.name]));
    if (['dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yaml'].some(n => byName.has(n))) deps.add('Docker');
    if (byName.has('tsconfig.json')) deps.add('TypeScript');
    if (byName.has('.github')) {
      const workflows = await fetchJson(`${api}/contents/.github/workflows`, headers);
      if (Array.isArray(workflows) && workflows.length > 0) deps.add('GitHub Actions');
    }

    const manifests = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'cargo.toml'].filter(n => byName.has(n));
    const texts = await Promise.all(manifests.map(n => fetchRaw(`${api}/contents/${byName.get(n)}`, personalToken)));
    manifests.forEach((file, i) => {
      if (texts[i]) detectDepsFromManifest(file, texts[i]).forEach(d => deps.add(d));
    });
  }
  repo.detected_deps = Array.from(deps);

  if (typeof commits === 'number') repo.commits_count = commits;
  // A rate-limited or failed pass is retried on the next generate
  repo.enriched = Array.isArray(rootFiles);
  return repo;
}

async function fetchJson(url, headers) {
  try {
    const res = await fetch(url, { headers });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`GitHub request failed: ${url}`, err);
  }
  return null;
}

async function fetchRaw(url, personalToken) {
  try {
    const res = await fetch(url, { headers: buildHeaders(personalToken, 'application/vnd.github.raw') });
    if (res.ok) return await res.text();
  } catch (err) {
    console.warn(`GitHub request failed: ${url}`, err);
  }
  return '';
}

/**
 * Count the owner's commits from the Link header of a one-per-page listing.
 */
async function fetchCommitCount(api, owner, headers) {
  try {
    const authorParam = owner ? `&author=${encodeURIComponent(owner)}` : '';
    const res = await fetch(`${api}/commits?per_page=1${authorParam}`, { headers });
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

/**
 * Quick heuristic tech stack detector from repository metadata & topics
 */
function extractFallbackDepsFromRepo(repo) {
  const rawText = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const stack = new Set();

  if (repo.language) stack.add(repo.language);

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
    ['chrome-extension', 'Chrome Extension'],
  ];

  const shortWords = new Set(['vue', 'aws', 'jwt', 'llm', 'k8s']);
  
  for (const [keyword, displayName] of keywordsMap) {
    if (shortWords.has(keyword)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(rawText)) stack.add(displayName);
    } else {
      if (rawText.includes(keyword)) stack.add(displayName);
    }
  }

  return Array.from(stack);
}
