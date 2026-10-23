/**
 * AI bullet generation shared by the browser (a visitor's own Gemini key) and
 * the /api/generate serverless function (the deployment's Groq/Gemini keys).
 * Same prompt, fact list and number checks for every provider. No browser APIs here.
 */

const TONE_INSTRUCTIONS = {
  xyz: `Google XYZ Formula — "Accomplished [X] as measured by [Y], by doing [Z]."
    - X = a specific, concrete accomplishment (what the project does for users)
    - Y = a measure taken ONLY from the FACTS or README (commit count, stars, number of supported formats or integrations, etc.). If no real measure exists, use concrete scope instead (what it handles, which integrations it connects) — never an invented number
    - Z = the specific technical approach / stack used
    Example (FACTS: 262 commits; README lists 4 export formats): "Built an AI career assistant that scores resumes against job postings and exports to 4 formats (PDF, DOCX, LaTeX, Overleaf), shipped across 262 commits, by combining React, Express, and the Gemini API."`,

  star: `STAR Method — Each bullet should cover:
    - Situation/Task: What challenge or need the project addresses
    - Action: What you specifically built/engineered
    - Result: A concrete outcome described by what the project now does, or a measure from the FACTS/README
    Example: "Identified that job seekers retyped the same details into every application; built a React and Express assistant that scores resumes against postings and drafts tailored cover letters, consolidating the search-to-offer workflow in one app."`,

  technical: `Technical Depth — Focus on architecture, engineering decisions, and system design:
    - Emphasize design patterns, protocols, data flow, and infrastructure that the README or dependencies show
    - Describe how components connect rather than claiming performance numbers
    Example: "Designed a FastAPI service that ingests Instagram DMs via webhook, transcribes audio with Whisper, and stores summaries in PostgreSQL through SQLAlchemy, with a React client querying a full-text search endpoint."`,

  ats: `ATS Minimal — Concise, keyword-rich bullets optimized for Applicant Tracking Systems:
    - Start with strong action verbs (Architected, Engineered, Deployed, Built)
    - Pack in relevant technologies naturally
    - Keep each bullet to 1-2 lines maximum
    Example: "Built AI career assistant with React, Express, Supabase, and Gemini API; implemented ATS resume scoring, cover letter generation, and application tracking."`
};

/**
 * Text the bullets are allowed to draw numbers from.
 */
function factSources(input) {
  return [
    input.name, input.description, input.readmeText, input.customInstruction,
    (input.detected_deps || []).join(' '), (input.topics || []).join(' '),
    `${input.stargazers_count ?? ''} ${input.forks_count ?? ''} ${input.commits_count ?? ''}`
  ].filter(Boolean).join(' \n ');
}

function buildFactsList(input) {
  const facts = [];
  // A tiny commit count ("across 2 commits") undersells the project, so only offer a meaningful one
  if (typeof input.commits_count === 'number' && input.commits_count >= 20) facts.push(`${input.commits_count} commits by the author`);
  if (input.stargazers_count > 0) facts.push(`${input.stargazers_count} GitHub stars`);
  if (input.forks_count > 0) facts.push(`${input.forks_count} forks`);
  return facts.length > 0 ? facts.join('; ') : 'None (do not use any repository statistics)';
}

