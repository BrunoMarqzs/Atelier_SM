const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const listeners = {};
const stored = new Map([['/offline.html', { offline: true }]]);
let response, puts = 0;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8'), {
  URL, Response,
  self: { location: { origin: 'https://atelier.test' }, addEventListener: (name, cb) => listeners[name] = cb },
  caches: { match: async key => stored.get(key), open: async () => ({ put: async () => { puts++; } }) },
  fetch: async () => { if (response instanceof Error) throw response; return response; }
});
async function request(mode, destination, result) {
  response = result;
  let answer;
  const pending = [];
  listeners.fetch({ request: { url: 'https://atelier.test/resource', method: 'GET', mode, destination },
    respondWith: value => answer = value, waitUntil: value => pending.push(value) });
  const resolved = await answer;
  await Promise.all(pending);
  return resolved;
}
(async () => {
  const ok = { ok: true, type: 'basic', clone: () => ({}) };
  await request('cors', 'script', ok);
  assert.equal(puts, 1);
  await request('cors', 'script', { ...ok, ok: false });
  await request('navigate', 'document', ok);
  await request('cors', '', ok);
  assert.equal(puts, 1, 'Errors, pages and data must not enter the runtime cache');
  assert.equal((await request('navigate', 'document', new Error('offline'))).offline, true);
  assert.equal((await request('cors', 'script', new Error('offline'))).type, 'error');
  console.log('Offline cache: static success caching, error exclusion, private data exclusion and navigation-only fallback passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
