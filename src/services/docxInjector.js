/**
 * DOCX Resume Injector Service
 * 
 * Reads an existing .docx resume, finds the "Projects" section,
 * analyzes existing project formatting, and injects generated project
 * bullets matching the same style. Uses JSZip for raw OOXML manipulation.
 */
import JSZip from 'jszip';

// Common heading names for the "Projects" section in resumes
const PROJECT_HEADINGS = [
  'projects', 'project', 'project experience', 'personal projects',
  'technical projects', 'side projects', 'open source projects',
  'selected projects', 'key projects', 'academic projects',
  'professional projects', 'portfolio', 'portfolio projects'
];

// Common section headings that signal the END of the projects section
const SECTION_HEADINGS = [
  'education', 'experience', 'work experience', 'professional experience',
  'skills', 'technical skills', 'certifications', 'awards', 'honors',
  'achievements', 'publications', 'interests', 'activities',
  'extracurricular', 'volunteer', 'references', 'summary', 'objective',
  'languages', 'courses', 'coursework', 'leadership', 'involvement',
  'projects'
];

/**
 * Main entry: inject project bullets into an uploaded .docx resume
 * @param {File} docxFile - The uploaded .docx File object
 * @param {Array} projectEntries - Array of { repoName, techStack, bullets, html_url }
 * @param {Object} linkConfigs - Map of repoId -> { showGithub, showDemo, demoUrl }
 * @returns {Blob} - Modified .docx as a downloadable Blob
 */
export async function injectProjectsIntoDocx(docxFile, projectEntries, linkConfigs = {}) {
  const arrayBuffer = await docxFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const documentXmlStr = await zip.file('word/document.xml').async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXmlStr, 'application/xml');
  
  const nsResolver = createNamespaceResolver(xmlDoc);
  const wNs = nsResolver('w') || 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  
  const body = xmlDoc.getElementsByTagNameNS(wNs, 'body')[0];
  if (!body) throw new Error('Could not parse document structure. Is this a valid .docx file?');
  
  const paragraphs = Array.from(body.getElementsByTagNameNS(wNs, 'p'));
  
  // Find the Projects section boundaries
  const { insertionPoint, found, projectHeadingIdx, nextSectionIdx } = findProjectsSectionBoundary(paragraphs, wNs);
  
  if (!found) {
    throw new Error(
      'Could not find a "Projects" section in your resume. ' +
      'Please make sure your resume has a heading like "Projects", "PROJECTS", or "Project Experience".'
    );
  }
  
  // Analyze existing project formatting from the resume
  const existingStyles = extractExistingProjectStyles(paragraphs, wNs, projectHeadingIdx, nextSectionIdx);
  
  // Generate OOXML paragraph nodes matching existing formatting
  const newNodes = generateProjectXmlNodes(xmlDoc, wNs, projectEntries, linkConfigs, existingStyles);
  
  // Insert the new nodes at the insertion point
  for (const node of newNodes) {
    body.insertBefore(node, insertionPoint);
  }
  
  const serializer = new XMLSerializer();
  const modifiedXml = serializer.serializeToString(xmlDoc);
  zip.file('word/document.xml', modifiedXml);
  
  const modifiedBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  
  return modifiedBlob;
}

function createNamespaceResolver(xmlDoc) {
  const root = xmlDoc.documentElement;
  return (prefix) => {
    const nsMap = {
      'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    };
    const attr = root.getAttribute(`xmlns:${prefix}`);
    return attr || nsMap[prefix] || null;
  };
}

/**
 * Find the boundary of the Projects section.
 * Returns heading index, next section index, and insertion point node.
 */
function findProjectsSectionBoundary(paragraphs, wNs) {
  let projectHeadingIdx = -1;
  let nextSectionIdx = -1;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const rawText = getParagraphText(paragraphs[i], wNs).trim();
    const cleanText = rawText.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase();
    const isHeadingStyle = isHeading(paragraphs[i], wNs);
    const isAllCaps = rawText.length > 2 && rawText === rawText.toUpperCase();
    const isBold = isBoldParagraph(paragraphs[i], wNs);
    const hasShading = hasParagraphShading(paragraphs[i], wNs);
    
    if (projectHeadingIdx === -1) {
      if (cleanText && PROJECT_HEADINGS.some(h => cleanText === h || cleanText.startsWith(h + ' '))) {
        if (isHeadingStyle || isAllCaps || isBold || hasShading || PROJECT_HEADINGS.includes(cleanText)) {
          projectHeadingIdx = i;
        }
      }
      continue;
    }
    
    if (projectHeadingIdx !== -1 && nextSectionIdx === -1) {
      if (!cleanText || i <= projectHeadingIdx + 1) continue;
      const isNextSection = SECTION_HEADINGS.some(h => cleanText === h) && cleanText !== 'projects';
      if (isNextSection && (isHeadingStyle || isAllCaps || isBold || hasShading)) {
        nextSectionIdx = i;
        break;
      }
    }
  }
  
  if (projectHeadingIdx === -1) {
    return { insertionPoint: null, found: false, projectHeadingIdx: -1, nextSectionIdx: -1 };
  }
  
  const insertionPoint = nextSectionIdx !== -1 ? paragraphs[nextSectionIdx] : null;
  return { insertionPoint, found: true, projectHeadingIdx, nextSectionIdx };
}

