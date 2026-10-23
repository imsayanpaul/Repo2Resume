#!/usr/bin/env node
/**
 * Compare bullet engines on a fixed set of real repositories.
 *
 *   npm run eval
 *   npm run eval -- --engines template,groq --tone ats --repos imsayanpaul/Reeldex
 *
 * Reads GROQ_API_KEY, GEMINI_API_KEY and GITHUB_TOKEN from .env.local.
 * Every metric is computed against the repo's own evidence (README,
 * description, topics, manifest dependencies), so "better" means more
 * specific and more truthful, not just longer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchRepo, enrichRepoDetails, knownTechNames } from '../src/services/github.js';
import { generateTemplateBullets, toAiInput } from '../src/services/resumeEngine.js';
import { generateWithAI, findUnbackedNumbers } from '../src/services/aiCore.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// A mix of rich and sparse READMEs, apps and libraries
const DEFAULT_REPOS = [
  'imsayanpaul/Appliqa',
  'imsayanpaul/Reeldex',
  'imsayanpaul/scrollmark',
  'imsayanpaul/sequential-paste',
  'imsayanpaul/Repo2Resume',
  'imsayanpaul/Portfolio',
  'imsayanpaul/Login-Page',
  'imsayanpaul/AI-Interview-System',
  'sindresorhus/slugify',
  'tiangolo/typer'
];

const FILLER = [
  'robust', 'seamless', 'seamlessly', 'cutting-edge', 'state-of-the-art', 'production-grade', 'world-class',
  'high-performance', 'scalable', 'efficient', 'efficiently', 'leveraging', 'synergy', 'best-in-class',
  'innovative', 'comprehensive', 'end-to-end', 'enterprise-grade', 'blazing'
];

const STOPWORDS = new Set(('about above after again against their there these those which while with within without would ' +
  'using built build project application developed designed engineered implemented created users user github repository ' +
  'features feature across through support supports including other where could should every first using based').split(' '));

function loadEnv() {
  const env = {};
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function parseArgs(argv) {
  const args = { engines: ['template', 'groq', 'gemini'], tone: 'xyz', repos: DEFAULT_REPOS, out: null };
  for (let i = 0; i < argv.length; i++) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === '--engines') { args.engines = value.split(','); i++; }
    else if (flag === '--tone') { args.tone = value; i++; }
    else if (flag === '--repos') { args.repos = value.split(','); i++; }
    else if (flag === '--out') { args.out = value; i++; }
  }
  return args;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, term) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(term)}(?![A-Za-z0-9])`, 'i').test(text);

function score(bullets, repo, vocabulary) {
  const text = bullets.join(' ');
  const evidence = [repo.readmeText, repo.description, repo.name, (repo.topics || []).join(' '), (repo.detected_deps || []).join(' '), (repo.readme_features || []).join(' ')]
    .filter(Boolean).join(' ');
  const evidenceWords = new Set((evidence.toLowerCase().match(/[a-z][a-z-]{4,}/g) || []).filter(w => !STOPWORDS.has(w)));
  const bulletWords = new Set((text.toLowerCase().match(/[a-z][a-z-]{4,}/g) || []).filter(w => !STOPWORDS.has(w)));

  return {
    unbackedNumbers: findUnbackedNumbers(bullets, { ...toAiInput(repo) }),
    // Tech the bullets name that nothing in the repo mentions
    unsupportedTech: vocabulary.filter(t => mentions(text, t) && !mentions(evidence, t)),
    // Distinctive words shared with the repo's own text: a proxy for "says something specific"
    specificity: [...bulletWords].filter(w => evidenceWords.has(w)).length,
    filler: FILLER.filter(f => mentions(text, f)),
    words: Math.round(text.split(/\s+/).length / Math.max(bullets.length, 1))
  };
}

async function runEngine(engine, repo, tone, env) {
  const started = Date.now();
  if (engine === 'template') {
    return { bullets: generateTemplateBullets(repo, tone).bullets, model: 'template', ms: Date.now() - started };
  }
  const keys = { [engine]: env[engine === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'] };
  if (!keys[engine]) return { error: `no ${engine.toUpperCase()}_API_KEY`, ms: 0 };
  try {
    const r = await generateWithAI(toAiInput(repo), { tone, keys, order: [engine] });
    return { bullets: r.bullets, model: r.model, ms: Date.now() - started };
  } catch (err) {
    return { error: err.message, ms: Date.now() - started };
  }
}

const pad = (v, n) => String(v).padEnd(n);

async function main() {
  const env = loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const vocabulary = knownTechNames();
  const rows = [];

  console.log(`Evaluating ${args.repos.length} repos × [${args.engines.join(', ')}], tone=${args.tone}\n`);
  for (const fullName of args.repos) {
    let repo;
    try {
      repo = await fetchRepo(fullName, env.GITHUB_TOKEN);
      await enrichRepoDetails(repo, env.GITHUB_TOKEN);
    } catch (err) {
      console.log(`${fullName}: skipped (${err.message})`);
      continue;
    }
    // Engines run in parallel per repo; repos run one after another
    const results = await Promise.all(args.engines.map(e => runEngine(e, repo, args.tone, env)));
    console.log(`── ${fullName}  (README features: ${(repo.readme_features || []).length}, deps: ${repo.detected_deps.length}, commits: ${repo.commits_count ?? '?'})`);
    args.engines.forEach((engine, i) => {
      const r = results[i];
      if (r.error) {
        console.log(`   ${pad(engine, 9)} ERROR ${r.error.slice(0, 100)}`);
        rows.push({ repo: fullName, engine, error: r.error });
        return;
      }
      const s = score(r.bullets, repo, vocabulary);
      rows.push({ repo: fullName, engine, model: r.model, ms: r.ms, ...s, bullets: r.bullets });
      const flags = [
        s.unbackedNumbers.length ? `invented numbers: ${s.unbackedNumbers.join(', ')}` : '',
        s.unsupportedTech.length ? `unsupported tech: ${s.unsupportedTech.join(', ')}` : '',
        s.filler.length ? `filler: ${s.filler.join(', ')}` : ''
      ].filter(Boolean).join(' | ');
      console.log(`   ${pad(engine, 9)} specific=${pad(s.specificity, 3)} words/bullet=${pad(s.words, 3)} ${pad(r.ms + 'ms', 8)} ${flags}`);
    });
  }

  // Summary per engine
  console.log('\n══ Summary (averages per repo; lower is better for the last three) ══');
  console.log(`${pad('engine', 10)}${pad('ok', 6)}${pad('specific', 10)}${pad('words', 7)}${pad('latency', 10)}${pad('inv.nums', 10)}${pad('bad tech', 10)}filler`);
  for (const engine of args.engines) {
    const ok = rows.filter(r => r.engine === engine && !r.error);
    const all = rows.filter(r => r.engine === engine);
    const avg = (f) => (ok.length ? (ok.reduce((a, r) => a + f(r), 0) / ok.length) : 0);
    console.log(
      pad(engine, 10) + pad(`${ok.length}/${all.length}`, 6) + pad(avg(r => r.specificity).toFixed(1), 10) +
      pad(avg(r => r.words).toFixed(0), 7) + pad(`${(avg(r => r.ms) / 1000).toFixed(1)}s`, 10) +
      pad(avg(r => r.unbackedNumbers.length).toFixed(2), 10) + pad(avg(r => r.unsupportedTech.length).toFixed(2), 10) +
      avg(r => r.filler.length).toFixed(2)
    );
  }

  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify({ tone: args.tone, rows }, null, 2));
    console.log(`\nFull results written to ${args.out}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
