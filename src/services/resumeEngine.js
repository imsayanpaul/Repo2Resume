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
 */
export async function generateRepoBullets(repo, tone = 'xyz', apiKey = '', jdKeywords = [], customInstruction = '') {
  // 1. If Gemini API Key is provided, use live Gemini API
  if (apiKey && apiKey.trim() !== '') {
    try {
      return await generateBulletsWithGemini(repo, tone, apiKey, jdKeywords, customInstruction);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to smart rule engine:', err.message);
    }
  }

  // 2. Local Smart Heuristic Generator (Zero Latency, High Quality)
  return generateHeuristicBullets(repo, tone, jdKeywords);
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
5. Include realistic, plausible metrics (e.g., "reducing page load time by ~40%", "processing 10K+ records", "serving 200+ active users"). These should be believable for the project's scale.
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

  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1024
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${response.status}`;
        if (response.status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
          throw new Error('Gemini API quota exhausted or rate limited. Please add your free Gemini API key in Settings.');
        }
        lastError = new Error(msg);
      }
    } catch (err) {
      lastError = err;
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
  const techStack = repo.detected_deps.length > 0 ? repo.detected_deps.slice(0, 5).join(', ') : repo.language;
  const starsText = repo.stargazers_count > 10 ? `, garnering ${repo.stargazers_count}+ stars on GitHub` : '';
  const desc = (repo.description || '').toLowerCase();
  
  // Try to extract what the project actually does from description
  const projectPurpose = extractProjectPurpose(repo);
  
  // Highlight JD keywords if matching
  const matchingJd = jdKeywords.filter(k => 
    repo.detected_deps.some(d => d.toLowerCase().includes(k.toLowerCase())) ||
    repo.topics.some(t => t.toLowerCase().includes(k.toLowerCase())) ||
    desc.includes(k.toLowerCase())
  );
  const jdHighlight = matchingJd.length > 0 ? `, with emphasis on ${matchingJd.slice(0, 3).join(', ')}` : '';

  if (tone === 'xyz') {
    return [
      `Architected and deployed ${name}, ${projectPurpose}, leveraging ${techStack}${jdHighlight}${starsText}.`,
      `Engineered ${getArchitectureDetail(repo)} using ${repo.language}, ${getPerformanceMetric(repo)} and ensuring robust error handling across all user-facing workflows.`,
      `Implemented ${getInfraDetail(repo)}, ${getQualityMetric(repo)} to maintain production-grade reliability and developer velocity.`
    ];
  }

  if (tone === 'star') {
    return [
      `Identified a need for ${getProjectNeed(repo)}; designed and built ${name} using ${techStack} to ${getProjectOutcome(repo)}${starsText}.`,
      `Developed ${getArchitectureDetail(repo)} with ${repo.language}, ${getPerformanceMetric(repo)} and enabling seamless end-to-end user workflows.`,
      `Established ${getInfraDetail(repo)} and automated quality gates, ${getQualityMetric(repo)} during active development iterations.`
    ];
  }

  if (tone === 'technical') {
    return [
      `Constructed ${name}${jdHighlight} — ${projectPurpose} — using ${techStack}, adhering to clean architecture principles and SOLID design patterns.`,
      `Optimized ${getTechnicalOptimization(repo)}, ${getTechnicalMetric(repo)} for critical user-facing operations.`,
      `Configured ${getInfraDetail(repo)}, comprehensive API documentation, and structured developer onboarding guides for open-source scalability.`
    ];
  }

  // Default ATS Minimalist
  return [
    `Developed ${name} using ${techStack} — ${projectPurpose}${starsText}.`,
    `Integrated ${getArchitectureDetail(repo)} with ${repo.language}, ${getPerformanceMetric(repo)}.`,
    `Maintained ${getInfraDetail(repo)}, dependency tracking, and automated test suites to ensure production-grade reliability.`
  ];
}

/**
 * Extract a meaningful project purpose from repo metadata
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
  
  // Clean and rephrase the description into resume-worthy language
  let cleaned = desc
    .replace(/:[a-z0-9_+-]+:/gi, '')  // Remove GitHub emoji shortcodes
    .replace(/[!]{2,}/g, '')           // Remove excessive exclamation marks
    .replace(/^\s*(a|an|the)\s+/i, '') // Remove leading articles
    .trim();
  
  // If description is short enough, use directly with "a/an" prefix
  if (cleaned.length < 120) {
    const vowels = 'aeiou';
    const article = vowels.includes(cleaned[0]?.toLowerCase()) ? 'an' : 'a';
    // Lowercase the first letter for embedding in sentence
    cleaned = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    // Remove trailing period if present
    cleaned = cleaned.replace(/\.\s*$/, '');
    return `${article} ${cleaned}`;
  }
  
  // For long descriptions, take first sentence
  const firstSentence = cleaned.split(/[.!]/)[0].trim();
  const article = 'aeiou'.includes(firstSentence[0]?.toLowerCase()) ? 'an' : 'a';
  return `${article} ${firstSentence.charAt(0).toLowerCase()}${firstSentence.slice(1)}`;
}

/**
 * Context-aware architecture detail based on repo tech stack
 */
function getArchitectureDetail(repo) {
  const deps = (repo.detected_deps || []).map(d => d.toLowerCase());
  if (deps.some(d => d.includes('react') || d.includes('vue') || d.includes('angular') || d.includes('svelte'))) {
    return 'a responsive component-based frontend with RESTful API integration layer';
  }
  if (deps.some(d => d.includes('fastapi') || d.includes('express') || d.includes('flask') || d.includes('django'))) {
    return 'modular API routes with middleware-based request validation and error handling';
  }
  if (deps.some(d => d.includes('docker') || d.includes('kubernetes'))) {
    return 'containerized microservices with orchestrated deployment pipelines';
  }
  return 'modular data processing workflows with clean separation of concerns';
}

function getPerformanceMetric(repo) {
  const deps = (repo.detected_deps || []).map(d => d.toLowerCase());
  if (deps.some(d => d.includes('redis') || d.includes('cache'))) {
    return 'reducing API response times by ~60% through intelligent caching strategies';
  }
  if (deps.some(d => d.includes('postgres') || d.includes('mongo') || d.includes('mysql') || d.includes('supabase'))) {
    return 'optimizing database query performance by ~35% with indexed lookups and connection pooling';
  }
  return 'reducing state latency by ~35% and improving throughput across concurrent workloads';
}

function getInfraDetail(repo) {
  const deps = (repo.detected_deps || []).map(d => d.toLowerCase());
  if (deps.some(d => d.includes('docker'))) return 'Docker containerization, CI/CD pipelines, and automated deployment workflows';
  if (deps.some(d => d.includes('firebase') || d.includes('supabase'))) return 'cloud-hosted BaaS infrastructure with automated scaling and real-time data sync';
  if (deps.some(d => d.includes('aws') || d.includes('gcp') || d.includes('azure'))) return 'cloud infrastructure provisioning, monitoring dashboards, and auto-scaling policies';
  return 'automated test coverage, CI/CD pipelines, and structured schema validations';
}

function getQualityMetric(repo) {
  if (repo.stargazers_count > 50) return `achieving ${repo.stargazers_count}+ GitHub stars through code quality and community engagement`;
  return 'reducing regression rates by over 40%';
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
  if (deps.some(d => d.includes('websocket') || d.includes('socket'))) return 'achieving sub-50ms message delivery latency';
  if (deps.some(d => d.includes('postgres') || d.includes('mongo'))) return 'achieving sub-100ms response latencies';
  return 'achieving sub-100ms response latencies for critical user queries';
}

/**
 * Format raw repo names like 'nexus-quant-trader' -> 'Nexus Quant Trader'
 */
function formatRepoName(raw) {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
