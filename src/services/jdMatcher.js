/**
 * Job Description (JD) Keyword Matcher & Tech Extractor
 */

// Common Tech Skills Database: canonical name -> extra aliases to look for
const TECH_DICTIONARY = {
  'React': ['React.js', 'ReactJS'], 'Next.js': ['NextJS'], 'Vue.js': ['Vue', 'VueJS'], 'Angular': [], 'Svelte': [],
  'Node.js': ['NodeJS', 'Node'], 'Express': ['Express.js', 'ExpressJS'], 'NestJS': [], 'FastAPI': [], 'Django': [],
  'Flask': [], 'Spring Boot': [],
  'TypeScript': [], 'JavaScript': [], 'Python': [], 'Go': ['Golang'], 'Rust': [], 'C++': [], 'Java': [],
  'PostgreSQL': ['Postgres'], 'MySQL': [], 'MongoDB': [], 'Redis': [], 'GraphQL': [], 'REST API': ['RESTful', 'REST APIs'],
  'gRPC': [], 'Docker': [], 'Kubernetes': ['K8s'], 'AWS': [], 'GCP': ['Google Cloud'], 'Azure': [], 'Terraform': [],
  'CI/CD': [], 'Tailwind CSS': ['Tailwind'], 'Redux': [], 'Zustand': [], 'Prisma': [], 'TimescaleDB': [],
  'LangChain': [], 'OpenAI': [], 'Gemini': [], 'Pinecone': [], 'Vector DB': ['vector database'], 'RAG': [],
  'WebSockets': ['WebSocket'], 'PyTest': [], 'Jest': [], 'Cypress': [], 'Playwright': [], 'Git': [], 'Linux': []
};

// Skills that are also ordinary English words: only match them as written
// ("Go", not "go"; "Express", not "expressed"; "Rust", not "trust")
const CASE_SENSITIVE = new Set(['Go', 'Rust', 'Express', 'Node', 'RAG', 'Git', 'Java', 'Gemini', 'Jest', 'Flask', 'Redux']);

function escapeRegex(str) {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// \b fails around symbols like "C++" and "Node.js", so use explicit lookarounds
function termRegex(term) {
  return new RegExp(`(?<![A-Za-z0-9+#.])${escapeRegex(term)}(?![A-Za-z0-9+#])`, CASE_SENSITIVE.has(term) ? '' : 'i');
}

function mentionsTerm(text, term) {
  return termRegex(term).test(text);
}

/**
 * Parse job description text and extract technical keywords
 */
export function extractJdKeywords(text) {
  if (!text || text.trim() === '') return [];

  return Object.entries(TECH_DICTIONARY)
    .filter(([skill, aliases]) => [skill, ...aliases].some(term => mentionsTerm(text, term)))
    .map(([skill]) => skill);
}

/**
 * Score a repository against extracted JD keywords
 * @returns {Object} { scorePercent, matchedKeywords }
 */
export function matchRepoToJd(repo, jdKeywords) {
  if (!jdKeywords || jdKeywords.length === 0) {
    return { scorePercent: 0, matchedKeywords: [] };
  }

  const repoTechText = [
    repo.language,
    ...(repo.detected_deps || []),
    ...(repo.topics || []).map(t => t.replace(/-/g, ' ')),
    repo.name,
    repo.description
  ].join(' | ');

  const matched = jdKeywords.filter(keyword => {
    const terms = [keyword, ...(TECH_DICTIONARY[keyword] || [])];
    // Repo metadata is mostly tags, not prose, so match case-insensitively
    return terms.some(term => new RegExp(termRegex(term).source, 'i').test(repoTechText));
  });

  const scorePercent = Math.min(100, Math.round((matched.length / Math.min(jdKeywords.length, 6)) * 100));

  return {
    scorePercent,
    matchedKeywords: matched
  };
}
