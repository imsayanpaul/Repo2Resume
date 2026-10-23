# Repo2Resume

I kept forgetting what went into my old projects, so I made this.

Give it a GitHub username and it reads each repo's README, dependency files and commit history, then writes résumé bullets for the Projects section, including the libraries, integrations and features you forgot you built.

**Live:** https://repo2resume-app.vercel.app

![Landing page: a repo's files next to the résumé entry they produced](src/1.png)

![Workspace: pick repos on the left, edit bullets on the page](src/2.png)

## What it reads

For each repo you pick:

- **README.md**: the Features section (or sub-headings, or the first useful list) becomes the backbone of the bullets.
- **Dependency files**: `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod` and `Cargo.toml`, at the root and in `frontend/`, `client/`, `web/`, `backend/`, `server/` and similar folders.
- **Infrastructure**: a Dockerfile or compose file, GitHub Actions workflows, `tsconfig.json`.
- **Commits**: your commit count through the GitHub API, and your recent commit messages when the README is thin.

Package names are mapped to tech names from a built-in list (`psycopg2-binary` becomes PostgreSQL, `groq` becomes Groq, and so on), so unusual packages are skipped rather than guessed.

## What you get

- Bullets in four styles: Google XYZ, STAR, technical depth, or short ATS lines.
- A draft appears as soon as a repo's files are read, and the AI version replaces it a second or two later. If the AI is down, the draft stays.
- Every number in an AI bullet is checked against the repo. Unbacked numbers trigger a rewrite, and anything left over is flagged on the page.
- Repos with little to go on (no README, few commit messages) are marked so you know to check them.
- Paste a job description to sort repos by relevance and work its skills into the bullets where the project really uses them.
- Copy into Word or Google Docs, drop the projects straight into your existing `.docx` résumé, or export LaTeX (Jake's Resume), Markdown or JSON.

## Running it locally

Needs Node.js 18 or newer.

```bash
git clone https://github.com/imsayanpaul/Repo2Resume.git
cd Repo2Resume
npm install
npm run dev
```

Then open http://localhost:3000.

It works without any keys: bullets come from the offline engine. For AI-written bullets and a higher GitHub limit, create `.env.local`:

```env
# Tried in order: Groq first, then Gemini. Either one is enough.
GROQ_API_KEY=
GEMINI_API_KEY=

# Optional. A fine-grained token with no permissions raises GitHub's
# limit from 60 to 5,000 requests an hour.
GITHUB_TOKEN=
```

Keys stay on the server. In development they're read by Vite middleware, in production by the Vercel functions in `api/`, and the browser only talks to `/api/generate` and `/api/github`. Don't use `VITE_`-prefixed names for keys: those get compiled into the JavaScript bundle where anyone can read them.

Visitors can also add their own Gemini key or GitHub token in Settings. Those stay in their browser and take priority over the server's.

## Deploying

The repo is set up for Vercel. Import it, add the same environment variables under Project Settings → Environment Variables, and deploy.

## Checking bullet quality

```bash
npm run eval
```

Runs the offline engine, Groq and Gemini on a fixed set of real repos and scores each output against the repo's own text: invented numbers, tech the repo never mentions, specificity, filler words, bullet length and speed. Options: `--engines template,groq`, `--tone ats`, `--repos owner/name,owner/name`, `--out results.json`.

## License

MIT, see [LICENSE](LICENSE).