/**
 * Analyze existing projects in the resume to extract their formatting.
 * Scans paragraphs between the Projects heading and the next section
 * to find title paragraphs and bullet paragraphs, then clones their styles.
 */
function extractExistingProjectStyles(paragraphs, wNs, headingIdx, nextSectionIdx) {
  const endIdx = nextSectionIdx !== -1 ? nextSectionIdx : paragraphs.length;
  const sectionParagraphs = paragraphs.slice(headingIdx + 1, endIdx);
  
  let titlePPr = null;   // Paragraph properties for title line
  let titleRPr = null;   // Run properties for title name (bold part)
  let techRPr = null;    // Run properties for tech stack (italic part)
  let bulletPPr = null;  // Paragraph properties for bullet lines
  let bulletRPr = null;  // Run properties for bullet text
  let bulletNumPr = null; // Numbering properties (if bullets use Word list numbering)
  let hasBulletChar = false; // Whether bullets use a character prefix (•, -, etc.)
  let bulletChar = '•';
  
  for (const para of sectionParagraphs) {
    const text = getParagraphText(para, wNs).trim();
    if (!text) continue;
    
    const pPr = para.getElementsByTagNameNS(wNs, 'pPr')[0];
    const runs = Array.from(para.getElementsByTagNameNS(wNs, 'r'));
    
    // Check if this paragraph uses Word list numbering
    const numPr = pPr?.getElementsByTagNameNS(wNs, 'numPr')[0];
    
    // Detect title paragraph: has bold text and contains a pipe separator or tech keywords
    const isTitleLike = runs.some(r => {
      const rPr = r.getElementsByTagNameNS(wNs, 'rPr')[0];
      return rPr?.getElementsByTagNameNS(wNs, 'b')[0] || 
             rPr?.getElementsByTagNameNS(wNs, 'u')[0];
    }) && (text.includes('|') || text.includes(','));
    
    // Detect bullet paragraph: has indentation, numbering, or starts with bullet char
    const isBulletLike = numPr || 
      (pPr?.getElementsByTagNameNS(wNs, 'ind')[0]?.getAttribute('w:left')) ||
      /^[•\-–—▪▸►⬩‣]\s/.test(text);
    
    if (isTitleLike && !titlePPr) {
      // Clone the title paragraph formatting
      if (pPr) titlePPr = pPr.cloneNode(true);
      
      // Find the bold run (project name) and the italic/regular run (tech stack)
      for (const run of runs) {
        const rPr = run.getElementsByTagNameNS(wNs, 'rPr')[0];
        if (!rPr) continue;
        
        const hasBold = rPr.getElementsByTagNameNS(wNs, 'b')[0];
        const hasItalic = rPr.getElementsByTagNameNS(wNs, 'i')[0];
        
        if (hasBold && !titleRPr) {
          titleRPr = rPr.cloneNode(true);
        }
        if (hasItalic && !techRPr) {
          techRPr = rPr.cloneNode(true);
        }
      }
      
      // If no explicit italic run found for tech, create one from title with italic added
      if (!techRPr && titleRPr) {
        techRPr = titleRPr.cloneNode(true);
        // Remove bold, add italic
        const boldEl = techRPr.getElementsByTagNameNS(wNs, 'b')[0];
        if (boldEl) techRPr.removeChild(boldEl);
        const underlineEl = techRPr.getElementsByTagNameNS(wNs, 'u')[0];
        if (underlineEl) techRPr.removeChild(underlineEl);
      }
    }
    
    if (isBulletLike && !bulletPPr) {
      // Clone bullet paragraph formatting
      if (pPr) bulletPPr = pPr.cloneNode(true);
      if (numPr) bulletNumPr = numPr.cloneNode(true);
      
      // Get run formatting from bullet text
      if (runs.length > 0) {
        const firstRun = runs[0];
        const rPr = firstRun.getElementsByTagNameNS(wNs, 'rPr')[0];
        if (rPr) bulletRPr = rPr.cloneNode(true);
      }
      
      // Check if bullets use a character prefix
      if (/^[•\-–—▪▸►⬩‣]\s/.test(text)) {
        hasBulletChar = true;
        bulletChar = text[0];
      } else if (numPr) {
        hasBulletChar = false; // Uses Word numbering, no character prefix needed
      }
    }
    
    // Stop once we have both styles
    if (titlePPr && bulletPPr) break;
  }
  
  return { titlePPr, titleRPr, techRPr, bulletPPr, bulletRPr, bulletNumPr, hasBulletChar, bulletChar };
}

