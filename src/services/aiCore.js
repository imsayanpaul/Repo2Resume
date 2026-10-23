/**
 * AI bullet generation shared by the browser (a visitor's own Gemini key) and
 * the /api/generate serverless function (the deployment's Groq/Gemini keys).
 * Same prompt, fact list and number checks for every provider. No browser APIs here.
 */

// Repo stats below these sizes undersell a project ("2 GitHub stars"), so the
// AI is never offered them and the number check rejects them
export const MIN_STARS_TO_CITE = 25;
export const MIN_FORKS_TO_CITE = 10;
export const MIN_COMMITS_TO_CITE = 20;
export const MAX_BULLET_WORDS = 40;

const TONE_INSTRUCTIONS = {
  xyz: `Google XYZ Formula — each bullet carries three things: what was built (X), its concrete scope or result (Y), and how it was built (Z).
    - Convey the formula; never write the literal words "Accomplished" or "as measured by"
    - Y comes from the README: what it handles, which formats or integrations it supports, what a user can now do. Repository statistics are not results
    Example: "Built an AI career assistant that scores resumes against live job postings and exports to PDF, LaTeX and Overleaf, using React, Express and the Gemini API."`,

  star: `STAR Method — Each bullet should cover:
    - Situation/Task: What challenge or need the project addresses
    - Action: What you specifically built/engineered
    - Result: what the project now does for its user, as the README describes it
    Example: "Replaced retyping the same details into every application with a React and Express assistant that scores resumes against postings and drafts tailored cover letters."`,

  technical: `Technical Depth — Focus on architecture, engineering decisions, and system design:
    - Emphasize design patterns, protocols, data flow, and infrastructure that the README, files or dependencies show
    - Describe how components connect rather than claiming performance numbers
    Example: "Designed a FastAPI service that ingests Instagram DMs via webhook, transcribes audio with Whisper, and stores summaries in PostgreSQL through SQLAlchemy."`,

  ats: `ATS Minimal — Concise, keyword-rich bullets optimized for Applicant Tracking Systems:
    - Start with strong action verbs (Architected, Engineered, Deployed, Built)
    - Pack in relevant technologies naturally
    - Keep each bullet to one line, about 15-20 words
    Example: "Built AI career assistant with React, Express, Supabase, and Gemini API; added ATS resume scoring and cover letter generation."`
};

const citableStars = (input) => (input.stargazers_count >= MIN_STARS_TO_CITE ? input.stargazers_count : null);
const citableForks = (input) => (input.forks_count >= MIN_FORKS_TO_CITE ? input.forks_count : null);
const citableCommits = (input) => (typeof input.commits_count === 'number' && input.commits_count >= MIN_COMMITS_TO_CITE ? input.commits_count : null);

/**
 * Text the bullets are allowed to draw numbers from. Small repo stats are
 * left out on purpose, so a bullet citing "2 stars" fails the number check.
 */
function factSources(input) {
  return [
    input.name, input.description, input.readmeText, input.customInstruction,
    (input.detected_deps || []).join(' '), (input.topics || []).join(' '),
    (input.commit_subjects || []).join(' '),
    [citableStars(input), citableForks(input), citableCommits(input)].filter(v => v !== null).join(' ')
  ].filter(Boolean).join(' \n ');
}

function buildFactsList(input) {
  const facts = [];
  if (citableCommits(input) !== null) facts.push(`${input.commits_count} commits by the author`);
  if (citableStars(input) !== null) facts.push(`${input.stargazers_count} GitHub stars`);
  if (citableForks(input) !== null) facts.push(`${input.forks_count} forks`);
  return facts.length > 0 ? facts.join('; ') : 'None (do not cite any repository statistics)';
}

/**
 * "thin" when there's little to go on: no real README and few commit messages.
 * The prompt then asks for modest bullets, and the UI tells the user to review them.
 */
export function evidenceLevel(input) {
  const readmeLength = (input.readmeText || '').replace(/\s+/g, ' ').trim().length;
  if (readmeLength >= 400) return 'rich';
  if ((input.commit_subjects || []).length >= 5) return 'partial';
  return 'thin';
}

