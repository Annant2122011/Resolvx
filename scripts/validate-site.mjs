import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = ['index.html', 'features.html', 'wiki.html'];
const visibleFiles = [...htmlFiles, 'site.js', 'styles.css', 'mobile.css', 'README.md', 'api/translate.js', 'netlify/functions/translate.js', 'scripts/test-search.mjs', 'scripts/test-translation-proxy.cjs', 'scripts/test-client-translation.mjs'];
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
  // This is a Vercel-managed runtime route, not a file that belongs in the static source tree.
  // It powers optional analytics on Vercel and is not expected to exist on GitHub Pages.
  if (url === '/_vercel/insights/script.js') return;

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
      : beforeQuery.startsWith('/')
        ? path.posix.normalize(beforeQuery.replace(/^\/+/, ''))
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
  const ariaReferencePatterns = [
    ['aria-labelledby', /\baria-labelledby=["']([^"']+)["']/gi],
    ['aria-describedby', /\baria-describedby=["']([^"']+)["']/gi],
    ['aria-controls', /\baria-controls=["']([^"']+)["']/gi],
  ];
  for (const [attributeName, referencePattern] of ariaReferencePatterns) {
    for (const match of source.matchAll(referencePattern)) {
      for (const referencedId of match[1].split(/\s+/)) {
        if (referencedId && !pageIds.get(file)?.has(referencedId)) {
          report(file + ': ' + attributeName + ' references missing id="' + referencedId + '"');
        }
      }
    }
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

const suppliedLogoUrl = 'https://i.ibb.co/fdRDWXbH/3v-OKZCYL0-Rqkdu-OQ4t-PKA-Xt-Cc-OQu-N-Picsart-Ai-Image-Enhancer.png';
for (const file of htmlFiles) {
  const iconTags = [...pageContents.get(file).matchAll(/<link\b[^>]*\brel="icon"[^>]*>/gi)].map((match) => attributes(match[0]));
  const pngIcons = iconTags.filter((icon) => (icon.type || '').toLowerCase() === 'image/png');
  const pngIcon = pngIcons[0];
  const appleIcon = [...pageContents.get(file).matchAll(/<link\b[^>]*\brel="apple-touch-icon"[^>]*>/gi)]
    .map((match) => attributes(match[0]))[0];
  if (iconTags.length !== 1 || pngIcons.length !== 1 || !pngIcon ||
      !pngIcon.href.startsWith(suppliedLogoUrl) || pngIcon.sizes !== '512x512') {
    report(`${file}: use the supplied QF logo as one unambiguous 512 x 512 PNG favicon`);
  }
  if (iconTags.some((icon) => (icon.type || '').toLowerCase() === 'image/svg+xml' ||
      (icon.href || '').startsWith('favicon.svg'))) {
    report(`${file}: remove the redundant SVG fallback favicon so it cannot compete with the primary logo icon`);
  }
  if (!appleIcon || !appleIcon.href.startsWith(suppliedLogoUrl)) {
    report(`${file}: Apple touch icon must use the supplied transparent QF artwork`);
  }
  const source = pageContents.get(file);
  if (!source.includes('class="header-brand-link"') || !source.includes('</a><span class="brand-tagline"')) {
    report(`${file}: only the QueryFixr logo should be clickable; keep the tagline outside its anchor`);
  }
  if (!source.includes('data-brand="queryfixr-qf-mark"') || !source.includes('class="brand-image brand-qf-logo"')) {
    report(`${file}: header must use the supplied transparent QF logo mark`);
  }
  if (file === 'index.html' && !source.includes('class="hero-banner-image" src="https://i.ibb.co/mrg8Kh3y/Query-Fixr-3-D-brand-logo-2-K-20261022185526-Picsart-Ai-Image-Enhancer-clean.png"')) {
    report('index.html: homepage hero must use the updated full-size QueryFixr wordmark');
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
const singleQueryCollectionCall = /(^|[^$])\$\([^)]*\)\s*\.\s*(?:forEach|map|filter|reduce|find|some|every)\b/;
for (const line of jsLines) {
  if (singleQueryCollectionCall.test(line)) {
    report(`site.js: a single-element query result is being used as a collection: ${line.trim()}`);
  }
}

if (!jsLines.some((line) => line.startsWith("const focusable = $$('input:not([disabled])"))) {
  report('site.js: search-dialog focus trapping must collect all focusable elements');
}
if (!js.includes("const featureCards = $$('[data-feature-card]');")) {
  report('site.js: feature filtering must select all feature cards with the collection helper');
}
if (!js.includes("const results = $$('[data-search-result]', globalResults || document);")) {
  report('site.js: global-search arrow navigation must select all rendered search results with the collection helper');
}
if (!js.includes("if (!overlay.hidden && event.key === 'Tab')")) {
  report('site.js: global search must keep keyboard focus inside its modal dialog');
}
if (!js.includes("$$('.brand-full-logo, .brand-qf-logo, .hero-banner-image, .cta-logo').forEach((image) => {")) {
  report('site.js: artwork fallback initialization must iterate over all matching images');
}
if (!js.includes("wikiInput.addEventListener('input', () => applyWikiSearch(wikiInput.value));")) {
  report('site.js: wiki search input must rerun the search as the visitor types');
}
if (!js.includes("featureSearchInput.addEventListener('input', () => applyFeatureSearch(featureSearchInput.value));")) {
  report('site.js: feature search input must rerun the catalogue filter as the visitor types');
}
if (!js.includes("globalInput.addEventListener('input', () => renderGlobalResults(globalInput.value));")) {
  report('site.js: global search input must refresh results as the visitor types');
}
if (!js.includes("event.key.toLowerCase() === 'k' && event.altKey") || js.includes("event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)")) {
  report('site.js: global search must use the non-conflicting Alt+K shortcut, not Ctrl+K');
}
if (!js.includes("function installSiteLanguageControl()") || !js.includes("button.addEventListener('click', () => { void translateSitePage(select.value, status, button); });")) {
  report('site.js: the website language selector must install a working translate button');
}
if (!js.includes('function createTranslationBatches(values)') ||
    !js.includes('async function translateBatchesWithConcurrency(') ||
    !js.includes("indexError.code = 'SEARCH_INDEX_UNAVAILABLE'") ||
    !js.includes('No partial translation was applied.')) {
  report('site.js: translation must enforce bounded provider payloads, bounded concurrency, and visible cross-page search-index failures');
}
const dropdownStylesheet = readFileSync(path.join(root, 'styles.css'), 'utf8');
if (!dropdownStylesheet.includes('.site-language-switcher select option') ||
    !dropdownStylesheet.includes('color-scheme: dark;') ||
    !dropdownStylesheet.includes('background-color: #151827;')) {
  report('styles.css: translation dropdown options need explicit high-contrast dark menu colors');
}
if (/<s\b/i.test(pageContents.get('index.html')) || !pageContents.get('index.html').includes('<h1>QueryFixr<br>')) {
  report('index.html: homepage brand name must display without strikethrough');
}

if (
  !js.includes("const mobileViewport = window.matchMedia('(max-width: 760px)');") ||
  !js.includes("mobileViewport.addEventListener('change', syncNavigationForViewport)") ||
  !js.includes("mobileViewport.addListener(syncNavigationForViewport)")
) {
  report('site.js: mobile navigation must reset safely across viewport changes, including older Safari');
}

const commandDocumentation = wikiSource + '\n' + js;
if (commandDocumentation.includes('/qf')) {
  report('wiki.html/site.js: stale /qf command root found; the bot currently registers /supportforge');
}
if (!commandDocumentation.includes('/supportforge ticket claim')) {
  report('wiki.html: expected /supportforge command examples are missing');
}
if (js.includes('QUERYFIXR_TRANSLATION_API_KEY')) {
  report('site.js: do not send browser-exposed translation API keys to public endpoints');
}
if (!js.includes('window.setTimeout(() => controller.abort(), timeoutMs)') ||
    !js.includes('const SAME_ORIGIN_TRANSLATION_ENDPOINT') ||
    !js.includes('const TRANSLATION_CACHE_LIMIT = 2200')) {
  report('site.js: translation must use bounded requests, a same-origin proxy, and a persistent bounded cache');
}
const netlifyTranslationProxySource = readFileSync(path.join(root, 'netlify/functions/translate.js'), 'utf8');
if (!netlifyTranslationProxySource.includes("require('../../api/translate.js')") ||
    !js.includes('NETLIFY_TRANSLATION_ENDPOINT')) {
  report('Netlify deployment must expose the same-origin translation proxy and be listed as a client fallback.');
}
if (!js.includes('segments.push({ text: defaultDocumentTitle')) {
  report('site.js: page translation must include the document title as translatable text.');
}
const translationProxySource = readFileSync(path.join(root, 'api/translate.js'), 'utf8');
for (const contract of [
  ['async function requestTranslationWithFailover(', 'multi-provider request failover'],
  ['async function requestGoogleEndpoint(', 'independent final provider fallback'],
  ['function normalizeRequestBody(body)', 'strict request validation'],
  ['function checkRateLimit(req)', 'translation rate limiting'],
  ['Cross-origin translation requests are not allowed.', 'same-origin request protection'],
  ['module.exports._test', 'unit-test access to pure validation helpers'],
]) {
  if (!translationProxySource.includes(contract[0])) report('api/translate.js: missing ' + contract[1]);
}
if (!translationProxySource.includes('MAX_TEXTS_PER_REQUEST = 16') ||
    !translationProxySource.includes('MAX_TOTAL_CHARACTERS = 4000') ||
    !translationProxySource.includes('REQUEST_TIMEOUT_MS')) {
  report('api/translate.js: translation proxy must keep request-size limits and finite provider timeouts');
}
if (!translationProxySource.includes('endpoint === configuredEndpoint')) {
  report('api/translate.js: a configured API key must only be sent to its own configured translation provider');
}
if (!js.includes("new URL('/.netlify/functions/translate', window.location.origin)") ||
    !js.includes('const SAME_ORIGIN_TRANSLATION_ENDPOINT')) {
  report('site.js: translation must support both Vercel and Netlify same-origin proxy routes');
}
if (!js.includes('brand-text-fallback') || !js.includes('hero-banner-fallback')) {
  report('site.js: externally hosted brand and hero images need graceful visual fallbacks');
}

const faqCount = [...wikiSource.matchAll(/\bdata-wiki-faq\b/g)].length;
const homeSearchSectionCount = [...pageContents.get('index.html').matchAll(/<section\b[^>]*\bid=/gi)].length;
const searchDestinationEstimate = featureCards.length + wikiArticles + faqCount + homeSearchSectionCount;
for (const requiredPath of ['index.html', 'features.html', 'wiki.html']) {
  if (!js.includes("path: '" + requiredPath + "'")) report(`site.js: global search index is missing ${requiredPath}`);
}
for (const contract of [
  ["async function buildSearchIndex()", 'cross-page search index builder'],
  ["async function ensureSearchIndex()", 'shared search index loader'],
  ["function boundedEditDistanceOne(", 'search typo tolerance'],
  ["const SEARCH_SYNONYM_GROUPS = [", 'multilingual synonyms'],
  ["doc.querySelectorAll('[data-feature-card]')", 'feature catalogue indexing'],
  ["doc.querySelectorAll('[data-wiki-article]')", 'wiki article indexing'],
  ["doc.querySelectorAll('[data-wiki-faq]')", 'individual FAQ indexing'],
  ["main.querySelectorAll('section[id]')", 'homepage section indexing'],
  ["searchScore(corpus, query)", 'ranked global search'],
]) {
  if (!js.includes(contract[0])) report(`site.js: global search must include ${contract[1]}`);
}
if (faqCount === 0) report('wiki.html: the search index has no FAQ entries available');
if (!js.includes("item.hidden = !match;")) report('site.js: wiki search must filter individual FAQ answers');
if (js.includes("faqItems.forEach((item) => { item.hidden = false; });")) {
  report('site.js: a section-title match must not reveal unrelated FAQ answers');
}
if (!js.includes("const SEARCH_RUNTIME_COPY = Object.fromEntries([")) {
  report('site.js: dynamically rendered search UI must have locale-aware labels');
}

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

const sharedCss = readFileSync(path.join(root, 'styles.css'), 'utf8');
const mobileCss = readFileSync(path.join(root, 'mobile.css'), 'utf8');
if (!sharedCss.includes('aspect-ratio: 16 / 9')) {
  report('styles.css: Home and Features CTA panels must use a landscape 16:9 ratio on desktop');
}
if (!sharedCss.includes('.closing-cta.compact-cta .cta-decoration .cta-logo') ||
    !sharedCss.includes('width: clamp(190px, 18vw, 220px)')) {
  report('styles.css: the actual orbital center logo must be enlarged independently of the rings');
}
if (!mobileCss.includes('aspect-ratio: auto;') ||
    !mobileCss.includes('.closing-cta.compact-cta .cta-decoration .cta-logo')) {
  report('mobile.css: CTA panels must be content-height on phones and use phone-sized center marks');
}


const finalCtaRuleStart = sharedCss.lastIndexOf('/* Final CTA correction: landscape means wide, not cropped to a forced ratio. */');
const finalCtaMotionStart = sharedCss.lastIndexOf('/* Layered depth and expressive motion, without additional libraries. */');
const finalCtaStyles = finalCtaRuleStart >= 0 ? sharedCss.slice(finalCtaRuleStart, finalCtaMotionStart > finalCtaRuleStart ? finalCtaMotionStart : undefined) : '';
if (!finalCtaStyles.includes('aspect-ratio: auto;') ||
    !finalCtaStyles.includes('min-height: clamp(480px, 42vw, 560px);') ||
    !finalCtaStyles.includes('overflow-wrap: normal;') ||
    !finalCtaStyles.includes('grid-template-columns: minmax(0, 1.12fr) minmax(270px, .88fr);')) {
  report('styles.css: desktop landscape CTA must grow with its copy instead of clipping text to a forced aspect ratio');
}
if (!sharedCss.includes('@keyframes rx-orbit-clockwise') ||
    !sharedCss.includes('@keyframes rx-orbit-float') ||
    !sharedCss.includes('@keyframes rx-button-sheen') ||
    !sharedCss.includes('.motion-enhanced .motion-reveal.motion-visible')) {
  report('styles.css: enhanced motion needs orbit, button-sheen, and scroll-reveal definitions');
}
if (!mobileCss.includes('height: auto;') ||
    !mobileCss.includes('min-height: 0;') ||
    !mobileCss.includes('.closing-cta:not(.compact-cta) .cta-content h2')) {
  report('mobile.css: mobile CTA must size to its content and keep its full heading readable');
}
if (!js.includes('function installVisualMotionEnhancements()') ||
    !js.includes(\"window.matchMedia('(prefers-reduced-motion: reduce)')\") ||
    !js.includes(\"'IntersectionObserver' in window\") ||
    !js.includes('window.requestAnimationFrame')) {
  report('site.js: visual motion must use progressive scroll reveals, reduced-motion checks, and frame-coalesced pointer highlights');
}

if (errors.length) {
  console.error(`QueryFixr site validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  console.log(
    `QueryFixr site validation passed: ${htmlFiles.length} pages, ${featureCards.length} feature cards, ${wikiArticles} wiki articles, ${faqCount} FAQ entries, ${tocLinks.length} TOC links, approximately ${searchDestinationEstimate} cross-page search destinations, valid internal links/anchors, no duplicate IDs, and balanced CSS.`,
  );
}
