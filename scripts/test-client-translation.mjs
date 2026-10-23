import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../site.js', import.meta.url), 'utf8');
const start = source.indexOf('  const TRANSLATION_BATCH_MAX_ITEMS = 16;');
const end = source.indexOf('  function getSearchIndexDisplaySegments()', start);
assert.ok(start >= 0 && end > start, 'Client translation batching helpers must exist.');
const helperSource = source.slice(start, end);

let active = 0;
let peakActive = 0;
const context = {
  Promise,
  setTimeout,
  translateBatch: async (values, target) => {
    active += 1;
    peakActive = Math.max(peakActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return values.map((value) => target + ':' + value);
  },
};
vm.createContext(context);
vm.runInContext(
  helperSource + '\nthis.testHelpers = { createTranslationBatches, translateBatchesWithConcurrency };',
  context,
);

const createBatches = context.testHelpers.createTranslationBatches;
const values = Array.from({ length: 57 }, (_, i) => 'text-' + i + '-' + 'x'.repeat((i % 7) * 31));
const batches = createBatches(values);
assert.ok(batches.length > 1);
assert.ok(batches.every((batch) => batch.values.length <= 16));
assert.ok(batches.every((batch) => batch.values.reduce((sum, value) => sum + value.length, 0) <= 3600));
const packed = Array.from(batches).flatMap((batch) =>
  Array.from(batch.values, (value, i) => ({ value, index: batch.indexes[i] })),
).sort((a, b) => a.index - b.index);
assert.deepEqual(
  packed,
  values.map((value, index) => ({ value, index })),
  'Packing must preserve each segment and original index exactly once.',
);
assert.deepEqual(Array.from(createBatches([])), []);
assert.throws(() => createBatches(['x'.repeat(2401)]), /provider limit/);

const progress = [];
const translated = await context.testHelpers.translateBatchesWithConcurrency(
  batches,
  'fr',
  (complete, total) => progress.push([complete, total]),
);
assert.equal(peakActive, Math.min(3, batches.length), 'Batch requests should use bounded parallelism.');
const translatedPacked = Array.from(translated).flatMap((result, batchIndex) =>
  Array.from(result, (value, index) => ({ value, index: batches[batchIndex].indexes[index] })),
).sort((a, b) => a.index - b.index);
assert.deepEqual(
  translatedPacked,
  values.map((value, index) => ({ value: 'fr:' + value, index })),
  'Concurrent responses must remain aligned to their source segments.',
);
assert.equal(progress.length, batches.length);
assert.equal(progress.at(-1)[0], batches.length);
console.log('QueryFixr client translation checks passed: bounded payload packing, preserved indices, concurrency cap, and complete progress reporting.');