export function buildPrompt(input, tone, jdKeywords = [], customInstruction = '') {
  const toneGuide = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.xyz;
  return `You are an elite technical resume writer who has reviewed 10,000+ engineering resumes at FAANG companies.

YOUR TASK: Write 3 high-impact resume bullet points for a software engineering project. These bullets will appear under "PROJECTS" on a resume.

=== PROJECT INFORMATION ===
Repository Name: ${input.name}
Description: ${input.description || 'Not provided'}
Primary Language: ${input.language || 'Not specified'}
Detected Dependencies/Frameworks (partly guessed from keywords; trust the README over this list): ${(input.detected_deps || []).join(', ') || 'Not detected'}
GitHub Topics/Tags: ${(input.topics || []).join(', ') || 'None'}

=== FACTS (the only repository statistics you may cite) ===
${buildFactsList(input)}
${input.readmeText ? `\n=== README CONTENT (analyze this carefully for features, architecture, and purpose) ===\n${input.readmeText.slice(0, 2000)}` : ''}
${jdKeywords.length > 0 ? `\n=== TARGET JOB KEYWORDS (weave in only those the project actually uses) ===\n${jdKeywords.join(', ')}` : ''}
${customInstruction ? `\n=== USER'S SPECIFIC INSTRUCTION ===\n${customInstruction}` : ''}

=== CRITICAL RULES ===
1. READ THE DESCRIPTION AND README CAREFULLY. Your bullets must describe what THIS SPECIFIC project actually does — its real features, its real purpose, its real user value. Do NOT write generic filler.
2. The FIRST bullet should be a comprehensive project summary: what it is, what it does for users, and what core features it has. This bullet should be the longest (2-3 lines).
3. Bullets 2 and 3 should highlight specific technical work or architecture decisions RELEVANT to what the project actually does.
4. Use the ACTUAL tech stack from the repo. If the README mentions specific technologies, include those — not just the primary language.
5. NUMBERS: Every number in your bullets must appear in the FACTS, the description, or the README. NEVER invent user counts, request volumes, latencies ("sub-100ms"), percentages, uptime, accuracy, or speedups. A bullet with no number is far better than a bullet with a made-up one — this goes on a real person's resume and will be questioned in interviews.
6. NEVER fabricate features that aren't evidenced by the description or README.
7. Avoid empty filler words recruiters skim past: robust, seamless(ly), cutting-edge, state-of-the-art, production-grade, high-performance, scalable, comprehensive, end-to-end, leveraging, innovative. Say what the thing does instead.

=== TONE/STYLE ===
${toneGuide}

=== TECH STACK CORRECTION ===
Based on the README and description, also return a corrected tech stack array. Include only frameworks, databases, APIs, and tools the project actually uses (not ones it merely mentions, e.g. "works with ChatGPT pages" does not mean it uses the OpenAI API).

=== RESPONSE FORMAT ===
Return ONLY a valid JSON object (no markdown codeblock wrapper):
{
  "bullets": ["bullet1...", "bullet2...", "bullet3..."],
  "correctedTechStack": ["React", "Node.js", "PostgreSQL", "etc..."]
}`;
}

/**
 * Numbers in the bullets that don't appear anywhere in the source material.
 * Ignores digits that are part of names like "S3", "OAuth2" or "GPT-4",
 * but still catches "sub-100ms".
 */
export function findUnbackedNumbers(bullets, input) {
  const normalize = (s) => s.replace(/,/g, '');
  const sourceNumbers = new Set((normalize(factSources(input)).match(/\d+(?:\.\d+)?/g) || []));
  const unbacked = new Set();
  for (const bullet of bullets) {
    const text = normalize(bullet);
    const matches = text.matchAll(/(?<![A-Za-z0-9.])(\d+(?:\.\d+)?)(\s*(?:%|\+|k\b|K\b|ms\b|x\b|s\b|seconds?\b|users?\b|M\b))?/g);
    for (const m of matches) {
      if (/[A-Z]{2,}-$/.test(text.slice(Math.max(0, m.index - 6), m.index))) continue; // GPT-4, ES-6
      if (!sourceNumbers.has(m[1])) unbacked.add((m[1] + (m[2] || '')).trim());
    }
  }
  return [...unbacked];
}

// ─── Output cleanup and tech-stack evidence ──────────────────

// gpt-oss and some Gemini outputs use typographic hyphens/spaces that look
// wrong pasted into Word or LaTeX
function normalizeText(s) {
  return String(s)
    .replace(/[‐‑‒]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBulletJson(rawText) {
  const cleanedText = String(rawText || '').replace(/```json/g, '').replace(/```/g, '').trim();
  const shape = (bullets, techStack = []) => ({
    bullets: bullets.map(normalizeText).filter(Boolean),
    techStack: Array.isArray(techStack) ? techStack.map(normalizeText).filter(Boolean) : []
  });
  try {
    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed?.bullets) && parsed.bullets.length > 0) return shape(parsed.bullets, parsed.correctedTechStack);
    if (Array.isArray(parsed) && parsed.length > 0) return shape(parsed);
  } catch {
    const objectMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (Array.isArray(parsed?.bullets) && parsed.bullets.length > 0) return shape(parsed.bullets, parsed.correctedTechStack);
      } catch { /* fall through */ }
    }
  }
  return null;
}

/**
 * Keep the AI's tech-stack suggestions only when the repo shows evidence of
 * them, and never drop what the manifests confirmed.
 */
export function mergeTechStack(aiStack, input) {
  const evidence = [input.readmeText, input.description, input.name, (input.topics || []).join(' '), (input.detected_deps || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();
  const confirmed = input.confirmed_deps || [];
  const coreToken = (tech) => tech.toLowerCase()
    .replace(/\b(api|sdk|framework|library|js)\b/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .trim()
    .split(/[\s/]+/)
    .filter(t => t.length > 1)[0] || tech.toLowerCase();
  const seen = new Set();
  const merged = [];
  const add = (tech) => {
    const key = tech.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(tech);
  };
  for (const tech of aiStack || []) {
    const token = coreToken(tech).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?<![a-z0-9])${token}`).test(evidence)) add(tech);
  }
  for (const tech of confirmed) add(tech);
  return merged;
}

