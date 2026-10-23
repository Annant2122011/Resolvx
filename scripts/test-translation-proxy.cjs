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
