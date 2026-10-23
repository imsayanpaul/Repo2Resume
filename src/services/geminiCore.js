/**
 * Gemini bullet generation shared by the browser (user's own key) and the
 * /api/gemini serverless function (deployment's key). No browser APIs here.
 */

// gemini-2.0-flash and the 1.5 models are retired (404); the API points callers to these.
// Flash writes better bullets but is often overloaded, so it gets a shorter leash.
export const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
const MODEL_TIMEOUT_MS = { 'gemini-3.8-flash': 20000, 'gemini-3.5-flash-lite': 40000 };

// After a model returns 503 or times out, skip it for a while so every
// following request doesn't pay the same wait (shared per tab / server instance)
const COOLDOWN_MS = 120000;
const cooldownUntil = new Map();
const isCoolingDown = (model) => (cooldownUntil.get(model) || 0) > Date.now();

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

export function buildGeminiPrompt(input, tone, jdKeywords = [], customInstruction = '') {
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

function parseGeminiJson(data) {
  // Thinking models can return thought parts ahead of the answer, so keep only answer text
  const rawText = (data?.candidates?.[0]?.content?.parts || [])
    .filter(part => !part.thought && typeof part.text === 'string')
    .map(part => part.text)
    .join('');
  const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleanedText);
    if (Array.isArray(parsed?.bullets) && parsed.bullets.length > 0) {
      return { bullets: parsed.bullets.map(String), techStack: Array.isArray(parsed.correctedTechStack) ? parsed.correctedTechStack.map(String) : [] };
    }
    if (Array.isArray(parsed) && parsed.length > 0) return { bullets: parsed.map(String), techStack: [] };
  } catch {
    const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const arr = JSON.parse(arrayMatch[0]);
        if (Array.isArray(arr) && arr.length > 0) return { bullets: arr.map(String), techStack: [] };
      } catch { /* fall through */ }
    }
  }
  return null;
}

/**
 * Send one prompt, trying each model in turn.
 * @returns {Promise<{bullets, techStack, model}>}
 */
async function callGemini(prompt, apiKey, fetchImpl, models = GEMINI_MODELS) {
  let lastError = null;
  // Skip cooling-down models, unless that would leave nothing to try
  const available = models.filter(m => !isCoolingDown(m));
  const toTry = available.length > 0 ? available : models;

  for (const model of toTry) {
    const timeoutMs = MODEL_TIMEOUT_MS[model] || 30000;
    // A busy model may answer 503 right away; one quick retry often gets through
    for (let attempt = 0; attempt < 2; attempt++) {
      // Under high demand a model can also queue a request for minutes instead of
      // returning 503, so give up after a while and let the next model try
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
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
          const parsed = parseGeminiJson(await response.json());
          if (parsed) return { ...parsed, model };
          lastError = new Error(`Gemini (${model}) returned a response that could not be parsed.`);
          break;
        }

        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${response.status}`;
        if (response.status === 401 || response.status === 403 || /api key/i.test(msg)) {
          // Bad, revoked or leaked key: every model will fail the same way
          const keyErr = new Error(`Gemini rejected the API key: ${msg} Update it in Settings.`);
          keyErr.fatal = true;
          throw keyErr;
        }
        if (response.status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
          lastError = new Error('Gemini API quota exhausted or rate limited. Try again later or use a different Gemini API key in Settings.');
          break;
        }
        lastError = new Error(`Gemini (${model}): ${msg}`);
        if (response.status === 503) {
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
        }
        break;
      } catch (err) {
        if (err.fatal) throw err;
        if (err.name === 'AbortError') {
          cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
          lastError = new Error(`Gemini (${model}) timed out after ${timeoutMs / 1000}s.`);
        } else {
          lastError = err;
        }
        break;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw lastError || new Error('Could not parse valid response from Gemini API');
}

/**
 * Generate bullets, rejecting numbers that aren't backed by the repo's facts.
 * @param {Object} input - plain repo fields (name, description, language, detected_deps,
 *   topics, stargazers_count, forks_count, commits_count, readmeText)
 * @returns {Promise<{bullets, techStack, model, unverified: string[]}>}
 */
export async function generateWithGemini(input, { tone = 'xyz', jdKeywords = [], customInstruction = '', apiKey, fetchImpl = fetch }) {
  const facts = { ...input, customInstruction };
  const prompt = buildGeminiPrompt(input, tone, jdKeywords, customInstruction);
  let result = await callGemini(prompt, apiKey, fetchImpl);
  let unverified = findUnbackedNumbers(result.bullets, facts);

  if (unverified.length > 0) {
    // One corrective pass: name the invented numbers and ask for a rewrite without them
    const retryPrompt = `${prompt}\n\n=== CORRECTION ===\nYour previous answer used numbers that are not in the FACTS, description, or README: ${unverified.join(', ')}. Rewrite all 3 bullets without any of them. Previous answer:\n${JSON.stringify({ bullets: result.bullets })}`;
    try {
      // Reuse the model that just answered rather than re-queueing on a busy one
      const retry = await callGemini(retryPrompt, apiKey, fetchImpl, [result.model]);
      const retryUnverified = findUnbackedNumbers(retry.bullets, facts);
      if (retryUnverified.length < unverified.length) {
        result = { ...retry, techStack: retry.techStack.length ? retry.techStack : result.techStack };
        unverified = retryUnverified;
      }
    } catch {
      // Keep the first answer; its unverified numbers are reported to the user
    }
  }

  return { ...result, unverified };
}
