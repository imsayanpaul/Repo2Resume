/**
 * AI Resume Bullet Generator Service
 * Supports Google XYZ Formula ("Accomplished X using Y resulting in Z"), STAR method,
 * and direct Gemini API integration with local smart heuristic fallbacks.
 */

/**
 * Generate Resume Bullets for a given repo
 * @param {Object} repo - Repository object
 * @param {String} tone - 'xyz' | 'star' | 'technical' | 'ats'
 * @param {String} apiKey - User's Gemini API Key (optional)
 * @param {Array} jdKeywords - Target Job Description matching keywords (optional)
 * @param {String} customInstruction - Specific user instructions for the bullet generation
 * @returns {Promise<{bullets: string[], source: 'gemini'|'heuristic', aiError: string|null}>}
 */
export async function generateRepoBullets(repo, tone = 'xyz', apiKey = '', jdKeywords = [], customInstruction = '') {
  let aiError = null;

  // 1. If Gemini API Key is provided, use live Gemini API
  if (apiKey && apiKey.trim() !== '') {
    try {
      const bullets = await generateBulletsWithGemini(repo, tone, apiKey.trim(), jdKeywords, customInstruction);
      return { bullets, source: 'gemini', aiError: null };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart rule engine:', err.message);
      aiError = err.message;
    }
  }

  // 2. Local Smart Heuristic Generator (Zero Latency)
  return { bullets: generateHeuristicBullets(repo, tone, jdKeywords), source: 'heuristic', aiError };
}

const TONE_INSTRUCTIONS = {
  xyz: `Google XYZ Formula — Every bullet MUST follow: "Accomplished [X] as measured by [Y], by doing [Z]."
    - X = a specific, concrete accomplishment (what the project does for users)
    - Y = a quantifiable metric or measurable outcome (users served, latency reduced, data processed, etc.)
    - Z = the specific technical approach / stack used
    Example: "Architected and deployed an AI-powered career platform that auto-generates ATS-optimized resumes and cover letters, serving 500+ job seekers with 40% higher interview callback rates, by leveraging React, Node.js, and OpenAI GPT-4 APIs."`,

  star: `STAR Method — Each bullet should cover:
    - Situation/Task: What challenge or need the project addresses
    - Action: What you specifically built/engineered
    - Result: Measurable outcome or user impact
    Example: "Identified that job seekers lacked tools for ATS-optimized resumes; designed and built a full-stack AI platform using React and Node.js that scans resumes against ATS criteria, auto-generates tailored cover letters, and visualizes career roadmaps, resulting in a 40% increase in interview callbacks."`,

  technical: `Technical Depth — Focus on architecture, engineering decisions, and system design:
    - Emphasize design patterns, protocols, algorithms, and infrastructure
    - Include specific technical metrics (latency, throughput, scalability)
    Example: "Engineered a microservices-based career platform with React SPA frontend, Express REST API gateway, PostgreSQL persistence layer with connection pooling, and Redis caching achieving sub-50ms API response times under 10K concurrent users."`,

  ats: `ATS Minimal — Concise, keyword-rich bullets optimized for Applicant Tracking Systems:
    - Start with strong action verbs (Architected, Engineered, Deployed, Optimized)
    - Pack in relevant technologies naturally
    - Keep each bullet to 1-2 lines maximum
    Example: "Deployed AI-powered career platform using React, Node.js, PostgreSQL, and OpenAI APIs; implemented ATS resume scanning, cover letter generation, and real-time job tracking for 500+ users."`
};

const GEMINI_TIMEOUT_MS = 30000;

/**
 * Call Gemini API directly from browser using available models
 */
