/**
 * Job Description (JD) Keyword Matcher & Tech Extractor
 */

// Common Tech Skills Database for standard matching
const TECH_DICTIONARY = [
  'React', 'React.js', 'Next.js', 'Vue', 'Vue.js', 'Angular', 'Svelte',
  'Node.js', 'Express', 'NestJS', 'FastAPI', 'Django', 'Flask', 'Spring Boot',
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Golang', 'Rust', 'C++', 'Java',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'gRPC',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD',
  'Tailwind', 'Tailwind CSS', 'Redux', 'Zustand', 'Prisma', 'TimescaleDB',
  'LangChain', 'OpenAI', 'Gemini', 'Pinecone', 'Vector DB', 'RAG', 'WebSockets',
  'PyTest', 'Jest', 'Cypress', 'Playwright', 'Git', 'Linux'
];

/**
 * Parse job description text and extract technical keywords
 */
export function extractJdKeywords(text) {
  if (!text || text.trim() === '') return [];

  const lowerText = text.toLowerCase();
  const matched = new Set();

  TECH_DICTIONARY.forEach(skill => {
    // Escaping special characters for regex match
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lowerText) || lowerText.includes(skill.toLowerCase())) {
      matched.add(skill);
    }
  });

  return Array.from(matched);
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
    ...(repo.topics || []),
    repo.name,
    repo.description
  ].join(' ').toLowerCase();

  const matched = jdKeywords.filter(keyword => 
    repoTechText.includes(keyword.toLowerCase())
  );

  const scorePercent = Math.min(100, Math.round((matched.length / Math.min(jdKeywords.length, 6)) * 100));

  return {
    scorePercent,
    matchedKeywords: matched
  };
}
