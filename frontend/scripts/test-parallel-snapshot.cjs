const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

async function check(isAdmin, fail = false) {
  const calls = [];
  const resolve = {};
  const reject = {};
  const api = { hasAdminSession: () => isAdmin };
  for (const name of ['fetchServices', 'fetchAdminRequests', 'fetchAdminAnnouncements', 'fetchAnnouncements']) {
    api[name] = () => {
      calls.push(name);
      return new Promise((yes, no) => { resolve[name] = yes; reject[name] = no; });
    };
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/services/atelierRepository.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    if (name === '@/services/api') return api;
    if (name === '@/utils/calendar') return {};
    throw new Error(`Unexpected dependency: ${name}`);
  }});
  const pending = exports.loadAtelierSnapshot();
  const expected = isAdmin
    ? ['fetchServices', 'fetchAdminRequests', 'fetchAdminAnnouncements']
    : ['fetchServices', 'fetchAnnouncements'];
  assert.deepEqual(calls, expected, 'All independent fetches must start before any resolves');
  const failureCheck = fail ? assert.rejects(pending, /Failed/) : null;
  for (const name of expected) {
    if (fail && name === 'fetchServices') reject[name](new Error('Failed'));
    else resolve[name]([name]);
  }
  if (fail) await failureCheck;
  else {
    const snapshot = await pending;
    assert.equal(snapshot.services[0], 'fetchServices');
    assert.equal(snapshot.requests.length, isAdmin ? 1 : 0);
    assert.equal(snapshot.announcements[0], expected[expected.length - 1]);
  }
}
(async () => {
  await check(false);
  await check(true);
  await check(true, true);
  console.log('PASS: parallel public/admin snapshots, no public admin fetches, failure propagation');
})().catch(error => { console.error(error); process.exitCode = 1; });
