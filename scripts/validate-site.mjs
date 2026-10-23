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
  return /^(?:https?:|mailto:|tel:|data:|blob:)/i.test(url) || url.startsWith('//');
}

function checkRelativeReference(fromFile, rawUrl, kind) {
  const url = rawUrl.trim();
  if (!url) return;
  if (/^javascript:/i.test(url)) {
    report(`${fromFile}: unsafe javascript URL in ${kind}: ${url}`);
    return;
  }
  if (isExternal(url)) return;
  const [beforeHash, rawFragment] = url.split('#', 2);
  let fragment = '';
  try {
    fragment = rawFragment ? decodeURIComponent(rawFragment) : '';
  } catch {
    report(`${fromFile}: malformed URI fragment in ${kind}: ${url}`);
    return;
  }
  const beforeQuery = (beforeHash || '').split('?')[0];
  const targetRelative = !beforeQuery
    ? fromFile
    : (beforeQuery === '.' || beforeQuery === './')
      ? 'index.html'
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
  const htmlTag = source.match(/<html\b[^>]*>/i)?.[0] || '';
  if (!/\blang\s*=/i.test(htmlTag)) report(`${file}: root html element is missing a language declaration`);
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(source)) report(`${file}: responsive viewport meta tag is missing`);
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
  for (const match of source.matchAll(/<button\b[^>]*>/gi)) {
    if (!/\s+type\s*=/i.test(match[0])) report(`${file}: button is missing an explicit type: ${match[0].slice(0, 100)}`);
  }
  const labelForIds = new Set([...source.matchAll(/<label\b[^>]*\bfor=["']([^"']+)["']/gi)].map((match) => match[1]));
  for (const match of source.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const named = attrs['aria-label'] || attrs['aria-labelledby'] || (attrs.id && labelForIds.has(attrs.id));
    if (!named && attrs.type !== 'hidden') report(`${file}: form control has no associated label or accessible name: ${match[0].slice(0, 100)}`);
  }
  for (const match of source.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (!/\b(?:noopener|noreferrer)\b/i.test(attrs.rel || '')) report(`${file}: target="_blank" link should include rel="noopener noreferrer": ${match[0].slice(0, 100)}`);
  }
  for (const match of source.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attrs = attributes('<button ' + match[1] + '>');
    const readableText = match[2]
      .replace(/<[^>]*\baria-hidden=["']true["'][^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(?:nbsp|#160);/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!(attrs['aria-label'] || attrs['aria-labelledby'] || attrs.title || readableText)) {
      report(file + ': button has no accessible name: ' + match[0].slice(0, 100));
    }
    if (attrs['aria-controls']) {
      for (const controlledId of attrs['aria-controls'].split(/\s+/)) {
        if (controlledId && !pageIds.get(file)?.has(controlledId)) {
          report(file + ': button aria-controls references missing id="' + controlledId + '"');
        }
      }
    }
  }
  const stylesPos = source.indexOf('href="styles.css"');
  const mobilePos = source.indexOf('href="mobile.css"');
  if (stylesPos < 0 || mobilePos < 0 || mobilePos < stylesPos) {
    report(`${file}: must load mobile.css after styles.css`);
  }
}

