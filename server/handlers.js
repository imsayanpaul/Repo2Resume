/**
 * Server-side handlers shared by the Vercel functions in /api and the Vite
 * dev middleware. Keys come from server env vars (GEMINI_API_KEY, GITHUB_TOKEN),
 * which are never compiled into the client bundle.
 *
 * Each handler returns { status, json } or { status, body, headers }.
 */
import { generateWithGemini } from '../src/services/geminiCore.js';

const TONES = new Set(['xyz', 'star', 'technical', 'ats']);

export function handleConfig(env) {
  return {
    status: 200,
    json: { serverGemini: Boolean(env.GEMINI_API_KEY), serverGithub: Boolean(env.GITHUB_TOKEN) }
  };
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const strList = (v, maxItems, maxLen) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, maxItems).map(x => x.slice(0, maxLen)) : []);
const num = (v) => (Number.isFinite(v) ? v : null);

/**
 * POST /api/gemini  { repo, tone, jdKeywords, customInstruction }
 * The prompt is built here, so the endpoint can only generate resume bullets,
 * not act as a general-purpose proxy for the deployment's key.
 */
export async function handleGemini(body, env) {
  if (!env.GEMINI_API_KEY) {
    return { status: 503, json: { error: 'AI generation is not configured on this deployment. Add your own Gemini API key in Settings.' } };
  }
  const repo = body?.repo;
  if (!repo || typeof repo !== 'object' || !str(repo.name, 100)) {
    return { status: 400, json: { error: 'Missing repository data.' } };
  }

  const input = {
    name: str(repo.name, 100),
    description: str(repo.description, 1000),
    language: str(repo.language, 40),
    detected_deps: strList(repo.detected_deps, 40, 60),
    topics: strList(repo.topics, 20, 50),
    stargazers_count: num(repo.stargazers_count) ?? 0,
    forks_count: num(repo.forks_count) ?? 0,
    commits_count: num(repo.commits_count),
    readmeText: str(repo.readmeText, 2000)
  };

  try {
    const result = await generateWithGemini(input, {
      tone: TONES.has(body.tone) ? body.tone : 'xyz',
      jdKeywords: strList(body.jdKeywords, 30, 40),
      customInstruction: str(body.customInstruction, 300),
      apiKey: env.GEMINI_API_KEY
    });
    return { status: 200, json: result };
  } catch (err) {
    // A rejected deployment key is the operator's problem, not the visitor's
    const message = err.fatal ? 'The AI service key on this deployment was rejected. Add your own Gemini API key in Settings.' : err.message;
    return { status: 502, json: { error: message } };
  }
}

// The only GitHub reads the app makes
const GITHUB_PATHS = [
  /^\/users\/[A-Za-z0-9-]{1,39}$/,
  /^\/users\/[A-Za-z0-9-]{1,39}\/repos\?sort=updated&per_page=100&page=[1-5]$/,
  /^\/repos\/[\w.-]{1,100}\/[\w.-]{1,100}\/contents\/[\w.\-/]{0,200}$/,
  /^\/repos\/[\w.-]{1,100}\/[\w.-]{1,100}\/commits\?per_page=1(&author=[A-Za-z0-9-]{1,39})?$/
];

/**
 * GET /api/github?path=/repos/owner/name/contents/
 * Forwards an allowlisted read using the deployment's token, so visitors share
 * a 5,000/hour limit instead of each getting 60/hour from their own IP.
 */
export async function handleGithub(query, env) {
  const path = typeof query.path === 'string' ? query.path : '';
  if (!GITHUB_PATHS.some(re => re.test(path)) || path.includes('..')) {
    return { status: 400, json: { error: 'Unsupported GitHub path.' } };
  }

  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'Repo2Resume' };
  if (env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${path}`, { headers });
  const passHeaders = {};
  for (const h of ['content-type', 'link', 'x-ratelimit-remaining']) {
    const v = res.headers.get(h);
    if (v) passHeaders[h] = v;
  }
  return { status: res.status, body: await res.text(), headers: passHeaders };
}

/**
 * Write a handler result to a Node http.ServerResponse
 */
export function sendResult(res, result) {
  if (result.json !== undefined) {
    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.json));
    return;
  }
  res.statusCode = result.status;
  for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v);
  res.end(result.body);
}