export function buildPrompt(input, tone, jdKeywords = [], customInstruction = '') {
  const toneGuide = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.xyz;
  const level = evidenceLevel(input);
  const commits = (input.commit_subjects || []).slice(0, 25);
  const files = (input.top_level_files || []).slice(0, 30);

  return `You are an elite technical resume writer who has reviewed 10,000+ engineering resumes at FAANG companies.

YOUR TASK: Write 3 high-impact resume bullet points for a software engineering project. These bullets will appear under "PROJECTS" on a resume.

=== PROJECT INFORMATION ===
Repository Name: ${input.name}
Description: ${input.description || 'Not provided'}
Primary Language: ${input.language || 'Not specified'}
Detected Dependencies/Frameworks (partly guessed from keywords; trust the README over this list): ${(input.detected_deps || []).join(', ') || 'Not detected'}
GitHub Topics/Tags: ${(input.topics || []).join(', ') || 'None'}
${files.length > 0 ? `Top-level files and folders: ${files.join(', ')}` : ''}

=== REPOSITORY STATISTICS (background only) ===
${buildFactsList(input)}
These show effort, not impact. Mention at most one of them, at most once across all bullets, and never as the result or measure of a bullet.
${input.readmeText ? `\n=== README CONTENT (analyze this carefully for features, architecture, and purpose) ===\n${input.readmeText.slice(0, 2000)}` : '\n=== README ===\nNone. The repository has no usable README.'}
${commits.length > 0 ? `\n=== RECENT COMMIT MESSAGES BY THE AUTHOR (evidence of what was built) ===\n${commits.map(c => `- ${c}`).join('\n')}` : ''}
${jdKeywords.length > 0 ? `\n=== TARGET JOB KEYWORDS (weave in only those the project actually uses) ===\n${jdKeywords.join(', ')}` : ''}
${customInstruction ? `\n=== USER'S SPECIFIC INSTRUCTION ===\n${customInstruction}` : ''}
${level === 'thin' ? `\n=== LIMITED EVIDENCE ===\nThis repository has very little information. Describe ONLY what the description, file names and commit messages state. Keep every bullet short and plain. Do not guess at architecture, features or integrations that aren't named above.\n` : ''}
=== CRITICAL RULES ===
1. READ THE DESCRIPTION, README AND COMMIT MESSAGES CAREFULLY. Your bullets must describe what THIS SPECIFIC project actually does — its real features, its real purpose, its real user value. Do NOT write generic filler.
2. LENGTH: every bullet is at most 30 words (the first may run to 35). One idea per bullet. Do not repeat the project name after the first bullet.
3. The FIRST bullet summarizes what the project is and its core features. Bullets 2 and 3 highlight specific technical work or architecture decisions.
4. Use the ACTUAL tech stack from the repo. If the README mentions specific technologies, include those — not just the primary language.
5. NUMBERS: Every number in your bullets must appear in the statistics, the description, the README or the commit messages. NEVER invent user counts, request volumes, latencies ("sub-100ms"), percentages, uptime, accuracy, or speedups. A bullet with no number is far better than a bullet with a made-up one — this goes on a real person's resume and will be questioned in interviews.
6. NEVER fabricate features that aren't evidenced by the description, README, files or commit messages.
7. NO UNPROVEN OUTCOMES: don't claim the project improves, boosts, increases, reduces, speeds up or saves anything (e.g. "improving ATS pass rates", "fast form-filling") unless the README says so. Describe what it does, not what it supposedly achieves.
8. Avoid empty filler words recruiters skim past: robust, seamless(ly), cutting-edge, state-of-the-art, production-grade, high-performance, scalable, comprehensive, end-to-end, leveraging, innovative. Never open a bullet with "Accomplished". Start each bullet with a different action verb.

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

const OUTCOME_CLAIM = /\b(improv(e|es|ed|ing)|boost(s|ed|ing)?|increas(e|es|ed|ing)|reduc(e|es|ed|ing)|cut(s|ting)?|sav(e|es|ed|ing)|speed(s|ing)? up|accelerat(e|es|ed|ing)|faster|enhanc(e|es|ed|ing)|optimiz(e|es|ed|ing))\b[^.;]{0,40}\b(rates?|time|times|productivity|efficiency|performance|conversion|engagement|throughput|latency|speed|accuracy|callbacks?|pass)\b/i;

/**
 * Style problems the prompt asks the model to avoid, checked so a bad answer
 * gets one corrective pass. Each entry is a short instruction for the retry.
 */
export function findStyleIssues(bullets, input) {
  const issues = [];
  const text = bullets.join(' \n ');
  const evidence = `${input.readmeText || ''} ${input.description || ''}`;
  bullets.forEach((b, i) => {
    const words = b.split(/\s+/).filter(Boolean).length;
    if (words > MAX_BULLET_WORDS) issues.push(`bullet ${i + 1} has ${words} words; cut it to 30 or fewer`);
    if (/^accomplished\b/i.test(b.trim())) issues.push(`bullet ${i + 1} opens with "Accomplished"; use a concrete action verb`);
  });
  if (/as measured by/i.test(text)) issues.push('remove the phrase "as measured by"');
  const statMentions = (text.match(/\b\d[\d,]*\+?\s+(commits?|stars?|forks?)\b/gi) || []).length;
  if (statMentions > 1) issues.push('repository statistics appear more than once; keep at most one mention');
  if (/\b(measured|proven|demonstrated|evidenced)\b[^.;]{0,30}\b(commits?|stars?)\b/i.test(text)) issues.push('commit or star counts are used as a measure of impact; describe what the project does instead');
  const claim = text.match(OUTCOME_CLAIM);
  if (claim && !evidence.toLowerCase().includes(claim[0].toLowerCase())) issues.push(`unproven outcome claim "${claim[0]}"; describe what it does instead`);
  const filler = text.match(FILLER_WORDS);
  if (filler) issues.push(`remove the filler word "${filler[0]}"`);
  return issues;
}

const FILLER_WORDS = /\b(robust|seamless(ly)?|cutting-edge|state-of-the-art|production-grade|high-performance|comprehensive|leverag(e|es|ed|ing)|innovative|best-in-class|world-class)\b/i;

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
 * rejecting numbers that aren't backed by the repo's facts and the style
 * problems findStyleIssues names (length, "Accomplished", stats as impact,
 * unproven outcome claims).
 * @param {Object} input - plain repo fields (name, description, language, detected_deps,
 *   confirmed_deps, topics, stargazers_count, forks_count, commits_count, readmeText,
 *   commit_subjects, top_level_files)
 * @param {Object} options - { tone, jdKeywords, customInstruction, keys: { groq, gemini }, order, fetchImpl }
 * @returns {Promise<{bullets, techStack, provider, model, unverified: string[], styleIssues: string[], evidence}>}
 */
export async function generateWithAI(input, { tone = 'xyz', jdKeywords = [], customInstruction = '', keys = {}, order = DEFAULT_PROVIDER_ORDER, fetchImpl = fetch }) {
  const facts = { ...input, customInstruction };
  const prompt = buildPrompt(input, tone, jdKeywords, customInstruction);
  const check = (bullets) => ({ unverified: findUnbackedNumbers(bullets, facts), styleIssues: findStyleIssues(bullets, input) });
  const problemCount = (c) => c.unverified.length * 3 + c.styleIssues.length; // invented numbers matter most

  let result = await callProviders(prompt, keys, fetchImpl, order);
  let checked = check(result.bullets);

  if (problemCount(checked) > 0) {
    // One corrective pass naming every problem found
    const problems = [
      ...(checked.unverified.length ? [`these numbers are not in the statistics, description, README or commits: ${checked.unverified.join(', ')}`] : []),
      ...checked.styleIssues
    ];
    const retryPrompt = `${prompt}\n\n=== CORRECTION ===\nYour previous answer had these problems:\n${problems.map(p => `- ${p}`).join('\n')}\nRewrite all 3 bullets fixing every one. Previous answer:\n${JSON.stringify({ bullets: result.bullets })}`;
    try {
      // Reuse the model that just answered rather than re-queueing on a busy one
      const retry = await callProviders(retryPrompt, keys, fetchImpl, order, { provider: result.provider, model: result.model });
      const retryChecked = check(retry.bullets);
      if (problemCount(retryChecked) < problemCount(checked)) {
        result = { ...retry, techStack: retry.techStack.length ? retry.techStack : result.techStack };
        checked = retryChecked;
      }
    } catch {
      // Keep the first answer; its remaining problems are reported to the user
    }
  }

  return { ...result, techStack: mergeTechStack(result.techStack, input), ...checked, evidence: evidenceLevel(input) };
}
