/**
 * DOCX Resume Injector Service
 * 
 * Reads an existing .docx resume, finds the "Projects" section,
 * and injects generated project bullets below existing projects.
 * Uses JSZip to manipulate the raw OOXML inside the .docx file.
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
  'projects' // projects itself, to handle edge cases
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
  
  // Read the main document XML
  const documentXmlStr = await zip.file('word/document.xml').async('string');
  
  // Parse as XML DOM
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXmlStr, 'application/xml');
  
  // Find namespaces
  const nsResolver = createNamespaceResolver(xmlDoc);
  const wNs = nsResolver('w') || 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  
  // Get all paragraphs
  const body = xmlDoc.getElementsByTagNameNS(wNs, 'body')[0];
  if (!body) throw new Error('Could not parse document structure. Is this a valid .docx file?');
  
  const paragraphs = Array.from(body.getElementsByTagNameNS(wNs, 'p'));
  
  // Find the Projects section boundaries
  const { insertionPoint, found } = findProjectsSectionBoundary(paragraphs, wNs);
  
  if (!found) {
    throw new Error(
      'Could not find a "Projects" section in your resume. ' +
      'Please make sure your resume has a heading like "Projects", "PROJECTS", or "Project Experience".'
    );
  }
  
  // Generate OOXML paragraph nodes for each project
  const newNodes = generateProjectXmlNodes(xmlDoc, wNs, projectEntries, linkConfigs);
  
  // Insert the new nodes at the insertion point
  const referenceNode = insertionPoint;
  for (const node of newNodes) {
    body.insertBefore(node, referenceNode);
  }
  
  // Serialize back to XML string
  const serializer = new XMLSerializer();
  const modifiedXml = serializer.serializeToString(xmlDoc);
  
  // Replace in zip
  zip.file('word/document.xml', modifiedXml);
  
  // Generate the modified .docx blob
  const modifiedBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  
  return modifiedBlob;
}

/**
 * Extract a namespace resolver from the document root
 */
function createNamespaceResolver(xmlDoc) {
  const root = xmlDoc.documentElement;
  return (prefix) => {
    const nsMap = {
      'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
    };
    // Also check attributes
    const attr = root.getAttribute(`xmlns:${prefix}`);
    return attr || nsMap[prefix] || null;
  };
}

/**
 * Find the boundary of the Projects section in the document.
 * Returns the paragraph node AFTER which new projects should be inserted.
 */
function findProjectsSectionBoundary(paragraphs, wNs) {
  let projectHeadingIndex = -1;
  let nextSectionIndex = -1;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const text = getParagraphText(paragraphs[i], wNs).trim().toLowerCase();
    const isHeadingStyle = isHeading(paragraphs[i], wNs);
    
    // Look for the Projects heading
    if (projectHeadingIndex === -1) {
      if (PROJECT_HEADINGS.some(h => text === h || text.startsWith(h))) {
        // Verify it looks like a heading (styled heading, all-caps, or bold with specific text)
        if (isHeadingStyle || text === text.toUpperCase() || isBoldParagraph(paragraphs[i], wNs)) {
          projectHeadingIndex = i;
        }
      }
      continue;
    }
    
    // After finding the Projects heading, look for the next major section heading
    if (projectHeadingIndex !== -1 && nextSectionIndex === -1) {
      // Check if this paragraph is a new section heading
      const cleanText = text.replace(/[^a-z\s]/g, '').trim();
      if (cleanText && SECTION_HEADINGS.some(h => cleanText === h) && 
          (isHeadingStyle || cleanText === cleanText.toUpperCase() || isBoldParagraph(paragraphs[i], wNs)) &&
          i > projectHeadingIndex + 1) {
        // Also check the original text for all-caps
        const origText = getParagraphText(paragraphs[i], wNs).trim();
        const isAllCaps = origText === origText.toUpperCase() && origText.length > 2;
        if (isHeadingStyle || isAllCaps || isBoldParagraph(paragraphs[i], wNs)) {
          nextSectionIndex = i;
          break;
        }
      }
    }
  }
  
  if (projectHeadingIndex === -1) {
    return { insertionPoint: null, found: false };
  }
  
  // If we found the next section, insert before it
  // If not, insert at the end of the document body
  const insertionPoint = nextSectionIndex !== -1 
    ? paragraphs[nextSectionIndex]
    : null; // null = append at end
  
  return { insertionPoint, found: true };
}