async function generateBulletsWithGemini(repo, tone, apiKey, jdKeywords, customInstruction = '') {
  const toneGuide = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.xyz;
  
  const prompt = `You are an elite technical resume writer who has reviewed 10,000+ engineering resumes at FAANG companies.

YOUR TASK: Write 3 high-impact resume bullet points for a software engineering project. These bullets will appear under "PROJECTS" on a resume.

=== PROJECT INFORMATION ===
Repository Name: ${repo.name}
Description: ${repo.description || 'Not provided'}
Primary Language: ${repo.language || 'Not specified'}
Detected Dependencies/Frameworks: ${(repo.detected_deps || []).join(', ') || 'Not detected'}
GitHub Topics/Tags: ${(repo.topics || []).join(', ') || 'None'}
Stars: ${repo.stargazers_count || 0} | Forks: ${repo.forks_count || 0}
${repo.readmeText ? `\n=== README CONTENT (analyze this carefully for features, architecture, and purpose) ===\n${repo.readmeText.slice(0, 2000)}` : ''}
${jdKeywords.length > 0 ? `\n=== TARGET JOB KEYWORDS (weave these in naturally) ===\n${jdKeywords.join(', ')}` : ''}
${customInstruction ? `\n=== USER'S SPECIFIC INSTRUCTION ===\n${customInstruction}` : ''}

=== CRITICAL RULES ===
1. READ THE DESCRIPTION AND README CAREFULLY. Your bullets must describe what THIS SPECIFIC project actually does — its real features, its real purpose, its real user value. Do NOT write generic filler like "modular data processing workflows" unless the project actually processes data.
2. The FIRST bullet should be a comprehensive project summary: what it is, what it does for users, and what core features it has. This bullet should be the longest (2-3 lines). Start with "Architected and deployed".
3. Bullets 2 and 3 should highlight specific technical achievements, architecture decisions, or measurable impacts RELEVANT to what the project actually does.
4. Use the ACTUAL tech stack from the repo. If the README mentions specific technologies (e.g., "built with Firebase", "uses Prisma ORM"), include those — not just the primary language.
5. Quantify impact with diverse, contextually realistic engineering metrics (e.g., sub-100ms response latencies, data throughput, test coverage, zero-downtime offline state, or memory footprint). NEVER use repetitive hardcoded percentages like "~35%" or "40%" across bullets; articulate genuine, distinct technical outcomes.
6. NEVER fabricate features that aren't evidenced by the description or README.

=== TONE/STYLE ===
${toneGuide}

=== TECH STACK CORRECTION ===
Based on the README and description, also return a corrected tech stack array. The current detected stack may be inaccurate or incomplete — fix it based on what you actually see in the README/description. Include frameworks, databases, APIs, and tools actually used.

=== RESPONSE FORMAT ===
Return ONLY a valid JSON object (no markdown codeblock wrapper):
{
  "bullets": ["bullet1...", "bullet2...", "bullet3..."],
  "correctedTechStack": ["React", "Node.js", "PostgreSQL", "etc..."]
}`;

  // gemini-2.0-flash and the 1.5 models are retired (404); the API points callers to these
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  let lastError = null;

  for (const model of modelsToTry) {
    // Under high demand a model can queue a request for minutes instead of returning 503,
    // so give up after a while and let the next model try
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            // Leaves headroom for models that spend output tokens on thinking
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Thinking models can return thought parts ahead of the answer, so keep only answer text
        const rawText = (data?.candidates?.[0]?.content?.parts || [])
          .filter(part => !part.thought && typeof part.text === 'string')
          .map(part => part.text)
          .join('');
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
          const parsed = JSON.parse(cleanedText);
          
          // Handle new format: { bullets: [...], correctedTechStack: [...] }
          if (parsed && parsed.bullets && Array.isArray(parsed.bullets) && parsed.bullets.length > 0) {
            // Side-effect: update repo's detected_deps if AI corrected them
            if (parsed.correctedTechStack && Array.isArray(parsed.correctedTechStack) && parsed.correctedTechStack.length > 0) {
              repo.detected_deps = parsed.correctedTechStack;
            }
            return parsed.bullets;
          }
          
          // Legacy fallback: plain array of strings
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (parseErr) {
          // Try extracting array from malformed response
          const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            const arr = JSON.parse(arrayMatch[0]);
            if (Array.isArray(arr) && arr.length > 0) return arr;
          }
        }
        lastError = new Error(`Gemini (${model}) returned a response that could not be parsed.`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${response.status}`;
        if (response.status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
          lastError = new Error('Gemini API quota exhausted or rate limited. Try again later or use a different Gemini API key in Settings.');
          continue;
        }
        if (response.status === 401 || response.status === 403 || /api key/i.test(msg)) {
          // Bad, revoked or leaked key: every model will fail the same way
          const keyErr = new Error(`Gemini rejected the API key: ${msg} Update it in Settings.`);
          keyErr.fatal = true;
          throw keyErr;
        }
        lastError = new Error(`Gemini (${model}): ${msg}`);
      }
    } catch (err) {
      if (err.fatal) throw err;
      lastError = err.name === 'AbortError'
        ? new Error(`Gemini (${model}) timed out after ${GEMINI_TIMEOUT_MS / 1000}s.`)
        : err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('Could not parse valid response from Gemini API');
}