// ─── Providers ───────────────────────────────────────────────

/**
 * Each provider turns a prompt into raw JSON text. Order matters: Groq answers
 * in about a second; Gemini is the fallback (and the only option for a
 * visitor's own key, which is a Gemini key).
 */
const PROVIDERS = {
  groq: {
    label: 'Groq',
    models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    timeoutMs: 20000,
    async request(model, prompt, apiKey, fetchImpl, signal) {
      const res = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          // Groq counts max_tokens against its per-minute token limit up front
          // (8,000 TPM on the free tier); three bullets need ~300
          max_tokens: 1024,
          response_format: { type: 'json_object' },
          ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, message: data?.error?.message, text: data?.choices?.[0]?.message?.content };
    }
  },
  gemini: {
    label: 'Gemini',
    // gemini-2.0-flash and the 1.5 models are retired (404)
    models: ['gemini-3.8-flash', 'gemini-3.5-flash-lite'],
    timeoutMs: 30000,
    modelTimeoutMs: { 'gemini-3.8-flash': 20000, 'gemini-3.5-flash-lite': 40000 },
    async request(model, prompt, apiKey, fetchImpl, signal) {
      const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // Headroom for models that spend output tokens on thinking
          generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 4096, responseMimeType: 'application/json' }
        })
      });
      const data = await res.json().catch(() => ({}));
      // Thinking models can return thought parts ahead of the answer
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .filter(part => !part.thought && typeof part.text === 'string')
        .map(part => part.text)
        .join('');
      return { ok: res.ok, status: res.status, message: data?.error?.message, text };
    }
  }
};

export const DEFAULT_PROVIDER_ORDER = ['groq', 'gemini'];

// After a model returns 503/429 or times out, skip it for a while so every
// following request doesn't pay the same wait (shared per tab / server instance)
const COOLDOWN_MS = 120000;
const RATE_LIMIT_COOLDOWN_MS = 30000;
const cooldownUntil = new Map();
const isCoolingDown = (id) => (cooldownUntil.get(id) || 0) > Date.now();

/**
 * Send one prompt through the providers in order, trying each model.
 * `only` pins the call to one provider/model (used for the corrective pass).
 * @returns {Promise<{bullets, techStack, provider, model}>}
 */
