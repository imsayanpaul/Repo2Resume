# Repo2Resume 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/Version-v1.0-emerald.svg?style=flat-square)](#)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Vite%20%7C%20Groq%20%7C%20Gemini-silver.svg?style=flat-square)](#)

**Turn GitHub Repositories into ATS-Winning Resume Bullets.**

Convert public GitHub projects into specific, verifiable, ATS-friendly bullet points for the **Projects section** of an engineering resume.

---

## 📸 Interface Previews

### 1. Executive Hero Landing Experience
![Repo2Resume Hero Banner](src/1.png)

### 2. Dual-Pane Workspace & Live Bullet Editor
![Repo2Resume Workspace Preview](src/2.png)

---

## ✨ Key Features

### 🏆 1. Google XYZ, STAR, Technical and ATS Tones
- **Google XYZ Formula**: shapes each bullet as what you built, its concrete scope, and how you built it.
- **STAR Method**: situation, action taken, and what the project now does.
- **Technical Depth & ATS Minimal**: architecture-focused bullets, or concise keyword-rich lines for a one-page resume.

---

### 🧾 2. Honest by Design
- **No invented numbers**: every figure in an AI bullet is checked against the README, description and real repo stats; unbacked numbers trigger a rewrite, and any survivor is flagged.
- **Evidence-checked tech stack**: AI suggestions are kept only when the README mentions them, and stack confirmed by manifests is always kept.
- **Style checks**: bullets over about 30 words, "Accomplished…" openers, repo stats used as impact, and unproven outcome claims are caught and rewritten.

---

### 🔍 3. README, Manifest and Commit Analysis
- Reads each project's README and manifests (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`) plus Dockerfiles and GitHub Actions workflows.
- Pulls the README's feature list into the bullets, even with no AI available.
- **Thin README support**: falls back to the author's commit messages and file structure, and marks bullets built on limited information.

---

### ⚡ 4. Instant Results with AI Fallbacks
- Template bullets appear as soon as each repo loads; AI bullets replace them about a second later.
- AI runs through Groq first, then Gemini, so one provider's outage or rate limit doesn't stop generation.

---

### 🎯 5. Job Description Keyword Matcher
- Paste any target job description or pick sample presets (*Full-Stack Lead*, *Frontend Architect*, *Backend & Systems*).
- Extracts required technical skills with whole-word matching (`React`, `Docker`, `PostgreSQL`, `AWS`, `FastAPI`, `GraphQL`).
- Scores repository relevance and weaves the keywords a project actually uses into its bullets.

---

### 📑 6. Word Resume Upload (`.docx`) & Automatic Project Injection
- **Upload Existing Resume**: Upload your existing `.docx` Word resume directly into the workspace.
- **Smart Section Detection**: Locates your resume's `PROJECTS` or `PROJECT EXPERIENCE` section, handling multi-word headings, tables, custom shading, and underline borders.
- **Auto-Formatting & Style Cloning**: Clones your existing resume's typography (font, size, bold lead-ins, italic tech stacks, bullet indentation, and tab-stopped right-aligned links).
- **1-Click Injection**: Inserts the new project bullets with clickable GitHub and demo links, and downloads the updated `.docx` file.

---

### 📄 7. Multi-Format 1-Click Exporters
- **Rich Formatted Cards**: 1-click rich text copy for Microsoft Word and Google Docs with formatting intact.
- **LaTeX / Overleaf**: Ready-to-compile, properly escaped `esumeProjectHeading` code for *Jake's Resume*.
- **Markdown (`RESUME.md`)**: Clean markdown for GitHub Profile READMEs or portfolio sites.
- **JSON Resume**: Standard JSON schema format.

---

### 🪄 8. Regenerate with a Specific Request
- Custom instruction bar (*"Focus heavily on microservices and AWS deployment"*), with suggestion chips for testing and security, backend architecture, and one-page concision.

---

### 🔒 9. Keys Stay Server-Side
- The deployment's AI and GitHub keys live in server environment variables behind `/api`, never in the browser bundle.
- Visitors can use their own Gemini key or GitHub token instead; those stay in their browser's `localStorage`.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation & Local Setup

```bash
# 1. Clone repository
git clone https://github.com/imsayanpaul/Repo2Resume.git

# 2. Navigate into project directory
cd Repo2Resume

# 3. Install dependencies
npm install

# 4. Launch local dev server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🔑 Environment Variables (Optional)

Keys stay on the server. The `/api` functions (Vercel serverless functions in production, Vite middleware in `npm run dev`) read them, and the browser only ever talks to `/api/generate` and `/api/github`.

Create a `.env.local` file in the project root:

```env
# AI providers, tried in order: Groq (~1s per request), then Gemini. Either alone works.
GROQ_API_KEY=
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: GitHub token (no scopes needed) for a shared 5,000 requests/hour limit
GITHUB_TOKEN=
```

On **Vercel**, add the same variables under *Project Settings → Environment Variables* and redeploy.

**How generation works:** template bullets, built from the README's feature list, the detected stack and real repo stats, appear as soon as each repo's data loads. The AI version then replaces them, usually 1–3 seconds later. If every AI provider is down, the template bullets simply stay.

> ⚠️ **Do not use `VITE_GEMINI_API_KEY`.** Any `VITE_` variable is compiled into the JavaScript bundle, where anyone can read it, and Google revokes keys exposed that way. If an older setup has it, delete it from your environment.

*Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).*

Visitors can still add their own Gemini key or GitHub token in **Settings** (kept in their browser only); their own key takes priority over the server's.

**How the app stays within limits:**
- READMEs and manifest files are read from `raw.githubusercontent.com`, which doesn't count against the GitHub API limit.
- Each selected repo costs 2–3 API calls (file listing, commit count, workflows), and the results are cached in the browser until the repo changes.
- Without any GitHub token, the API allows 60 requests/hour per visitor, enough for about 15–20 repos.

**Honest output:** every number the AI writes is checked against the README, description and real repo stats (commits, stars). Bullets with an unbacked number are regenerated once, and any number that survives is flagged in the preview with "Check before using". The AI's tech-stack suggestions are kept only if the README or description mentions them; stack confirmed by `package.json`, `requirements.txt` and similar files is always kept.

### Measuring bullet quality

```bash
npm run eval
```

Runs the template engine, Groq and Gemini on a fixed set of real repos and scores each output against the repo's own text: invented numbers, tech the repo doesn't mention, specificity (distinctive words shared with the README), filler words and latency. Options: `--engines template,groq`, `--tone ats`, `--repos owner/name,owner/name`, `--out results.json`.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