/**
 * Extract plain text from a paragraph element
 */
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

/**
 * Check if a paragraph uses a Heading style (Heading1, Heading2, etc.)
 */
function isHeading(para, wNs) {
  const pPr = para.getElementsByTagNameNS(wNs, 'pPr')[0];
  if (!pPr) return false;
  const pStyle = pPr.getElementsByTagNameNS(wNs, 'pStyle')[0];
  if (!pStyle) return false;
  const val = pStyle.getAttribute('w:val') || '';
  return /heading/i.test(val) || /^h\d$/i.test(val) || /title/i.test(val);
}

/**
 * Check if a paragraph has bold formatting (common in section headings)
 */
function isBoldParagraph(para, wNs) {
  // Check paragraph-level bold
  const pPr = para.getElementsByTagNameNS(wNs, 'pPr')[0];
  if (pPr) {
    const rPr = pPr.getElementsByTagNameNS(wNs, 'rPr')[0];
    if (rPr) {
      const bold = rPr.getElementsByTagNameNS(wNs, 'b')[0];
      if (bold) return true;
    }
  }
  
  // Check run-level bold (all runs must be bold)
  const runs = para.getElementsByTagNameNS(wNs, 'r');
  if (runs.length === 0) return false;
  
  let allBold = true;
  for (const run of runs) {
    const rPr = run.getElementsByTagNameNS(wNs, 'rPr')[0];
    if (!rPr) { allBold = false; break; }
    const bold = rPr.getElementsByTagNameNS(wNs, 'b')[0];
    if (!bold) { allBold = false; break; }
  }
  return allBold;
}

/**
 * Generate OOXML paragraph nodes for each project entry
 */
function generateProjectXmlNodes(xmlDoc, wNs, projectEntries, linkConfigs) {
  const nodes = [];
  
  for (const project of projectEntries) {
    const config = linkConfigs[project.repoId] || { showGithub: true, showDemo: false, demoUrl: '' };
    
    // Add a small spacer paragraph
    nodes.push(createEmptyParagraph(xmlDoc, wNs, '4'));
    
    // Project Name line (bold) with tech stack (italic) on same line
    // Format: "Project Name | React, Node.js, PostgreSQL"
    const titlePara = createProjectTitleParagraph(xmlDoc, wNs, project, config);
    nodes.push(titlePara);
    
    // Bullet points
    for (const bullet of project.bullets) {
      const bulletPara = createBulletParagraph(xmlDoc, wNs, bullet);
      nodes.push(bulletPara);
    }
  }
  
  return nodes;
}

/**
 * Create an empty spacer paragraph
 */
function createEmptyParagraph(xmlDoc, wNs, spacingPt = '4') {
  const p = xmlDoc.createElementNS(wNs, 'w:p');
  const pPr = xmlDoc.createElementNS(wNs, 'w:pPr');
  const spacing = xmlDoc.createElementNS(wNs, 'w:spacing');
  spacing.setAttribute('w:after', spacingPt);
  spacing.setAttribute('w:before', spacingPt);
  spacing.setAttribute('w:line', '240');
  pPr.appendChild(spacing);
  p.appendChild(pPr);
  return p;
}

/**
 * Create the project title paragraph:
 * Bold "Project Name" | Italic "Tech, Stack, Here"
 */
