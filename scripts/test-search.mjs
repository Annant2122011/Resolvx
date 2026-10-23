import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../site.js', import.meta.url), 'utf8');
const synonymsStart = source.indexOf('  const SEARCH_SYNONYM_GROUPS = [');
const stopWordsStart = source.indexOf('  const SEARCH_STOP_WORDS = new Set([', synonymsStart);
const functionsStart = source.indexOf('  function normalizeSearchText(value) {', stopWordsStart);
const functionsEnd = source.indexOf('  function safeText(element, selector) {', functionsStart);

assert.ok(synonymsStart >= 0 && stopWordsStart > synonymsStart && functionsStart > stopWordsStart && functionsEnd > functionsStart,
  'Search scoring code and its synonym/stop-word tables must remain available for tests.');

const scoringSource = source.slice(synonymsStart, functionsStart) +
  source.slice(functionsStart, functionsEnd) +
  '\nglobalThis.__queryfixrSearch = { normalizeSearchText, searchTerms, boundedEditDistanceOne, searchScore, matchesSearchCorpus };';
const sandbox = {};
vm.runInNewContext(scoringSource, sandbox, { timeout: 1000, filename: 'site-search-scoring.js' });
const search = sandbox.__queryfixrSearch;

assert.equal(search.normalizeSearchText('  PRIORITÉ — Tickets  '), 'priorite tickets');
assert.ok(search.searchScore('Ticket priority and staff handoff', 'priority') > 0, 'Exact terms must match.');
assert.ok(search.searchScore('Settings, themes, and layout', 'setings') > 0, 'A single-character typo must still find the intended term.');
assert.ok(search.searchScore('Ticket request and customer case', 'заявка') > 0, 'Configured multilingual synonyms must match.');
assert.ok(search.searchScore('Restore a deleted ticket channel and transcript', 'recovery') > 0, 'Recovery synonyms must match the corresponding guide.');
assert.ok(search.searchScore('Language selection and website translation', 'translate') > 0, 'Partial and related language terms must match.');
assert.ok(search.searchScore('Ticket lifecycle and statuses', 'ticket lifecycle') >
  search.searchScore('Ticket recovery and transcripts', 'ticket lifecycle'), 'More complete/phrase-aligned results must rank higher.');
assert.equal(search.searchScore('Neon PostgreSQL persistence', 'quantum astrophysics'), 0,
  'Unrelated queries must not fabricate a match.');
assert.equal(search.searchScore('', 'priority'), 0, 'Empty corpus must never produce a positive match.');
assert.equal(search.matchesSearchCorpus('Search the feature catalogue', 'catalog'), true);

console.log('QueryFixr search scoring checks passed: normalization, exact terms, typos, multilingual synonyms, relevance ranking, and unrelated-query rejection.');
