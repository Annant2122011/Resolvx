import sharp from 'sharp';
import { access, copyFile, cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const assetDirectory = path.join(root, 'assets', 'images');
const distDirectory = path.join(root, 'dist');
const markSource = 'https://i.ibb.co/p6VGzczV/HTcx0584-Os-Oe-YAj-O5qp61-x5-PHKm89.png';
const heroSource = 'https://i.ibb.co/4Z8NN3w0/Query-Fixr-3-D-brand-logo-2-K-20261022185526-Picsart-Ai-Image-Enhancer-clean-1.png';
const maxSourceBytes = 8 * 1024 * 1024;

async function downloadArtwork(url, label) {
  let response;
  try {
    response = await fetch(url, {
      headers: { 'user-agent': 'QueryFixr-static-image-build/1.0' },
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    throw new Error('Could not fetch ' + label + ' source artwork: ' + error.message);
  }
  if (!response.ok) throw new Error(label + ' source artwork returned HTTP ' + response.status);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(label + ' source URL did not return an image (content-type: ' + contentType + ').');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maxSourceBytes) {
    throw new Error(label + ' source image has an unexpected size: ' + bytes.byteLength + ' bytes.');
  }
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 512 || metadata.height < 512) {
    throw new Error(label + ' source image is unexpectedly small or unreadable.');
  }
  return bytes;
}

async function generateOptimizedImages() {
  await mkdir(assetDirectory, { recursive: true });
  const [markImage, heroImage] = await Promise.all([
    downloadArtwork(markSource, 'QF mark'),
    downloadArtwork(heroSource, 'homepage hero'),
  ]);
  await Promise.all([
    sharp(markImage).rotate().resize({ width: 96, height: 96, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, effort: 6, alphaQuality: 90 })
      .toFile(path.join(assetDirectory, 'queryfixr-mark-96.webp')),
    sharp(markImage).rotate().resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 68, effort: 6, alphaQuality: 90 })
      .toFile(path.join(assetDirectory, 'queryfixr-mark-384.webp')),
    sharp(heroImage).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 62, effort: 6, smartSubsample: true })
      .toFile(path.join(assetDirectory, 'queryfixr-hero-640.webp')),
    sharp(heroImage).rotate().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 56, effort: 6, smartSubsample: true })
      .toFile(path.join(assetDirectory, 'queryfixr-hero-900.webp')),
    sharp(markImage).rotate().resize({ width: 64, height: 64, fit: 'inside', withoutEnlargement: true })
      .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
      .toFile(path.join(assetDirectory, 'queryfixr-favicon.png')),
    sharp(markImage).rotate().resize({ width: 180, height: 180, fit: 'inside', withoutEnlargement: true })
      .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
      .toFile(path.join(assetDirectory, 'queryfixr-apple-touch-icon.png')),
  ]);
}

async function copyIfPresent(relativePath) {
  const source = path.join(root, relativePath);
  try { await access(source); } catch { return; }
  await copyFile(source, path.join(distDirectory, relativePath));
}

await generateOptimizedImages();
await rm(distDirectory, { recursive: true, force: true });
await mkdir(distDirectory, { recursive: true });
for (const file of ['index.html', 'features.html', 'wiki.html', 'styles.css', 'mobile.css', 'site.js']) {
  await copyFile(path.join(root, file), path.join(distDirectory, file));
}
await cp(path.join(root, 'assets'), path.join(distDirectory, 'assets'), { recursive: true });
for (const optionalFile of ['CNAME', '404.html', 'robots.txt', 'sitemap.xml', 'manifest.json', 'manifest.webmanifest']) {
  await copyIfPresent(optionalFile);
}
await writeFile(path.join(distDirectory, '.nojekyll'), '', 'utf8');

const budgets = [
  ['queryfixr-mark-96.webp', 10000],
  ['queryfixr-mark-384.webp', 45000],
  ['queryfixr-hero-640.webp', 35000],
  ['queryfixr-hero-900.webp', 50000],
  ['queryfixr-favicon.png', 15000],
  ['queryfixr-apple-touch-icon.png', 16000],
];
let totalBytes = 0;
for (const [name, limit] of budgets) {
  const bytes = (await stat(path.join(assetDirectory, name))).size;
  totalBytes += bytes;
  console.log(name + ': ' + bytes + ' bytes (budget ' + limit + ')');
  if (bytes > limit) throw new Error(name + ' exceeds its image budget by ' + (bytes - limit) + ' bytes.');
}
if (totalBytes > 160000) throw new Error('Optimized image bundle exceeds 160 KB: ' + totalBytes + ' bytes.');
console.log('Generated dist/ with ' + totalBytes + ' bytes of optimized image assets.');