function createProjectTitleParagraph(xmlDoc, wNs, project, config) {
  const p = xmlDoc.createElementNS(wNs, 'w:p');
  
  // Paragraph properties - tight spacing
  const pPr = xmlDoc.createElementNS(wNs, 'w:pPr');
  const spacing = xmlDoc.createElementNS(wNs, 'w:spacing');
  spacing.setAttribute('w:after', '40');
  spacing.setAttribute('w:before', '80');
  spacing.setAttribute('w:line', '276');
  pPr.appendChild(spacing);
  p.appendChild(pPr);
  
  // Bold run: Project Name
  const nameRun = createRun(xmlDoc, wNs, project.repoName, { bold: true, fontSize: '22' });
  p.appendChild(nameRun);
  
  // Links (if any)
  const links = [];
  if (config.showGithub && project.html_url) links.push('GitHub');
  if (config.showDemo && config.demoUrl) links.push('Live Demo');
  
  if (links.length > 0) {
    const linkSep = createRun(xmlDoc, wNs, '  |  ', { fontSize: '20', color: '808080' });
    p.appendChild(linkSep);
    const linkText = createRun(xmlDoc, wNs, links.join(' | '), { italic: true, fontSize: '20', color: '2563EB' });
    p.appendChild(linkText);
  }
  
  // Separator
  const sep = createRun(xmlDoc, wNs, '  |  ', { fontSize: '20', color: '808080' });
  p.appendChild(sep);
  
  // Italic run: Tech Stack
  const techText = (project.techStack || []).join(', ');
  const techRun = createRun(xmlDoc, wNs, techText, { italic: true, fontSize: '20' });
  p.appendChild(techRun);
  
  return p;
}

/**
 * Create a bullet point paragraph with a dash prefix
 */
function createBulletParagraph(xmlDoc, wNs, bulletText) {
  const p = xmlDoc.createElementNS(wNs, 'w:p');
  
  // Paragraph properties with left indent and tight spacing
  const pPr = xmlDoc.createElementNS(wNs, 'w:pPr');
  
  // Indent
  const ind = xmlDoc.createElementNS(wNs, 'w:ind');
  ind.setAttribute('w:left', '360');
  ind.setAttribute('w:hanging', '180');
  pPr.appendChild(ind);
  
  // Tight line spacing
  const spacing = xmlDoc.createElementNS(wNs, 'w:spacing');
  spacing.setAttribute('w:after', '20');
  spacing.setAttribute('w:line', '264');
  pPr.appendChild(spacing);
  
  p.appendChild(pPr);
  
  // Bullet character + text
  const bulletRun = createRun(xmlDoc, wNs, `• ${bulletText}`, { fontSize: '20' });
  p.appendChild(bulletRun);
  
  return p;
}

/**
 * Create a w:r (run) element with text and optional formatting
 */
function createRun(xmlDoc, wNs, text, options = {}) {
  const r = xmlDoc.createElementNS(wNs, 'w:r');
  
  // Run properties
  const rPr = xmlDoc.createElementNS(wNs, 'w:rPr');
  let hasProps = false;
  
  if (options.bold) {
    rPr.appendChild(xmlDoc.createElementNS(wNs, 'w:b'));
    hasProps = true;
  }
  if (options.italic) {
    rPr.appendChild(xmlDoc.createElementNS(wNs, 'w:i'));
    hasProps = true;
  }
  if (options.fontSize) {
    const sz = xmlDoc.createElementNS(wNs, 'w:sz');
    sz.setAttribute('w:val', options.fontSize); // half-points: 22 = 11pt
    rPr.appendChild(sz);
    const szCs = xmlDoc.createElementNS(wNs, 'w:szCs');
    szCs.setAttribute('w:val', options.fontSize);
    rPr.appendChild(szCs);
    hasProps = true;
  }
  if (options.color) {
    const color = xmlDoc.createElementNS(wNs, 'w:color');
    color.setAttribute('w:val', options.color);
    rPr.appendChild(color);
    hasProps = true;
  }
  if (options.font) {
    const rFonts = xmlDoc.createElementNS(wNs, 'w:rFonts');
    rFonts.setAttribute('w:ascii', options.font);
    rFonts.setAttribute('w:hAnsi', options.font);
    rPr.appendChild(rFonts);
    hasProps = true;
  }
  
  if (hasProps) r.appendChild(rPr);
  
  // Text element
  const t = xmlDoc.createElementNS(wNs, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.textContent = text;
  r.appendChild(t);
  
  return r;
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
