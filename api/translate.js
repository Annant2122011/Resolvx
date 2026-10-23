'use strict';

const DEFAULT_TRANSLATION_ENDPOINTS = [
  'https://libretranslate.de/translate',
  'https://translate.mentality.rip/translate',
  'https://translate.argosopentech.com/translate',
  'https://translate.api.skitzen.com/translate',
  'https://trans.zillyhuhn.com/translate',
  'https://libretranslate.esmailelbob.xyz/translate',
  'https://translate.pussthecat.org/translate',
];

const ALLOWED_TARGETS = new Set([
  'en', 'hi', 'bn', 'es', 'fr', 'de', 'pt', 'ar', 'ja', 'it', 'id',
  'ko', 'ru', 'zh', 'tr', 'nl', 'pl', 'uk', 'el', 'cs', 'sv',
]);
const MAX_TEXTS_PER_REQUEST = 16;
const MAX_TOTAL_CHARACTERS = 4000;
const MAX_TEXT_CHARACTERS = 2400;
const REQUEST_TIMEOUT_MS = 4500;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 180;
const RATE_STORE_KEY = Symbol.for('queryfixr.translation.rate-limits');

function getRateStore() {
  if (!globalThis[RATE_STORE_KEY]) globalThis[RATE_STORE_KEY] = new Map();
  return globalThis[RATE_STORE_KEY];
}

function checkRateLimit(req) {
  const now = Date.now();
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || String(req.socket?.remoteAddress || 'unknown');
  const store = getRateStore();
  const current = store.get(ip);
  if (!current || now - current.start >= RATE_WINDOW_MS) {
    store.set(ip, { start: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > RATE_LIMIT) return false;
  }
  if (store.size > 2500) {
    for (const [key, entry] of store) {
      if (now - entry.start >= RATE_WINDOW_MS) store.delete(key);
    }
  }
  return true;
}

function normalizeRequestBody(body) {
  let payload = body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { throw new Error('Request body must be valid JSON.'); }
  }
  if (!payload || typeof payload !== 'object') throw new Error('Request body must be a JSON object.');

  const target = String(payload.target || '').trim().toLowerCase();
  const source = String(payload.source || 'en').trim().toLowerCase();
  let texts = payload.q;
  if (typeof texts === 'string') texts = [texts];
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > MAX_TEXTS_PER_REQUEST) {
    throw new Error('Send between 1 and ' + MAX_TEXTS_PER_REQUEST + ' text segments per request.');
  }
  if (source !== 'en') throw new Error('Only English source text is supported.');
  if (!ALLOWED_TARGETS.has(target)) throw new Error('Unsupported target language.');
  if (!texts.every((text) => typeof text === 'string' && text.trim().length > 0 && text.length <= MAX_TEXT_CHARACTERS)) {
    throw new Error('Each text segment must be non-empty and no longer than ' + MAX_TEXT_CHARACTERS + ' characters.');
  }
  const totalCharacters = texts.reduce((sum, text) => sum + text.length, 0);
  if (totalCharacters > MAX_TOTAL_CHARACTERS) throw new Error('The combined request is too large.');
  return { texts, target };
}

function translationEndpoints() {
  const configured = String(process.env.LIBRETRANSLATE_ENDPOINT || '').trim();
  return [...new Set([configured, ...DEFAULT_TRANSLATION_ENDPOINTS].filter(Boolean))];
}

async function requestEndpoint(endpoint, texts, target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const body = { q: texts, source: 'en', target, format: 'text' };
    if (process.env.LIBRETRANSLATE_API_KEY) body.api_key = process.env.LIBRETRANSLATE_API_KEY;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      const error = new Error('Translation upstream returned HTTP ' + response.status + '.');
      error.status = response.status;
      throw error;
    }
    const result = await response.json();
    let translated;
    if (Array.isArray(result?.translatedText)) translated = result.translatedText;
    else if (Array.isArray(result)) translated = result.map((entry) => typeof entry === 'string' ? entry : entry?.translatedText);
    else if (typeof result?.translatedText === 'string' && texts.length === 1) translated = [result.translatedText];

    if (!Array.isArray(translated) || translated.length !== texts.length ||
        translated.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new Error('Translation upstream returned an incomplete response.');
    }
    return translated;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function translateHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'GET' || req.method === 'HEAD') {
    res.status(200).json({ ok: true, service: 'QueryFixr translation proxy' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, HEAD, POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const origin = String(req.headers.origin || '').trim();
  if (origin) {
    let originHost = '';
    try { originHost = new URL(origin).host.toLowerCase(); } catch { originHost = ''; }
    if (!originHost || !host || originHost !== host) {
      res.status(403).json({ error: 'Cross-origin translation requests are not allowed.' });
      return;
    }
  }

  if (!checkRateLimit(req)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Translation request limit reached. Retry shortly.' });
    return;
  }

  let input;
  try {
    input = normalizeRequestBody(req.body);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  let lastError = null;
  for (const endpoint of translationEndpoints()) {
    try {
      const translatedText = await requestEndpoint(endpoint, input.texts, input.target);
      res.status(200).json({ translatedText });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  res.status(503).json({
    error: 'No translation provider completed this request.',
    detail: lastError?.message || 'Translation providers are unavailable.',
  });
};