async function callProviders(prompt, keys, fetchImpl, order, only = null) {
  const errors = [];
  const attempts = [];
  for (const providerId of order) {
    const provider = PROVIDERS[providerId];
    if (!provider || !keys[providerId]) continue;
    for (const model of provider.models) {
      if (only && (only.provider !== providerId || only.model !== model)) continue;
      attempts.push({ providerId, model });
    }
  }
  // Skip cooling-down models, unless that would leave nothing to try
  const fresh = attempts.filter(a => !isCoolingDown(`${a.providerId}:${a.model}`));
  const toTry = fresh.length > 0 ? fresh : attempts;
  const rejectedProviders = new Set();

  for (const { providerId, model } of toTry) {
    if (rejectedProviders.has(providerId)) continue;
    const provider = PROVIDERS[providerId];
    const id = `${providerId}:${model}`;
    const timeoutMs = provider.modelTimeoutMs?.[model] || provider.timeoutMs;

    // A busy model may answer 503 right away; one quick retry often gets through
    for (let attempt = 0; attempt < 2; attempt++) {
      // A model can also queue a request for minutes instead of returning 503,
      // so give up after a while and let the next one try
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await provider.request(model, prompt, keys[providerId], fetchImpl, controller.signal);
        if (res.ok) {
          const parsed = parseBulletJson(res.text);
          if (parsed) return { ...parsed, provider: providerId, model };
          errors.push(`${provider.label} (${model}) returned a response that could not be parsed.`);
          break;
        }
        const msg = res.message || `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403 || /api key/i.test(msg)) {
          // Bad, revoked or leaked key: every model of this provider fails the same way
          rejectedProviders.add(providerId);
          errors.push(`${provider.label} rejected the API key: ${msg}`);
          break;
        }
        errors.push(`${provider.label} (${model}): ${msg}`);
        if (res.status === 503 && attempt === 0) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        // Rate limits (429) reset within a minute; overload (503) tends to last longer
        if (res.status === 429) cooldownUntil.set(id, Date.now() + RATE_LIMIT_COOLDOWN_MS);
        if (res.status === 503) cooldownUntil.set(id, Date.now() + COOLDOWN_MS);
        break;
      } catch (err) {
        if (err.name === 'AbortError') {
          cooldownUntil.set(id, Date.now() + COOLDOWN_MS);
          errors.push(`${provider.label} (${model}) timed out after ${timeoutMs / 1000}s.`);
        } else {
          errors.push(`${provider.label} (${model}): ${err.message}`);
        }
        break;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  const err = new Error(errors.length > 0 ? errors[errors.length - 1] : 'No AI provider is configured.');
  err.allErrors = errors;
  err.keyRejected = rejectedProviders.size > 0 && rejectedProviders.size === new Set(toTry.map(a => a.providerId)).size;
  throw err;
}

/**
 * Generate bullets with whichever configured provider answers first,
 * rejecting numbers that aren't backed by the repo's facts.
 * @param {Object} input - plain repo fields (name, description, language, detected_deps,
 *   confirmed_deps, topics, stargazers_count, forks_count, commits_count, readmeText)
 * @param {Object} options - { tone, jdKeywords, customInstruction, keys: { groq, gemini }, order, fetchImpl }
 * @returns {Promise<{bullets, techStack, provider, model, unverified: string[]}>}
 */
export async function generateWithAI(input, { tone = 'xyz', jdKeywords = [], customInstruction = '', keys = {}, order = DEFAULT_PROVIDER_ORDER, fetchImpl = fetch }) {
  const facts = { ...input, customInstruction };
  const prompt = buildPrompt(input, tone, jdKeywords, customInstruction);
  let result = await callProviders(prompt, keys, fetchImpl, order);
  let unverified = findUnbackedNumbers(result.bullets, facts);

  if (unverified.length > 0) {
    // One corrective pass: name the invented numbers and ask for a rewrite without them
    const retryPrompt = `${prompt}\n\n=== CORRECTION ===\nYour previous answer used numbers that are not in the FACTS, description, or README: ${unverified.join(', ')}. Rewrite all 3 bullets without any of them. Previous answer:\n${JSON.stringify({ bullets: result.bullets })}`;
    try {
      // Reuse the model that just answered rather than re-queueing on a busy one
      const retry = await callProviders(retryPrompt, keys, fetchImpl, order, { provider: result.provider, model: result.model });
      const retryUnverified = findUnbackedNumbers(retry.bullets, facts);
      if (retryUnverified.length < unverified.length) {
        result = { ...retry, techStack: retry.techStack.length ? retry.techStack : result.techStack };
        unverified = retryUnverified;
      }
    } catch {
      // Keep the first answer; its unverified numbers are reported to the user
    }
  }

  return { ...result, techStack: mergeTechStack(result.techStack, input), unverified };
}
