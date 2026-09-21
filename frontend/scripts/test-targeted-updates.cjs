// Isolated provider regression tests: real TS module, minimal hook harness, no network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }});
  return exports;
}

async function main() {
  const states = [];
  let cursor = 0;
  let snapshots = 0;
  let failure = false;
  const original = { id: 1, status: 'pending', imageUrls: ['photo'] };
  const updated = { ...original, status: 'approved', timeline: [{ id: 12 }],
    name: 'New', highlighted: false, isActive: true, priority: 1, createdAt: '2026-09-22' };
  const calls = [];
  const repository = {
    loadAtelierSnapshot: async () => { snapshots++; return {
      requests: [original], services: [{ id: 1, name: 'First', highlighted: true }],
      announcements: [{ id: 1, isActive: true, priority: 10, createdAt: '2026-09-21' }], blockedSlotIds: [],
    }; },
  };
  for (const name of ['createRemoteRequest', 'createRemoteService', 'createRemoteAnnouncement',
    'deactivateRemoteService', 'deactivateRemoteAnnouncement', 'rescheduleRemoteRequest',
    'blockRemoteSlot', 'releaseRemoteSlot', 'updateRemoteRequestStatus',
    'updateRemoteAnnouncement', 'updateRemoteService', 'addRemoteRequestComment',
    'updateRemoteRequestEstimate']) {
    repository[name] = async () => {
      calls.push(name);
      if (failure) throw new Error('Server rejected operation');
      return name.startsWith('create') ? { ...updated, id: 2 } : updated;
    };
  }
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => {
        states[index] = typeof value === 'function' ? value(states[index]) : value;
      }];
    },
    useCallback: (fn) => fn, useMemo: (fn) => fn(), useEffect: () => {},
  };
  const { AtelierProvider } = load('src/context/AtelierContext.tsx', {
    react, 'react/jsx-runtime': { jsx: (_, props) => props },
    '@/services/atelierRepository': repository,
  });
  const render = () => { cursor = 0; return AtelierProvider({ children: null }).value; };
  await render().refresh();
  await render().updateRequestStatus(1, 'approved');
  assert.equal(render().requests[0], updated);
  assert.equal(render().requests[0].timeline[0].id, 12);
  for (const [action, args] of [
    ['addRequest', [{}]], ['createService', [{}]], ['createAnnouncement', [{}]],
    ['rescheduleRequest', [1, 4]], ['updateAnnouncement', [{ id: 1 }]],
    ['toggleSlotBlock', [{ status: 'available' }]], ['toggleSlotBlock', [{ status: 'blocked' }]],
    ['deactivateService', [1]], ['deactivateAnnouncement', [1]],
  ]) {
    await render()[action](...args);
    if (action === 'createService') assert.equal(render().services[0].id, 1);
    if (action === 'createAnnouncement') assert.equal(render().announcements[0].id, 1);
  }
  assert.equal(snapshots, 1, 'Mutations must not trigger a global reload');
  assert.equal(render().requests.length, 2);
  assert.equal(render().services.some((item) => item.id === 1), false);
  assert.equal(render().announcements.some((item) => item.id === 1), false);
  assert.ok(calls.includes('blockRemoteSlot') && calls.includes('releaseRemoteSlot'));
  const before = render().requests;
  failure = true;
  await assert.rejects(render().updateRequestStatus(1, 'completed'));
  assert.equal(render().requests, before, 'Failed mutations must preserve state');
  await render().refresh();
  assert.equal(snapshots, 2, 'Explicit refresh remains available');
  console.log('PASS: targeted updates, server-confirmed status/history, failed-operation preservation, explicit refresh');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
