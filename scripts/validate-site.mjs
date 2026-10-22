import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = ['index.html', 'features.html', 'wiki.html'];
const visibleFiles = [...htmlFiles, 'site.js', 'styles.css', 'mobile.css', 'README.md', 'favicon-local.svg'];
const errors = [];
const pageContents = new Map();
const pageIds = new Map();

function report(message) {
  errors.push(message);
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? '';
  }
  return result;
}

function isExternal(url) {
  return /^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(url) || url.startsWith('//');
}

function checkRelativeReference(fromFile, rawUrl, kind) {
  const url = rawUrl.trim();
  if (!url || isExternal(url)) return;
  const [beforeHash, rawFragment] = url.split('#', 2);
  const fragment = rawFragment ? decodeURIComponent(rawFragment) : '';
  const beforeQuery = (beforeHash || '').split('?')[0];
  const targetRelative = !beforeQuery || beforeQuery === '.' || beforeQuery === './'
    ? (fromFile.endsWith('.html') ? fromFile : 'index.html')
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), beforeQuery));
  const targetPath = path.resolve(root, targetRelative);
  if (!targetPath.startsWith(root + path.sep) && targetPath !== root) {
    report(`${fromFile}: ${kind} escapes the site root: ${url}`);
    return;
  }
  if (!existsSync(targetPath)) {
    report(`${fromFile}: missing ${kind} target ${url} (resolved to ${targetRelative})`);
    return;
  }
  if (!fragment) return;
  const target = pageContents.get(targetRelative);
  if (target && !pageIds.get(targetRelative)?.has(fragment)) {
    report(`${fromFile}: broken anchor ${url} (no id="${fragment}" in ${targetRelative})`);
  }
}

function checkCssBraces(file, source) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let inComment = false;
  for (let i = 0; i < source.length; i += 1) {
    const current = source[i];
    const next = source[i + 1];
    if (inComment) {
      if (current === '*' && next === '/') { inComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (current === '\\') { escaped = true; continue; }
      if (current === quote) quote = '';
      continue;
    }
    if (current === '/' && next === '*') { inComment = true; i += 1; continue; }
    if (current === '"' || current === "'") { quote = current; continue; }
    if (current === '{') depth += 1;
    if (current === '}') {
      depth -= 1;
      if (depth < 0) report(`${file}: closing brace without a matching opening brace`);
    }
  }
  if (depth !== 0) report(`${file}: unbalanced CSS braces (depth ${depth})`);
  if (quote || inComment) report(`${file}: unclosed CSS string or comment`);
}

for (const file of htmlFiles) {
  const source = readFileSync(path.join(root, file), 'utf8');
  pageContents.set(file, source);
  const ids = new Set();
  for (const match of source.matchAll(/\bid=["']([^"']+)["']/g)) {
    if (ids.has(match[1])) report(`${file}: duplicate id="${match[1]}"`);
    ids.add(match[1]);
  }
  pageIds.set(file, ids);
}

for (const file of htmlFiles) {
  const source = pageContents.get(file);
  for (const match of source.matchAll(/<(?:a|link)\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    checkRelativeReference(file, match[1], 'href');
  }
  for (const match of source.matchAll(/<(?:script|img|source)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    checkRelativeReference(file, match[1], 'src');
  }
  for (const match of source.matchAll(/<img\b[^>]*>/gi)) {
    if (!Object.hasOwn(attributes(match[0]), 'alt')) report(`${file}: image is missing an alt attribute: ${match[0].slice(0, 100)}`);
  }
  const stylesPos = source.indexOf('href="styles.css"');
  const mobilePos = source.indexOf('href="mobile.css"');
  if (stylesPos < 0 || mobilePos < 0 || mobilePos < stylesPos) {
    report(`${file}: must load mobile.css after styles.css`);
  }
}

const allIds = pageIds.get('wiki.html') || new Set();
const wikiArticles = [...pageContents.get('wiki.html').matchAll(/<article\b[^>]*\bdata-wiki-article\b/g)].length;
const tocLinks = [...pageContents.get('wiki.html').matchAll(/<a\b[^>]*\bclass=["'][^"']*\bwiki-toc-link\b[^"']*["'][^>]*\bhref=["']#([^"']+)/g)];
if (tocLinks.length !== wikiArticles) {
  report(`wiki.html: table of contents has ${tocLinks.length} links for ${wikiArticles} articles`);
}
for (const match of tocLinks) {
  if (!allIds.has(match[1])) report(`wiki.html: table of contents points to missing article #${match[1]}`);
}

const featureCards = [...pageContents.get('features.html').matchAll(/<a\b[^>]*\bdata-feature-card\b[^>]*>/g)];
const declaredFeatureCount = Number(pageContents.get('features.html').match(/data-feature-result-count[^>]*>(\d+)/)?.[1] ?? NaN);
if (!Number.isFinite(declaredFeatureCount) || declaredFeatureCount !== featureCards.length) {
  report(`features.html: feature result count (${declaredFeatureCount}) does not match card count (${featureCards.length})`);
}

const oldBrandNames = ['Resolv' + 'X', 'Resolve' + 'X', 'resolv' + 'x'];
for (const file of visibleFiles) {
  const source = readFileSync(path.join(root, file), 'utf8').toLowerCase();
  for (const name of oldBrandNames) {
    if (source.includes(name.toLowerCase())) {
      report(`${file}: visible source still contains legacy brand wording`);
      break;
    }
  }
}

const js = readFileSync(path.join(root, 'site.js'), 'utf8');
const knownArticleAnchors = [...js.matchAll(/url:\s*['"]wiki\.html#([^'"]+)['"]/g)].map((match) => match[1]);
for (const anchor of new Set(knownArticleAnchors)) {
  if (!allIds.has(anchor)) report(`site.js: global search points to missing wiki article #${anchor}`);
}
if (knownArticleAnchors.length === 0) report('site.js: no wiki destinations found in the global search index');

for (const cssFile of ['styles.css', 'mobile.css']) {
  checkCssBraces(cssFile, readFileSync(path.join(root, cssFile), 'utf8'));
}

if (errors.length) {
  console.error(`QueryFixr site validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  console.log(
    `QueryFixr site validation passed: ${htmlFiles.length} pages, ${featureCards.length} feature cards, ${wikiArticles} wiki articles, ${tocLinks.length} TOC links, ${new Set(knownArticleAnchors).size} distinct global-search destinations, valid internal links/anchors, no duplicate IDs, and balanced CSS.`,
  );
}