/**
 * Smart Heuristic Bullet Generator following Google's XYZ formula & ATS guidelines
 * This is the offline fallback when no API key is available.
 */
function generateHeuristicBullets(repo, tone, jdKeywords = []) {
  const name = formatRepoName(repo.name);
  const lang = repo.language && repo.language !== 'Codebase' ? repo.language : 'modern tooling';
  const techStack = repo.detected_deps.length > 0 ? repo.detected_deps.slice(0, 5).join(', ') : lang;
  const arch = getArchitectureDetail(repo);
  const archTech = arch.tech || lang;
  const starsText = repo.stargazers_count > 10 ? `, garnering ${repo.stargazers_count}+ stars on GitHub` : '';
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

  if (tone === 'xyz') {
    return [
      `${verbs.lead} ${name}, ${projectPurpose}${featureHighlights ? ` that ${featureHighlights}` : ''}, leveraging ${techStack}${jdHighlight}${starsText}.`,
      `${verbs.mid} ${arch.text} using ${archTech}, ${getPerformanceMetric(repo)} and ensuring robust error handling across all user-facing workflows.`,
      `${verbs.tail} ${getInfraDetail(repo)}, ${getQualityMetric(repo)} to maintain production-grade reliability and developer velocity.`
    ];
  }

  if (tone === 'star') {
    return [
      `Identified a need for ${getProjectNeed(repo)}; ${verbs.lead.toLowerCase()} ${name} using ${techStack} — ${projectPurpose}${featureHighlights ? ` that ${featureHighlights}` : ''}${starsText}.`,
      `${verbs.mid} ${arch.text} with ${archTech}, ${getPerformanceMetric(repo)} and enabling seamless end-to-end user workflows.`,
      `${verbs.tail} ${getInfraDetail(repo)}, ${getQualityMetric(repo)} during active development iterations.`
    ];
  }

  if (tone === 'technical') {
    return [
      `${verbs.lead} ${name}${jdHighlight} — ${projectPurpose}${featureHighlights ? ` that ${featureHighlights}` : ''} — using ${techStack}, adhering to clean architecture principles and SOLID design patterns.`,
      `${verbs.mid} ${getTechnicalOptimization(repo)}, ${getTechnicalMetric(repo)} for critical user-facing operations.`,
      `${verbs.tail} ${getInfraDetail(repo)}, comprehensive API documentation, and structured developer onboarding guides for open-source scalability.`
    ];
  }

  // Default ATS Minimalist
  return [
    `${verbs.lead} ${name} using ${techStack} — ${projectPurpose}${featureHighlights ? `; ${featureHighlights}` : ''}${starsText}.`,
    `${verbs.mid} ${arch.text} with ${archTech}, ${getPerformanceMetric(repo)}.`,
    `${verbs.tail} ${getInfraDetail(repo)} to ensure production-grade reliability.`
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
    { lead: 'Spearheaded development of', mid: 'Constructed', tail: 'Deployed' },
    { lead: 'Created and launched', mid: 'Streamlined', tail: 'Configured' },
    { lead: 'Developed and delivered', mid: 'Programmed', tail: 'Orchestrated' },
    { lead: 'Pioneered and released', mid: 'Crafted', tail: 'Instituted' },
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
      return `a ${repo.language || 'full-stack'} application focused on ${topics}`;
    }
    return `a ${repo.language || 'full-stack'} application with modular architecture and responsive user interface`;
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
    new RegExp(`^${repo.name}\\s*[:–—-]\\s*`, 'i'),
    new RegExp(`^${repoName}\\s*[:–—-]\\s*`, 'i'),
    new RegExp(`^${formatRepoName(repo.name)}\\s*[:–—-]\\s*`, 'i'),
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
    return `a ${repo.language || 'full-stack'} application with modular architecture`;
  }
  
  // Take the first sentence as the core purpose; the rest is usually detail
  let purpose = cleaned;
  const firstSentence = purpose.split(/[.!?;](?:\s|$)/)[0].trim();
  if (firstSentence.length > 20 || purpose.length > 100) {
    purpose = firstSentence || purpose;
  }

  // Lowercase first letter for embedding in sentence, but keep acronyms like "AI" or "CLI"
  if (!/^[A-Z]{2,}/.test(purpose)) {
    purpose = purpose.charAt(0).toLowerCase() + purpose.slice(1);
  }

  // Descriptions written as instructions ("Copy a list once...", "Tweak React components...")
  // read as "a tool to <verb>...", not "a copy a list once..."
  const firstWord = purpose.split(/[\s,]/)[0].toLowerCase();
  if (IMPERATIVE_VERBS.has(firstWord)) {
    return `a tool to ${purpose}`;
  }

  // Add appropriate article
  const article = /^[aeiou]/i.test(purpose) || /^[AEFHILMNORSX][A-Z]/.test(purpose) ? 'an' : 'a';

  return `${article} ${purpose}`;
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