/**
 * Generate OOXML paragraph nodes for each project entry,
 * matching the existing formatting styles from the resume.
 */
function generateProjectXmlNodes(xmlDoc, wNs, projectEntries, linkConfigs, styles) {
  const nodes = [];
  
  for (const project of projectEntries) {
    const config = linkConfigs[project.repoId] || { showGithub: true, showDemo: false, demoUrl: '' };
    
    // Project title line
    const titlePara = createStyledTitleParagraph(xmlDoc, wNs, project, config, styles);
    nodes.push(titlePara);
    
    // Bullet points
    for (const bullet of project.bullets) {
      const bulletPara = createStyledBulletParagraph(xmlDoc, wNs, bullet, styles);
      nodes.push(bulletPara);
    }
  }
  
  return nodes;
}

/**
 * Create a project title paragraph cloning the existing resume's title style.
 * Format: "ProjectName | TechStack"  with optional links
 */
function createStyledTitleParagraph(xmlDoc, wNs, project, config, styles) {
  const p = xmlDoc.createElementNS(wNs, 'w:p');
  
  // Use existing title paragraph properties or create default
  if (styles.titlePPr) {
    p.appendChild(styles.titlePPr.cloneNode(true));
  } else {
    // Fallback: default title formatting
    const pPr = xmlDoc.createElementNS(wNs, 'w:pPr');
    const spacing = xmlDoc.createElementNS(wNs, 'w:spacing');
    spacing.setAttribute('w:after', '40');
    spacing.setAttribute('w:before', '80');
    spacing.setAttribute('w:line', '276');
    pPr.appendChild(spacing);
    p.appendChild(pPr);
  }
  
  // Bold run: Project Name (using cloned title run properties)
  const nameRun = createStyledRun(xmlDoc, wNs, project.repoName, styles.titleRPr, { bold: true });
  p.appendChild(nameRun);
  
  // Separator " | "
  const sepRPr = styles.techRPr || styles.titleRPr;
  const sep = createStyledRun(xmlDoc, wNs, '  |  ', sepRPr, {});
  p.appendChild(sep);
  
  // Links (if any)
  const links = [];
  if (config.showGithub && project.html_url) links.push('GitHub');
  if (config.showDemo && config.demoUrl) links.push('Live Demo');
  
  if (links.length > 0) {
    const linkText = createStyledRun(xmlDoc, wNs, links.join(' | '), sepRPr, { italic: true, color: '0563C1' });
    p.appendChild(linkText);
    const sep2 = createStyledRun(xmlDoc, wNs, '  |  ', sepRPr, {});
    p.appendChild(sep2);
  }
  
  // Italic run: Tech Stack (using cloned tech run properties)
  const techText = (project.techStack || []).join(', ');
  const techRun = createStyledRun(xmlDoc, wNs, techText, styles.techRPr, { italic: true });
  p.appendChild(techRun);
  
  return p;
}

/**
 * Create a bullet point paragraph cloning the existing resume's bullet style.
 */
function createStyledBulletParagraph(xmlDoc, wNs, bulletText, styles) {
  const p = xmlDoc.createElementNS(wNs, 'w:p');
  
  // Use existing bullet paragraph properties or create default
  if (styles.bulletPPr) {
    const clonedPPr = styles.bulletPPr.cloneNode(true);
    p.appendChild(clonedPPr);
  } else {
    // Fallback: default bullet formatting
    const pPr = xmlDoc.createElementNS(wNs, 'w:pPr');
    const ind = xmlDoc.createElementNS(wNs, 'w:ind');
    ind.setAttribute('w:left', '360');
    ind.setAttribute('w:hanging', '180');
    pPr.appendChild(ind);
    const spacing = xmlDoc.createElementNS(wNs, 'w:spacing');
    spacing.setAttribute('w:after', '20');
    spacing.setAttribute('w:line', '264');
    pPr.appendChild(spacing);
    p.appendChild(pPr);
  }
  
  // If bullets use Word numbering (numPr), the bullet char is auto-generated
  // If they use a character prefix, prepend it
  const prefix = (!styles.bulletNumPr && (styles.hasBulletChar || !styles.bulletPPr)) 
    ? `${styles.bulletChar || '•'} ` 
    : '';
  
  const textContent = `${prefix}${bulletText}`;
  const bulletRun = createStyledRun(xmlDoc, wNs, textContent, styles.bulletRPr, {});
  p.appendChild(bulletRun);
  
  return p;
}

