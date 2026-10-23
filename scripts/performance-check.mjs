import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const pages = ['index.html', 'features.html', 'wiki.html'];

for (const pagePath of pages) {
  const html = read(pagePath);
  const fontUrl = html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/)?.[1] || '';
  if (!fontUrl.includes('Manrope:wght@400..800') || !fontUrl.includes('display=swap')) {
    errors.push(pagePath + ': use the variable Manrope font range and font-display swap.');
  }
  if (/Manrope:wght@400;500;600;700;800/.test(fontUrl)) {
    errors.push(pagePath + ': do not request every Manrope weight as a separate static family.');
  }

  if (!html.includes('class="mesh-background"')) {
    errors.push(pagePath + ': moving mesh background layer is missing.');
  }
  if (html.includes('https://i.ibb.co/')) {
    errors.push(pagePath + ': runtime markup must not load artwork from the external source host.');
  }

  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  for (const tag of imageTags) {
    if (!/\bdecoding="async"/i.test(tag)) {
      errors.push(pagePath + ': every content image should use async decoding.');
    }
  }
  const highPriorityImages = imageTags.filter((tag) => /\bfetchpriority="high"/i.test(tag));
  if (pagePath === 'index.html') {
    if (highPriorityImages.length !== 1 || !/hero-banner-image/.test(highPriorityImages[0] || '')) {
      errors.push('index.html: the hero artwork must be the only high-priority image on the homepage.');
    }
    if (!/class="hero-banner-image"[^>]*fetchpriority="high"[^>]*decoding="async"/i.test(html)) {
      errors.push('index.html: hero artwork must remain eager, high-priority, and async-decoded.');
    }
  } else if (highPriorityImages.length !== 0) {
    errors.push(pagePath + ': the small brand mark must not compete with critical content for high image priority.');
  }
}

const js = read('site.js');
const batchStart = js.indexOf('async function translateBatch(values, targetApi)');
const batchEnd = js.indexOf('const TRANSLATION_BATCH_MAX_ITEMS', batchStart);
const batchFunction = batchStart >= 0 && batchEnd > batchStart ? js.slice(batchStart, batchEnd) : '';
if (!js.includes('function ensureTranslationCacheLoaded()') || !batchFunction.includes('ensureTranslationCacheLoaded();')) {
  errors.push('site.js: translation cache must be loaded on demand, not parsed during every initial page load.');
}
if (/const cached = JSON\.parse\(localStorage\.getItem\(TRANSLATION_CACHE_KEY/.test(js.slice(0, js.indexOf('function ensureTranslationCacheLoaded()')))) {
  errors.push('site.js: translation-cache JSON parsing must not run at top level.');
}
if (!js.includes('let readingProgressFrame = 0;') ||
    !js.includes('let maxReadingScroll = 0;') ||
    !js.includes('scheduleReadingRangeMeasure') ||
    !js.includes('readingProgressFrame = window.requestAnimationFrame(') ||
    !js.includes("window.addEventListener('scroll', updateReadingProgress, { passive: true });")) {
  errors.push('site.js: reading progress must batch scroll work and cache document-height measurements.');
}

const revealStart = js.indexOf('const revealTargets =');
const revealEnd = js.indexOf('const pointerTargets =', revealStart);
const revealSelectors = revealStart >= 0 && revealEnd > revealStart ? js.slice(revealStart, revealEnd) : '';
if (['.hero-copy', '.hero-art.hero-banner-art', '.page-hero', '.feature-library-hero', '.wiki-hero', '.wiki-search-card'].some((selector) => revealSelectors.includes("'" + selector + "'"))) {
  errors.push('site.js: above-the-fold hero content must not wait for scroll-reveal observation.');
}

const styles = read('styles.css');
const mobile = read('mobile.css');
if (/will-change:\s*opacity,\s*translate,\s*filter/.test(styles) ||
    /\.motion-enhanced \.motion-reveal\s*\{[^}]*filter:\s*blur\(/s.test(styles) ||
    /\.motion-enhanced \.motion-reveal\s*\{[^}]*filter:\s*blur\(/s.test(mobile)) {
  errors.push('styles.css/mobile.css: scroll reveals must avoid persistent filter promotion and animated blur.');
}
if (!styles.includes('.mesh-background') || !styles.includes('@keyframes rx-mesh-drift') ||
    !styles.includes('.mesh-background {\n    animation: none !important;')) {
  errors.push('styles.css: mesh motion must be CSS-only and respect reduced-motion preferences.');
}
const logoAnimationStart = styles.lastIndexOf('@keyframes rx-logo-breathe');
const logoAnimationEnd = styles.indexOf('\n}', logoAnimationStart);
const logoAnimation = logoAnimationStart >= 0 && logoAnimationEnd > logoAnimationStart ? styles.slice(logoAnimationStart, logoAnimationEnd + 2) : '';
if (logoAnimation.includes('filter:')) {
  errors.push('styles.css: logo breathing animation must not animate filter/drop-shadow.');
}

const optimizedAssetBudgets = [
  ['assets/images/queryfixr-mark-96.webp', 10000],
  ['assets/images/queryfixr-mark-384.webp', 45000],
  ['assets/images/queryfixr-hero-640.webp', 35000],
  ['assets/images/queryfixr-hero-900.webp', 50000],
  ['assets/images/queryfixr-favicon.png', 15000],
  ['assets/images/queryfixr-apple-touch-icon.png', 16000],
];
let optimizedAssetBytes = 0;
for (const [assetPath, maxBytes] of optimizedAssetBudgets) {
  try {
    const bytes = statSync(join(root, assetPath)).size;
    optimizedAssetBytes += bytes;
    if (bytes > maxBytes) errors.push(assetPath + ': ' + bytes + 'B exceeds the ' + maxBytes + 'B asset budget.');
  } catch {
    errors.push(assetPath + ': optimized image asset is missing; run npm run build before validation.');
  }
}
if (optimizedAssetBytes > 160000) {
  errors.push('Optimized image assets exceed the combined 160 KB transfer budget: ' + optimizedAssetBytes + 'B.');
}

const vercel = JSON.parse(read('vercel.json'));
if (vercel.buildCommand !== 'npm run build' || vercel.outputDirectory !== 'dist') {
  errors.push('vercel.json: production must build and serve the generated dist directory.');
}
for (const path of ['/styles.css', '/mobile.css', '/site.js']) {
  const route = vercel.headers?.find((entry) => entry.source === path);
  const value = route?.headers?.find((entry) => entry.key.toLowerCase() === 'cache-control')?.value || '';
  if (!value.includes('max-age=300') || !value.includes('s-maxage=86400')) {
    errors.push('vercel.json: ' + path + ' must have browser and CDN cache lifetimes.');
  }
}

if (errors.length) {
  console.error('Website performance checks failed:');
  errors.forEach((error) => console.error(' - ' + error));
  process.exitCode = 1;
} else {
  const sizes = ['styles.css', 'mobile.css', 'site.js'].map((path) => ({
    path,
    bytes: statSync(join(root, path)).size,
  }));
  console.log('Website performance checks passed: moving mesh, responsive local WebP assets within budget, visible first-screen content, cached reading progress, reduced-motion support, and static-asset caching.');
  console.log('Optimized image bytes: ' + optimizedAssetBytes + 'B. Source asset sizes (before HTTP compression): ' + sizes.map((entry) => entry.path + '=' + entry.bytes + 'B').join(', '));
}
