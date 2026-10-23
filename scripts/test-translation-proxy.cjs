'use strict';

const assert = require('node:assert/strict');
const { _test } = require('../api/translate.js');

assert.ok(_test, 'Translation proxy should expose its pure input-validation helpers to tests.');

const valid = _test.normalizeRequestBody({
  q: ['Create a ticket', 'Reopen the request'],
  source: 'en',
  target: 'hi',
});
assert.deepEqual(valid, {
  texts: ['Create a ticket', 'Reopen the request'],
  target: 'hi',
}, 'A valid batch should be normalized without altering its contents.');

assert.deepEqual(_test.normalizeRequestBody({
  q: 'Search wiki articles',
  target: 'FR',
}), {
  texts: ['Search wiki articles'],
  target: 'fr',
}, 'A single query and uppercase locale should normalize correctly.');

assert.throws(() => _test.normalizeRequestBody(null), /JSON object/);
assert.throws(() => _test.normalizeRequestBody({ q: ['hello'], target: 'xx' }), /Unsupported target/);
assert.throws(() => _test.normalizeRequestBody({ q: ['  '], target: 'fr' }), /non-empty/);
assert.throws(() => _test.normalizeRequestBody({ q: ['hello'], source: 'fr', target: 'en' }), /English source/);
assert.throws(() => _test.normalizeRequestBody({ q: Array(17).fill('hello'), target: 'fr' }), /between 1 and 16/);
assert.throws(() => _test.normalizeRequestBody({ q: ['x'.repeat(2401)], target: 'fr' }), /no longer than 2400/);
assert.throws(() => _test.normalizeRequestBody({ q: ['x'.repeat(2400), 'y'.repeat(1601)], target: 'fr' }), /combined request is too large/);
assert.throws(() => _test.normalizeRequestBody('{invalid-json'), /valid JSON/);

const previousEndpoint = process.env.LIBRETRANSLATE_ENDPOINT;
process.env.LIBRETRANSLATE_ENDPOINT = 'https://translate.example.test/translate';
try {
  const endpoints = _test.translationEndpoints();
  assert.equal(endpoints[0], 'https://translate.example.test/translate', 'A configured endpoint should be tried first.');
  assert.ok(endpoints.length >= 7, 'Several independent mirror endpoints should be available.');
  assert.equal(new Set(endpoints).size, endpoints.length, 'Duplicate translation endpoints should be removed.');
} finally {
  if (previousEndpoint === undefined) delete process.env.LIBRETRANSLATE_ENDPOINT;
  else process.env.LIBRETRANSLATE_ENDPOINT = previousEndpoint;
}

const request = { headers: { 'x-forwarded-for': '203.0.113.77' }, socket: {} };
for (let i = 0; i < 180; i += 1) {
  assert.equal(_test.checkRateLimit(request), true, 'Requests inside the allowed per-minute quota should pass.');
}
assert.equal(_test.checkRateLimit(request), false, 'Requests beyond the per-minute quota should be throttled.');

console.log('QueryFixr translation proxy tests passed: request validation, locale handling, limits, mirror selection, and rate limiting.');

async function invokeVercelHandler(handler, request) {
  const headers = {};
  let statusCode = 200;
  let body = null;
  const response = {
    setHeader(name, value) { headers[name] = value; return this; },
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  await handler(request, response);
  return { statusCode, headers, body };
}

async function runHandlerIntegrationChecks() {
  const handler = require('../api/translate.js');
  const netlify = require('../netlify/functions/translate.js');
  const previousFetch = global.fetch;
  const previousEndpoint = process.env.LIBRETRANSLATE_ENDPOINT;
  const previousApiKey = process.env.LIBRETRANSLATE_API_KEY;
  try {
    const health = await invokeVercelHandler(handler, {
      method: 'GET',
      headers: { host: 'queryfixr.example' },
      socket: { remoteAddress: '198.51.100.40' },
    });
    assert.equal(health.statusCode, 200, 'The API health check should respond without contacting providers.');
    assert.equal(health.body.ok, true);

    const crossOrigin = await invokeVercelHandler(handler, {
      method: 'POST',
      headers: { host: 'queryfixr.example', origin: 'https://attacker.example', 'x-forwarded-for': '198.51.100.41' },
      socket: { remoteAddress: '198.51.100.41' },
      body: { q: ['hello'], target: 'fr' },
    });
    assert.equal(crossOrigin.statusCode, 403, 'Cross-origin POST requests should be rejected.');

    const invalid = await invokeVercelHandler(handler, {
      method: 'POST',
      headers: { host: 'queryfixr.example', origin: 'https://queryfixr.example', 'x-forwarded-for': '198.51.100.42' },
      socket: { remoteAddress: '198.51.100.42' },
      body: { q: ['hello'], target: 'xx' },
    });
    assert.equal(invalid.statusCode, 400, 'Invalid translation requests should be rejected before any upstream request.');

    process.env.LIBRETRANSLATE_ENDPOINT = 'https://translate.example.test/translate';
    process.env.LIBRETRANSLATE_API_KEY = 'unit-test-secret-do-not-forward';
    const upstreamRequests = [];
    global.fetch = async (url, options) => {
      upstreamRequests.push({ url: String(url), body: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        async json() { return { translatedText: ['Bonjour'] }; },
      };
    };
    const translated = await invokeVercelHandler(handler, {
      method: 'POST',
      headers: { host: 'queryfixr.example', origin: 'https://queryfixr.example', 'x-forwarded-for': '198.51.100.43' },
      socket: { remoteAddress: '198.51.100.43' },
      body: { q: ['Hello'], target: 'fr' },
    });
    assert.equal(translated.statusCode, 200, 'A valid same-origin request should return translated text.');
    assert.deepEqual(translated.body.translatedText, ['Bonjour']);
    assert.ok(
      upstreamRequests.some((entry) => entry.url === process.env.LIBRETRANSLATE_ENDPOINT &&
        entry.body.api_key === 'unit-test-secret-do-not-forward'),
      'A configured provider should receive its own optional API key.',
    );
    assert.ok(
      upstreamRequests.filter((entry) => entry.url !== process.env.LIBRETRANSLATE_ENDPOINT)
        .every((entry) => !Object.hasOwn(entry.body, 'api_key')),
      'Public fallback mirrors must never receive the configured service API key.',
    );

    const netlifyHealth = await netlify.handler({
      httpMethod: 'GET',
      headers: { host: 'queryfixr.netlify.app', origin: 'https://queryfixr.netlify.app' },
      body: null,
      isBase64Encoded: false,
    });
    assert.equal(netlifyHealth.statusCode, 200, 'The Netlify adapter should expose the same proxy health check.');
    assert.equal(JSON.parse(netlifyHealth.body).ok, true);
  } finally {
    global.fetch = previousFetch;
    if (previousEndpoint === undefined) delete process.env.LIBRETRANSLATE_ENDPOINT;
    else process.env.LIBRETRANSLATE_ENDPOINT = previousEndpoint;
    if (previousApiKey === undefined) delete process.env.LIBRETRANSLATE_API_KEY;
    else process.env.LIBRETRANSLATE_API_KEY = previousApiKey;
  }
}

runHandlerIntegrationChecks()
  .then(() => console.log('QueryFixr translation proxy route checks passed: health, CORS, input errors, successful same-origin response, and Netlify adapter.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