const allIds = pageIds.get('wiki.html') || new Set();
const wikiArticles = [...pageContents.get('wiki.html').matchAll(/<article\b[^>]*\bdata-wiki-article\b/g)].length;
const tocLinks = [];
for (const match of pageContents.get('wiki.html').matchAll(/<a\b[^>]*>/gi)) {
  const attrs = attributes(match[0]);
  if ((attrs.class || '').split(/\s+/).includes('wiki-toc-link') && (attrs.href || '').startsWith('#')) {
    tocLinks.push(attrs.href.slice(1));
  }
}
if (wikiArticles === 0) report('wiki.html: no wiki articles were detected');
const wikiSource = pageContents.get('wiki.html');
const articleTags = [...wikiSource.matchAll(/<article\b[^>]*\bdata-wiki-article\b[^>]*>/gi)].map((match) => match[0]);
const articleIds = articleTags.map((tag) => attributes(tag).id).filter(Boolean);
if (articleIds.length !== wikiArticles) report(`wiki.html: ${wikiArticles} articles were detected but only ${articleIds.length} have IDs`);
if (tocLinks.length === 0) report('wiki.html: no table-of-contents links were detected');
const articleIdSet = new Set(articleIds);
const tocIdSet = new Set(tocLinks);
if (tocIdSet.size !== tocLinks.length) report('wiki.html: table of contents contains duplicate article targets');
for (const anchor of articleIds) if (!tocIdSet.has(anchor)) report(`wiki.html: article #${anchor} is missing from the table of contents`);
for (const anchor of tocLinks) if (!articleIdSet.has(anchor)) report(`wiki.html: table-of-contents target #${anchor} is not a wiki article`);
if (tocLinks.length !== wikiArticles) {
  report(`wiki.html: table of contents has ${tocLinks.length} links for ${wikiArticles} articles`);
}
for (const anchor of tocLinks) {
  if (!allIds.has(anchor)) report(`wiki.html: table of contents points to missing article #${anchor}`);
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
const jsLines = js.split(/\r?\n/).map((line) => line.trimStart());
for (const unsafePrefix of [
  "$('[data-wiki-faq]', article).forEach",
  "$('[data-clear-feature-search]').forEach",
  "const focusable = $('input:not([disabled])",
]) {
  if (jsLines.some((line) => line.startsWith(unsafePrefix))) report(`site.js: invalid single-element collection operation: ${unsafePrefix}`);
}
if (!jsLines.some((line) => line.startsWith("const focusable = $$('input:not([disabled])"))) {
  report('site.js: search-dialog focus trapping must collect all focusable elements');
}
if (!js.includes("const featureCards = $$('[data-feature-card]');")) {
  report('site.js: feature filtering must select all feature cards with the collection helper');
}
if (!js.includes("const results = $$('.global-search-result', globalResults || document);")) {
  report('site.js: global-search arrow navigation must select all results with the collection helper');
}
if (!js.includes("if (!overlay.hidden && event.key === 'Tab')")) {
  report('site.js: global search must keep keyboard focus inside its modal dialog');
}
if (
  !js.includes("const mobileViewport = window.matchMedia('(max-width: 760px)');") ||
  !js.includes("mobileViewport.addEventListener('change', syncNavigationForViewport)") ||
  !js.includes("mobileViewport.addListener(syncNavigationForViewport)")
) {
  report('site.js: mobile navigation must reset safely across viewport changes, including older Safari');
}

const knownArticleAnchors = [...js.matchAll(/url:\s*['"]wiki\.html#([^'"]+)['"]/g)].map((match) => match[1]);
for (const anchor of new Set(knownArticleAnchors)) {
  if (!allIds.has(anchor)) report(`site.js: global search points to missing wiki article #${anchor}`);
}
if (knownArticleAnchors.length === 0) report('site.js: no wiki destinations found in the global search index');

for (const cssFile of ['styles.css', 'mobile.css']) {
  const source = readFileSync(path.join(root, cssFile), 'utf8');
  checkCssBraces(cssFile, source);
  if (cssFile === 'mobile.css') {
    const mobileContracts = [
      [/\.nav-links\s*\{[^}]*display:\s*none/s, 'mobile navigation must start collapsed'],
      [/\.nav-links\.open\s*\{[^}]*display:\s*flex/s, 'mobile navigation must have an explicit open state'],
      [/\.nav-links \.nav-link,\s*\.nav-links \.nav-cta,\s*\.nav-links \.quick-search\s*\{[^}]*min-height:\s*46px/s, 'mobile navigation items must keep touch-sized targets'],
      [/\.wiki-toc\s*\{[^}]*overflow-x:\s*auto/s, 'mobile wiki contents rail must scroll horizontally'],
      [/\.global-search-form input,\s*\.wiki-search-input input,\s*#wiki-search,\s*\[data-global-search\]\s*\{[^}]*font-size:\s*16px/s, 'mobile search inputs must use at least 16px text to avoid iOS auto-zoom'],
    ];
    for (const [pattern, message] of mobileContracts) {
      if (!pattern.test(source)) report(`mobile.css: ${message}`);
    }
  }
  for (const match of source.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
    const target = match[2].trim();
    if (target && !target.startsWith('#')) checkRelativeReference(cssFile, target, 'CSS url()');
  }
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