/**
 * Create a w:r (run) element that clones existing run properties
 * and applies optional overrides (bold, italic, color, etc.)
 */
function createStyledRun(xmlDoc, wNs, text, baseRPr, overrides = {}) {
  const r = xmlDoc.createElementNS(wNs, 'w:r');
  
  // Start with cloned base properties or create new
  let rPr;
  if (baseRPr) {
    rPr = baseRPr.cloneNode(true);
  } else {
    rPr = xmlDoc.createElementNS(wNs, 'w:rPr');
  }
  
  // Apply overrides
  if (overrides.bold) {
    if (!rPr.getElementsByTagNameNS(wNs, 'b')[0]) {
      rPr.appendChild(xmlDoc.createElementNS(wNs, 'w:b'));
    }
  }
  if (overrides.italic) {
    if (!rPr.getElementsByTagNameNS(wNs, 'i')[0]) {
      rPr.appendChild(xmlDoc.createElementNS(wNs, 'w:i'));
    }
  }
  if (overrides.color) {
    // Remove existing color if any, then add new
    const existingColor = rPr.getElementsByTagNameNS(wNs, 'color')[0];
    if (existingColor) rPr.removeChild(existingColor);
    const color = xmlDoc.createElementNS(wNs, 'w:color');
    color.setAttribute('w:val', overrides.color);
    rPr.appendChild(color);
  }
  
  // Only add rPr if it has children
  if (rPr.childNodes.length > 0 || rPr.attributes.length > 0) {
    r.appendChild(rPr);
  }
  
  // Text element
  const t = xmlDoc.createElementNS(wNs, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.textContent = text;
  r.appendChild(t);
  
  return r;
}

// ─── Helper Functions ────────────────────────────────────────

function getParagraphText(para, wNs) {
  const runs = para.getElementsByTagNameNS(wNs, 'r');
  let text = '';
  for (const run of runs) {
    const tElements = run.getElementsByTagNameNS(wNs, 't');
    for (const t of tElements) {
      text += t.textContent || '';
    }
  }
  return text;
}

function isHeading(para, wNs) {
  const pPr = para.getElementsByTagNameNS(wNs, 'pPr')[0];
  if (!pPr) return false;
  const pStyle = pPr.getElementsByTagNameNS(wNs, 'pStyle')[0];
  if (!pStyle) return false;
  const val = pStyle.getAttribute('w:val') || '';
  return /heading/i.test(val) || /^h\d$/i.test(val) || /title/i.test(val);
}

function isBoldParagraph(para, wNs) {
  const pPr = para.getElementsByTagNameNS(wNs, 'pPr')[0];
  if (pPr) {
    const rPr = pPr.getElementsByTagNameNS(wNs, 'rPr')[0];
    if (rPr?.getElementsByTagNameNS(wNs, 'b')[0]) return true;
  }
  const runs = para.getElementsByTagNameNS(wNs, 'r');
  if (runs.length === 0) return false;
  let allBold = true;
  for (const run of runs) {
    const rPr = run.getElementsByTagNameNS(wNs, 'rPr')[0];
    if (!rPr) { allBold = false; break; }
    if (!rPr.getElementsByTagNameNS(wNs, 'b')[0]) { allBold = false; break; }
  }
  return allBold;
}

function hasParagraphShading(para, wNs) {
  const pPr = para.getElementsByTagNameNS(wNs, 'pPr')[0];
  if (!pPr) return false;
  const shd = pPr.getElementsByTagNameNS(wNs, 'shd')[0];
  if (shd) {
    const fill = shd.getAttribute('w:fill');
    if (fill && fill !== 'auto' && fill.toLowerCase() !== 'ffffff') return true;
  }
  const pBdr = pPr.getElementsByTagNameNS(wNs, 'pBdr')[0];
  if (pBdr) return true;
  return false;
}

/**
 * Trigger a browser download of the modified .docx blob
 */
export function downloadDocxBlob(blob, originalFileName = 'resume.docx') {
  const baseName = originalFileName.replace(/\.docx$/i, '');
  const newName = `${baseName}_updated.docx`;
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = newName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
