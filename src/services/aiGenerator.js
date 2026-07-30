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

/**
 * Call Gemini API directly from browser using available models
 */
async function generateBulletsWithGemini(repo, tone, apiKey, jdKeywords, customInstruction = '') {
  const prompt = `You are a world-class technical resume reviewer and ATS optimization expert.
Write 3 high-impact, professional resume bullet points for a software engineering project based on this GitHub repository:

Repository Name: ${repo.name}
Description: ${repo.description}
Primary Language: ${repo.language}
Detected Tech Stack: ${repo.detected_deps.join(', ')}
Topics/Keywords: ${repo.topics.join(', ')}
Stars: ${repo.stargazers_count}
${repo.readmeText ? `README Content Summary: ${repo.readmeText.slice(0, 1000)}` : ''}
${jdKeywords.length > 0 ? `Target Job Keywords to emphasize: ${jdKeywords.join(', ')}` : ''}
${customInstruction ? `USER SPECIFIC REGENERATION INSTRUCTION / CUSTOM REQUEST: ${customInstruction}` : ''}

Tone/Style Requirements: ${tone === 'xyz' ? 'Google XYZ Formula (Accomplished X using Y, resulting in quantitative impact Z)' : tone === 'star' ? 'STAR Method (Situation/Task, Action taken, Result achieved)' : 'Concise ATS Bullet Points with strong action verbs'}.

Return ONLY a valid JSON array of strings containing the 3 bullet points, without markdown codeblock wrapper or extra explanation.
Example: ["Architected...", "Engineered...", "Optimized..."]`;

  const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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
 */
function generateHeuristicBullets(repo, tone, jdKeywords = []) {
  const name = formatRepoName(repo.name);
  const techStack = repo.detected_deps.length > 0 ? repo.detected_deps.slice(0, 4).join(', ') : repo.language;
  const starsText = repo.stargazers_count > 10 ? ` and garnered ${repo.stargazers_count}+ stars on GitHub` : '';
  
  // Highlight JD keywords if matching
  const matchingJd = jdKeywords.filter(k => 
    repo.detected_deps.some(d => d.toLowerCase().includes(k.toLowerCase())) ||
    repo.topics.some(t => t.toLowerCase().includes(k.toLowerCase()))
  );
  const jdHighlight = matchingJd.length > 0 ? ` with emphasis on ${matchingJd.slice(0, 3).join(', ')}` : '';

  if (tone === 'xyz') {
    return [
      `Architected and deployed ${name}, a full-stack platform leveraging ${techStack}${jdHighlight}, delivering responsive performance and robust maintainability${starsText}.`,
      `Engineered modular data processing workflows using ${repo.language}, reducing state latency by ~35% and improving API throughput across high-concurrency workloads.`,
      `Implemented automated test coverage, CI/CD pipelines, and structured schema validations to streamline continuous integration and zero-downtime deployments.`
    ];
  }

  if (tone === 'star') {
    return [
      `Designed ${name} to address scalability challenges by integrating ${techStack}, enabling seamless end-to-end user workflows and real-time state management.`,
      `Leveraged ${repo.language} and custom asynchronous handlers to process high-throughput data streams with high reliability and zero telemetry dropouts.`,
      `Established automated integration testing and containerized deployment scripts, reducing bug regression rates by over 40% during active iterations.`
    ];
  }

  if (tone === 'technical') {
    return [
      `Constructed ${name} using ${techStack}${jdHighlight}, adhering to clean architecture standards and SOLID design principles.`,
      `Optimized database indexing and asynchronous protocol communications, achieving sub-100ms response latencies for critical user queries.`,
      `Configured robust environment configs, security authentication headers, and comprehensive developer documentation for open-source scalability.`
    ];
  }

  // Default ATS Minimalist
  return [
    `Developed ${name} using ${techStack} to provide real-time automated data processing and user interaction capabilities.`,
    `Integrated ${repo.language} back-end routines with optimized state handlers, reducing memory consumption by 25%.`,
    `Maintained clean git commit workflows, dependency tracking, and unit test suites to ensure production-grade software reliability.`
  ];
}

/**
 * Format raw repo names like 'nexus-quant-trader' -> 'Nexus Quant Trader'
 */
function formatRepoName(raw) {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
