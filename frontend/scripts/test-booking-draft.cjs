const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const values = new Map();
const output = {};
const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/bookingDraft.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: output, sessionStorage: storage, Date });
output.saveBookingDraft('Ajuste da peça');
assert.equal(output.readBookingDraft().notes, 'Ajuste da peça');
assert.deepEqual(Object.keys(JSON.parse([...values.values()][0])).sort(), ['expires', 'notes', 'version']);
output.saveBookingDraft('');
assert.equal(values.size, 0);
values.set('atelier-booking-draft-v1', JSON.stringify({ version: 1, notes: 'old', expires: 0 }));
assert.equal(output.readBookingDraft(), undefined);
values.set('atelier-booking-draft-v1', '{invalid');
assert.doesNotThrow(() => output.readBookingDraft());
storage.setItem = () => { throw new Error('quota'); };
assert.doesNotThrow(() => output.saveBookingDraft('text'));
console.log('Draft: restore, expiry, clearing, restricted fields and unavailable storage passed.');
