const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
let response, calls = 0;
const exportsObject = {};
vm.runInNewContext(code, {
  exports: exportsObject, process: { env: {} }, Error,
  require: () => ({}),
  fetch: async () => { calls++; if (response instanceof Error) throw response; return response; }
});
const payload = { client: { name: 'Teste', phone: '12345678' }, serviceId: 8, slotId: 1 };
async function rejection(status, detail, expected, malformed = false) {
  response = { ok: false, status, json: async () => { if (malformed) throw new Error('invalid JSON'); return { detail }; } };
  const before = calls;
  await assert.rejects(exportsObject.submitAppointmentRequest(payload), e => {
    assert.equal(e.name, 'BookingSubmissionError');
    assert.match(e.message, expected);
    assert.ok(!e.message.includes('SECRET'));
    return true;
  });
  assert.equal(calls, before + 1, 'Never automatically repeat a POST');
}
(async () => {
  await rejection(400, 'Serviço com preço fixo está sem valor configurado.', /configuração de preço pendente/);
  await rejection(409, 'Horário indisponível.', /escolha outro horário/);
  await rejection(409, 'Horário já reservado por outra solicitação.', /histórico/);
  await rejection(422, [{ msg: 'SECRET' }], /dados inválidos/);
  await rejection(400, 'SECRET internal exception', /não aceitou/);
  await rejection(500, 'SECRET database password', /pode ter sido salvo/);
  await rejection(502, null, /histórico/, true);
  await rejection(408, null, /pode ter sido salvo/);
  await rejection(429, null, /muitas tentativas/);
  response = new Error('Network unavailable');
  await assert.rejects(exportsObject.submitAppointmentRequest(payload), /Network unavailable/);
  response = { ok: true, json: async () => { throw new Error('invalid JSON'); } };
  await assert.rejects(exportsObject.submitAppointmentRequest(payload), /invalid JSON/);
  response = { ok: true, json: async () => ({ id: 42, status: 'pending', public_code: 'TEST' }) };
  assert.equal((await exportsObject.submitAppointmentRequest(payload)).id, 42);
  console.log('Booking errors: 12 scenarios passed; no automatic retry, no raw server detail exposed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
