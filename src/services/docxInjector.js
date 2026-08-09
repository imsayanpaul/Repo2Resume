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
  'projects', 'project experience', 'personal projects',
  'technical projects', 'side projects', 'open source projects',
  'selected projects', 'key projects', 'academic projects',
  'professional projects', 'portfolio', 'portfolio projects', 'project'
];

// Heading keywords that must NEVER be considered a Projects section heading
const EXCLUDED_PROJECT_KEYWORDS = ['work', 'employment', 'job', 'leadership', 'education', 'skills', 'summary'];

// Common section headings that signal the END of the projects section
const SECTION_HEADINGS = [
  'education', 'experience', 'work experience', 'professional experience', 'related experience',
  'employment', 'employment history', 'career history',
  'skills', 'technical skills', 'core competencies', 'proficiencies',
  'certifications', 'licenses', 'certificates', 'awards', 'honors', 'honors & involvement', 'honors and involvement',
  'achievements', 'publications', 'interests', 'activities', 'extracurricular', 'extracurricular activities',
  'volunteer', 'volunteer experience', 'community involvement', 'references', 'summary', 'objective',
  'profile', 'about me', 'languages', 'courses', 'coursework', 'leadership', 'leadership experience',
  'involvement', 'memberships', 'affiliations'
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
  
  // Insert the new nodes at the insertion point (before next section)
  if (insertionPoint) {
    for (const node of newNodes) {
      body.insertBefore(node, insertionPoint);
    }
  } else {
    // Append to body if Projects is the last section
    for (const node of newNodes) {
      body.appendChild(node);
    }
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
    const isAllCaps = rawText.length > 2 && rawText === rawText.toUpperCase() && rawText.length < 50;
    const isBold = isBoldParagraph(paragraphs[i], wNs);
    const hasShading = hasParagraphShading(paragraphs[i], wNs);
    
    // A heading must be relatively short (< 40 characters)
    const isShortText = rawText.length > 2 && rawText.length < 40;
    
    // Look for the Projects heading
    if (projectHeadingIdx === -1) {
      if (cleanText && isShortText) {
        // Exclude work/employment headings
        const isExcluded = EXCLUDED_PROJECT_KEYWORDS.some(k => cleanText.includes(k));
        
        if (!isExcluded) {
          const isProjectMatch = PROJECT_HEADINGS.some(h => cleanText === h || cleanText.startsWith(h + ' ') || cleanText.endsWith(' ' + h));
          if (isProjectMatch && (isHeadingStyle || isAllCaps || isBold || hasShading || PROJECT_HEADINGS.includes(cleanText))) {
            projectHeadingIdx = i;
          }
        }
      }
      continue;
    }
    
    // After finding the Projects heading, look for the next major section heading
    if (projectHeadingIdx !== -1 && nextSectionIdx === -1) {
      if (!cleanText || i <= projectHeadingIdx + 1) continue;
      
      const matchesKeyword = SECTION_HEADINGS.some(h => cleanText === h || cleanText.startsWith(h) || cleanText.includes(h));
      const isNotProject = !PROJECT_HEADINGS.some(h => cleanText === h);
      
      if (isNotProject && isShortText && (matchesKeyword || (isAllCaps && (isHeadingStyle || isBold || hasShading)))) {
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
  let techRPr = null;    // Run properties for tech stack (italic/regular part)
  let sepRPr = null;     // Run properties for separator runs (pipes)
  let bulletPPr = null;  // Paragraph properties for bullet lines
  let bulletRPr = null;  // Run properties for bullet REGULAR text (non-bold)
  let bulletBoldRPr = null; // Run properties for bold first phrase in bullets
  let bulletNumPr = null; // Numbering properties (if bullets use Word list numbering)
  let hasBulletChar = false; // Whether bullets use a character prefix (•, -, etc.)
  let bulletChar = '•';
  let hasRightAlignedLink = false; // Whether title has right-aligned link via tab stop
  let linkRPr = null;    // Run properties for link text
  
  for (const para of sectionParagraphs) {
    const text = getParagraphText(para, wNs).trim();
    if (!text) continue;
    
    const pPr = para.getElementsByTagNameNS(wNs, 'pPr')[0];
    const runs = Array.from(para.getElementsByTagNameNS(wNs, 'r'));
    
    // Check if this paragraph uses Word list numbering
    const numPr = pPr?.getElementsByTagNameNS(wNs, 'numPr')[0];
    
    // Detect title paragraph: has bold/underlined text and contains a pipe separator or tech keywords
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
      
      // Check for tab stops (indicates right-aligned links)
      const tabs = pPr?.getElementsByTagNameNS(wNs, 'tabs')[0];
      if (tabs) hasRightAlignedLink = true;
      
      // Check for tab characters in runs (also indicates right-aligned layout)
      for (const run of runs) {
        const tabEls = run.getElementsByTagNameNS(wNs, 'tab');
        if (tabEls.length > 0) hasRightAlignedLink = true;
      }
      
      // Find the bold run (project name), separator, and tech/link runs
      for (const run of runs) {
        const rPr = run.getElementsByTagNameNS(wNs, 'rPr')[0];
        if (!rPr) continue;
        
        const hasBold = rPr.getElementsByTagNameNS(wNs, 'b')[0];
        const hasItalic = rPr.getElementsByTagNameNS(wNs, 'i')[0];
        const hasUnderline = rPr.getElementsByTagNameNS(wNs, 'u')[0];
        const runText = getRunText(run, wNs);
        
        // Detect link style (typically colored/underlined text like "GitHub Repository")
        const colorEl = rPr.getElementsByTagNameNS(wNs, 'color')[0];
        const rStyleEl = rPr.getElementsByTagNameNS(wNs, 'rStyle')[0];
        const isHyperlink = (colorEl && colorEl.getAttribute('w:val') !== '000000') ||
                           (rStyleEl && /hyperlink|link/i.test(rStyleEl.getAttribute('w:val') || ''));
        
        if (isHyperlink && !linkRPr) {
          linkRPr = rPr.cloneNode(true);
        } else if ((hasBold || hasUnderline) && !titleRPr) {
          titleRPr = rPr.cloneNode(true);
        } else if (hasItalic && !techRPr) {
          techRPr = rPr.cloneNode(true);
        } else if (runText.includes('|') && !sepRPr) {
          sepRPr = rPr.cloneNode(true);
        }
      }
      
      // Fallback: create tech style from title style minus bold/underline
      if (!techRPr && titleRPr) {
        techRPr = titleRPr.cloneNode(true);
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
      
      // Scan ALL runs to find bold vs non-bold styles
      // Existing bullets often start with a bold phrase then switch to regular
      for (const run of runs) {
        const rPr = run.getElementsByTagNameNS(wNs, 'rPr')[0];
        if (!rPr) continue;
        
        const hasBold = rPr.getElementsByTagNameNS(wNs, 'b')[0];
        
        if (hasBold && !bulletBoldRPr) {
          bulletBoldRPr = rPr.cloneNode(true);
        }
        if (!hasBold && !bulletRPr) {
          bulletRPr = rPr.cloneNode(true);
        }
      }
      
      // If ALL runs were bold (no non-bold found), create a non-bold version
      if (!bulletRPr && bulletBoldRPr) {
        bulletRPr = bulletBoldRPr.cloneNode(true);
        const bEl = bulletRPr.getElementsByTagNameNS(wNs, 'b')[0];
        if (bEl) bulletRPr.removeChild(bEl);
      }
      
      // If no bold runs found either, use first run
      if (!bulletRPr && runs.length > 0) {
        const rPr = runs[0].getElementsByTagNameNS(wNs, 'rPr')[0];
        if (rPr) bulletRPr = rPr.cloneNode(true);
      }
      
      // Check if bullets use a character prefix
      if (/^[•\-–—▪▸►⬩‣]\s/.test(text)) {
        hasBulletChar = true;
        bulletChar = text[0];
      } else if (numPr) {
        hasBulletChar = false;
      }
    }
    
    // Stop once we have both styles
    if (titlePPr && bulletPPr) break;
  }
  
  return { titlePPr, titleRPr, techRPr, sepRPr, bulletPPr, bulletRPr, bulletBoldRPr, bulletNumPr, hasBulletChar, bulletChar, hasRightAlignedLink, linkRPr };
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
 * Layout: "ProjectName | TechStack" with optional right-aligned link
 */
function createStyledTitleParagraph(xmlDoc, wNs, project, config, styles) {
  const p = xmlDoc.createElementNS(wNs, 'w:p');
  
  // Use existing title paragraph properties or create default
  let pPr;
  if (styles.titlePPr) {
    pPr = styles.titlePPr.cloneNode(true);
  } else {
    pPr = xmlDoc.createElementNS(wNs, 'w:pPr');
  }
  
  // Ensure clear spacing above the project title (~12pt / 240 dxa)
  let spacing = pPr.getElementsByTagNameNS(wNs, 'spacing')[0];
  if (!spacing) {
    spacing = xmlDoc.createElementNS(wNs, 'w:spacing');
    pPr.appendChild(spacing);
  }
  const currentBefore = parseInt(spacing.getAttribute('w:before') || '0', 10);
  if (currentBefore < 200) {
    spacing.setAttribute('w:before', '240');
  }
  
  p.appendChild(pPr);
  
  // Bold run: Project Name
  const nameRun = createStyledRun(xmlDoc, wNs, project.repoName, styles.titleRPr, { bold: true });
  p.appendChild(nameRun);
  
  // Separator " | "
  const sepBase = styles.sepRPr || styles.techRPr || styles.titleRPr;
  const sep = createStyledRun(xmlDoc, wNs, '  |  ', sepBase, { removeBold: true, removeUnderline: true });
  p.appendChild(sep);
  
  // Tech Stack
  const techText = (project.techStack || []).join(', ');
  const techRun = createStyledRun(xmlDoc, wNs, techText, styles.techRPr, { italic: true });
  p.appendChild(techRun);
  
  // Links — right-aligned if existing format uses tab stops, otherwise inline
  const links = [];
  if (config.showGithub && project.html_url) links.push('GitHub');
  if (config.showDemo && config.demoUrl) links.push('Live Demo');
  
  if (links.length > 0) {
    if (styles.hasRightAlignedLink) {
      // Add a tab character to push link to the right
      const tabRun = xmlDoc.createElementNS(wNs, 'w:r');
      const tabEl = xmlDoc.createElementNS(wNs, 'w:tab');
      tabRun.appendChild(tabEl);
      p.appendChild(tabRun);
    } else {
      // Inline separator
      const sep2 = createStyledRun(xmlDoc, wNs, '  |  ', sepBase, { removeBold: true, removeUnderline: true });
      p.appendChild(sep2);
    }
    
    // Link text with hyperlink styling
    const linkBase = styles.linkRPr || sepBase;
    const linkText = createStyledRun(xmlDoc, wNs, links.join(' | '), linkBase, { italic: true, color: '0563C1' });
    p.appendChild(linkText);
  }
  
  return p;
}

/**
 * Create a bullet point paragraph cloning the existing resume's bullet style.
 * Supports bold lead-in phrase matching if detected in the uploaded resume.
 */
function createStyledBulletParagraph(xmlDoc, wNs, bulletText, styles) {
  const p = xmlDoc.createElementNS(wNs, 'w:p');
  
  // Use existing bullet paragraph properties or create default
  if (styles.bulletPPr) {
    p.appendChild(styles.bulletPPr.cloneNode(true));
  } else {
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
  
  // Determine bullet prefix
  const prefix = (!styles.bulletNumPr && (styles.hasBulletChar || !styles.bulletPPr)) 
    ? `${styles.bulletChar || '•'} ` 
    : '';
  
  // If the uploaded resume uses bold lead-ins in its bullets
  if (styles.bulletBoldRPr) {
    const { leadIn, rest } = splitBulletLeadIn(bulletText);
    
    // Lead-in run (bold style)
    const leadRun = createStyledRun(xmlDoc, wNs, `${prefix}${leadIn}`, styles.bulletBoldRPr, { bold: true });
    p.appendChild(leadRun);
    
    // Rest of sentence (regular non-bold style)
    if (rest) {
      const restRun = createStyledRun(xmlDoc, wNs, rest, styles.bulletRPr, { removeBold: true });
      p.appendChild(restRun);
    }
  } else {
    // Resume uses uniform non-bold bullets
    const bodyRPr = styles.bulletRPr;
    const bulletRun = createStyledRun(xmlDoc, wNs, `${prefix}${bulletText}`, bodyRPr, { removeBold: true });
    p.appendChild(bulletRun);
  }
  
  return p;
}

/**
 * Split a bullet point sentence into a lead-in phrase (to bold) and the rest.
 */
function splitBulletLeadIn(bulletText) {
  const lower = bulletText.toLowerCase();
  const keywords = [' using ', ' with ', ' by ', ' via ', ' leveraging ', ' that ', ' to ', ', '];
  let minIdx = -1;
  
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx > 10 && (minIdx === -1 || idx < minIdx)) {
      minIdx = idx;
    }
  }
  
  if (minIdx !== -1) {
    return {
      leadIn: bulletText.slice(0, minIdx).trim(),
      rest: bulletText.slice(minIdx)
    };
  }
  
  // Fallback: first 4 words
  const words = bulletText.split(/\s+/);
  if (words.length > 5) {
    const leadIn = words.slice(0, 4).join(' ');
    const rest = ' ' + words.slice(4).join(' ');
    return { leadIn, rest };
  }
  
  return { leadIn: bulletText, rest: '' };
}

/**
 * Create a w:r (run) element that clones existing run properties
 * and applies optional overrides (bold, italic, color, etc.)
 */
function createStyledRun(xmlDoc, wNs, text, baseRPr, overrides = {}) {
  const r = xmlDoc.createElementNS(wNs, 'w:r');
  
  let rPr;
  if (baseRPr) {
    rPr = baseRPr.cloneNode(true);
  } else {
    rPr = xmlDoc.createElementNS(wNs, 'w:rPr');
  }
  
  // Apply overrides
  if (overrides.removeBold) {
    const bEl = rPr.getElementsByTagNameNS(wNs, 'b')[0];
    if (bEl) rPr.removeChild(bEl);
    const bCsEl = rPr.getElementsByTagNameNS(wNs, 'bCs')[0];
    if (bCsEl) rPr.removeChild(bCsEl);
  } else if (overrides.bold) {
    if (!rPr.getElementsByTagNameNS(wNs, 'b')[0]) {
      rPr.appendChild(xmlDoc.createElementNS(wNs, 'w:b'));
    }
  }

  if (overrides.removeUnderline) {
    const uEl = rPr.getElementsByTagNameNS(wNs, 'u')[0];
    if (uEl) rPr.removeChild(uEl);
  } else if (overrides.underline) {
    if (!rPr.getElementsByTagNameNS(wNs, 'u')[0]) {
      const u = xmlDoc.createElementNS(wNs, 'w:u');
      u.setAttribute('w:val', 'single');
      rPr.appendChild(u);
    }
  }
  
  if (overrides.italic) {
    if (!rPr.getElementsByTagNameNS(wNs, 'i')[0]) {
      rPr.appendChild(xmlDoc.createElementNS(wNs, 'w:i'));
    }
  }
  
  if (overrides.color) {
    const existingColor = rPr.getElementsByTagNameNS(wNs, 'color')[0];
    if (existingColor) rPr.removeChild(existingColor);
    const color = xmlDoc.createElementNS(wNs, 'w:color');
    color.setAttribute('w:val', overrides.color);
    rPr.appendChild(color);
  }
  
  if (rPr.childNodes.length > 0 || rPr.attributes.length > 0) {
    r.appendChild(rPr);
  }
  
  const t = xmlDoc.createElementNS(wNs, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.textContent = text;
  r.appendChild(t);
  
  return r;
}

// ─── Helper Functions ────────────────────────────────────────

function getRunText(run, wNs) {
  const tElements = run.getElementsByTagNameNS(wNs, 't');
  let text = '';
  for (const t of tElements) {
    text += t.textContent || '';
  }
  return text;
}

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