/**
 * Context-aware architecture detail based on repo tech stack
 */
// Returns the architecture phrase plus the technology that justifies it,
// so a React frontend isn't described as being built "using Python"
function getArchitectureDetail(repo) {
  const deps = repo.detected_deps || [];
  const find = (...keys) => deps.find(d => keys.some(k => d.toLowerCase().includes(k)));

  const frontend = find('react', 'vue', 'angular', 'svelte', 'next.js');
  if (frontend) {
    return { text: 'a responsive component-based frontend with RESTful API integration layer', tech: frontend };
  }
  const backend = find('fastapi', 'express', 'flask', 'django', 'nestjs', 'spring');
  if (backend) {
    return { text: 'modular API routes with middleware-based request validation and error handling', tech: backend };
  }
  const containers = find('docker', 'kubernetes');
  if (containers) {
    return { text: 'containerized services with orchestrated deployment pipelines', tech: containers };
  }
  return { text: 'modular processing workflows with clean separation of concerns', tech: null };
}

function getRepoHash(repoName, salt = 0) {
  let hash = salt;
  const str = repoName || 'repo';
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function pickOption(options, repoName, salt = 0) {
  if (!options || options.length === 0) return '';
  return options[getRepoHash(repoName, salt) % options.length];
}

function getPerformanceMetric(repo) {
  const deps = (repo.detected_deps || []).map(d => d.toLowerCase());
  const repoName = repo.name || '';

  // Redis / Caching
  if (deps.some(d => d.includes('redis') || d.includes('cache'))) {
    return pickOption([
      'slashing data access latency to sub-10ms through tiered in-memory caching',
      'minimizing database read contention through cache-aside eviction policies',
      'optimizing endpoint throughput under high concurrent request bursts via key-value caching',
      'reducing repeated backend computation cycles with distributed cache invalidation'
    ], repoName, 1);
  }

  // Database / Storage
  if (deps.some(d => d.includes('postgres') || d.includes('mongo') || d.includes('mysql') || d.includes('supabase') || d.includes('sqlite') || d.includes('prisma'))) {
    return pickOption([
      'accelerating query execution times through composite indexing and connection pool tuning',
      'eliminating N+1 query bottlenecks and optimizing multi-table joins via eager loading',
      'enforcing ACID transaction compliance and strict schema validations across write-heavy operations',
      'optimizing relational data retrieval with selective projection and structured query indexing'
    ], repoName, 2);
  }

  // AI / LLM / Vector
  if (deps.some(d => d.includes('gemini') || d.includes('openai') || d.includes('langchain') || d.includes('pinecone') || d.includes('rag'))) {
    return pickOption([
      'optimizing token consumption and API payload costs through context-aware prompt compression',
      'mitigating third-party rate limits (HTTP 429) using exponential backoff retry queues',
      'accelerating semantic similarity lookups with normalized vector embeddings',
      'delivering deterministic structured outputs with strict schema enforcement and error boundaries'
    ], repoName, 3);
  }

  // Real-Time / Streaming
  if (deps.some(d => d.includes('websocket') || d.includes('socket') || d.includes('grpc') || d.includes('rxjs'))) {
    return pickOption([
      'achieving sub-50ms message delivery latency with automatic heartbeat connection recovery',
      'preventing event drops during network disconnections using resilient client-side buffers',
      'optimizing streaming payload serialization to maximize bidirectional throughput'
    ], repoName, 4);
  }

  // Frontend / React / Vue / Single Page Apps
  if (deps.some(d => d.includes('react') || d.includes('vue') || d.includes('vite') || d.includes('next') || d.includes('svelte') || d.includes('angular'))) {
    return pickOption([
      'eliminating redundant re-renders and maintaining responsive 60 FPS interactions with memoized state selectors',
      'slashing initial bundle footprint and time-to-interactive (TTI) through dynamic route-based code splitting',
      'delivering instantaneous offline state restoration with resilient local persistence stores',
      'minimizing client-side UI latency through optimistic updates and non-blocking asynchronous workflows'
    ], repoName, 5);
  }

  // Backend / APIs
  if (deps.some(d => d.includes('fastapi') || d.includes('express') || d.includes('flask') || d.includes('django') || d.includes('node') || d.includes('spring'))) {
    return pickOption([
      'optimizing request-response roundtrips with lightweight middleware pipelines and structured error handling',
      'ensuring sub-100ms endpoint response latencies under sustained concurrent traffic',
      'enforcing strict contract serialization and payload sanitization across ingress API routes',
      'maximizing server throughput via asynchronous non-blocking event loops'
    ], repoName, 6);
  }

  // General / Core Systems
  return pickOption([
    'ensuring consistent sub-second execution times through optimized algorithmic data structures',
    'streamlining end-to-end data processing workflows with defensive error boundaries',
    'reducing runtime execution overhead and eliminating memory leaks through disciplined resource cleanup',
    'maintaining responsive throughput and seamless state synchronization across concurrent operations'
  ], repoName, 7);
}

// Only names infrastructure the repo actually shows evidence of, so a static
// site isn't credited with "CI/CD pipelines and automated test coverage"
function getInfraDetail(repo) {
  const deps = repo.detected_deps || [];
  const has = (...keys) => deps.find(d => keys.some(k => d.toLowerCase().includes(k)));
  const parts = [];

  if (has('docker')) parts.push('Docker containerization');
  if (has('kubernetes')) parts.push('Kubernetes orchestration');
  if (has('github actions')) parts.push('GitHub Actions CI/CD pipelines');
  const testTool = has('jest', 'vitest', 'pytest', 'cypress', 'playwright');
  if (testTool) parts.push(`automated ${testTool} test suites`);
  const baas = has('supabase', 'firebase');
  if (baas) parts.push(`a ${baas}-backed cloud data layer`);
  const cloud = has('aws', 'gcp', 'azure', 'vercel');
  if (cloud) parts.push(`${cloud} cloud deployment`);

  if (parts.length === 0) return 'a modular, well-documented codebase structure';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function getQualityMetric(repo) {
  const repoName = repo.name || '';
  // Stars are already credited in the lead bullet; only cite a commit count when it's the real one
  if (typeof repo.commits_count === 'number' && repo.commits_count > 40) {
    return `demonstrating iterative engineering across ${repo.commits_count} commits`;
  }
  return pickOption([
    'enforcing comprehensive unit and integration test coverage across critical user paths',
    'maintaining zero runtime regression errors through automated CI/CD validation pipelines',
    'enforcing strict static type analysis and clean linting standards across the codebase',
    'adhering to clean architecture principles and modular separation of concerns',
    'incorporating robust error logging and centralized telemetry for production auditability',
    'streamlining developer onboarding and long-term maintainability with documented architectural patterns'
  ], repoName, 8);
}

function getProjectNeed(repo) {
  const desc = (repo.description || '').toLowerCase();
  if (desc.includes('resume') || desc.includes('career') || desc.includes('job')) return 'streamlined career tools and job application workflows';
  if (desc.includes('ai') || desc.includes('ml') || desc.includes('machine learning')) return 'intelligent automation and AI-driven decision support';
  if (desc.includes('chat') || desc.includes('message') || desc.includes('real-time')) return 'real-time communication and collaborative user experiences';
  if (desc.includes('e-commerce') || desc.includes('shop') || desc.includes('store')) return 'modern e-commerce and digital transaction workflows';
  if (desc.includes('paste') || desc.includes('clipboard') || desc.includes('copy')) return 'efficient clipboard management and text processing tools';
  if (desc.includes('interview') || desc.includes('quiz') || desc.includes('assessment')) return 'structured skill assessment and interview preparation workflows';
  return 'efficient data processing and seamless user interactions';
}

function getProjectOutcome(repo) {
  const desc = (repo.description || '').toLowerCase();
  if (desc.includes('resume') || desc.includes('career')) return 'streamline job applications and optimize resume content for ATS systems';
  if (desc.includes('ai') || desc.includes('ml')) return 'deliver intelligent predictions and automated insights at scale';
  if (desc.includes('dashboard') || desc.includes('analytics')) return 'visualize complex datasets and enable data-driven decision-making';
  if (desc.includes('paste') || desc.includes('clipboard')) return 'streamline repetitive text workflows and boost productivity';
  return 'deliver a polished, production-ready user experience with minimal onboarding friction';
}

function getTechnicalOptimization(repo) {
  const deps = (repo.detected_deps || []).map(d => d.toLowerCase());
  if (deps.some(d => d.includes('graphql'))) return 'GraphQL query resolution with batched data fetching and N+1 query prevention';
  if (deps.some(d => d.includes('websocket') || d.includes('socket'))) return 'WebSocket connection management with heartbeat monitoring and graceful reconnection';
  if (deps.some(d => d.includes('redis'))) return 'Redis-backed caching layer with TTL-based eviction and cache invalidation strategies';
  return 'database indexing and asynchronous I/O operations';
}

function getTechnicalMetric(repo) {
  const deps = (repo.detected_deps || []).map(d => d.toLowerCase());
  const repoName = repo.name || '';

  if (deps.some(d => d.includes('websocket') || d.includes('socket'))) {
    return pickOption([
      'achieving sub-50ms bidirectional message propagation',
      'maintaining zero packet loss during network handshakes'
    ], repoName, 9);
  }
  if (deps.some(d => d.includes('redis') || d.includes('cache'))) {
    return pickOption([
      'achieving sub-10ms in-memory query retrieval',
      'slashing backend read pressure under burst loads'
    ], repoName, 10);
  }
  if (deps.some(d => d.includes('postgres') || d.includes('mongo') || d.includes('sql'))) {
    return pickOption([
      'maintaining sub-100ms analytical query response times',
      'eliminating table lock contention on concurrent writes'
    ], repoName, 11);
  }
  if (deps.some(d => d.includes('react') || d.includes('vue') || d.includes('vite'))) {
    return pickOption([
      'preserving 60 FPS rendering performance and sub-100ms interaction latency',
      'achieving sub-second initial contentful paint across diverse client devices'
    ], repoName, 12);
  }
  return pickOption([
    'ensuring sub-100ms response latencies for critical user queries',
    'achieving high-throughput data processing with deterministic execution bounds'
  ], repoName, 13);
}

/**
 * Format raw repo names like 'nexus-quant-trader' -> 'Nexus Quant Trader'
 */
function formatRepoName(raw) {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

