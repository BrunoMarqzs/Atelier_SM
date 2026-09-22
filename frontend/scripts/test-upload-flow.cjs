const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  vm.runInNewContext(code, { exports, Error, ...globals });
  return exports;
}

async function uploads() {
  let creates = 0, active = 0, maxActive = 0;
  const calls = [];
  const api = {
    submitAppointmentRequest: async () => { creates++; return { id: 42, imageUrls: [] }; },
    uploadRequestImage: async (id, uri) => {
      assert.equal(id, 42);
      active++; maxActive = Math.max(active, maxActive); calls.push(uri);
      await Promise.resolve(); active--;
      if (uri === 'bad' && calls.filter(x => x === uri).length === 1) throw new Error('Offline');
      return `remote-${uri}`;
    }
  };
  const repo = load('src/services/atelierRepository.ts', { require: name => {
    if (name === '@/services/api') return api;
    if (name === '@/utils/calendar') return {};
    throw new Error(name);
  }});
  const request = await repo.createRemoteRequest({ serviceId: 1, slotId: 1, imageUrls: ['a', 'bad', 'b'] });
  assert.equal(request.id, 42);
  assert.equal(calls.length, 0, 'Creation must not wait for uploads');
  const progress = [];
  const result = await repo.uploadRequestImages(42, ['a', 'bad', 'b'], (done, total) => progress.push([done, total]));
  assert.equal(result.filter(x => x.url).length, 2);
  assert.equal(result[1].error, 'Offline');
  const retried = await repo.uploadRequestImages(42, result.filter(x => !x.url).map(x => x.uri));
  assert.equal(retried[0].url, 'remote-bad');
  assert.deepEqual(calls, ['a', 'bad', 'b', 'bad']);
  assert.equal(creates, 1);
  assert.equal(maxActive, 1);
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
  for (const count of [0, 1, 5, 8]) {
    const items = await repo.uploadRequestImages(42, Array.from({ length: count }, (_, i) => `photo-${i}`));
    assert.equal(items.length, count);
    assert.ok(items.every(x => x.url));
  }
}

async function compression(width, height, source, output, shouldFail = false) {
  let released = 0, dimensions;
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toBlob(callback, mime, quality) {
      dimensions = [this.width, this.height];
      assert.equal(mime, 'image/jpeg'); assert.equal(quality, 0.88);
      callback(output);
    }
  };
  const util = load('src/utils/prepareWebImage.ts', {
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => released++ },
    Image: class {
      naturalWidth = width; naturalHeight = height;
      set src(value) { this.onload(); }
    },
    document: { createElement: () => canvas }
  });
  if (shouldFail) await assert.rejects(util.prepareWebImage(source));
  else {
    const result = await util.prepareWebImage(source);
    assert.ok(Math.max(...dimensions) <= 2048);
    assert.ok(dimensions[0] <= width && dimensions[1] <= height);
    assert.ok(result.size <= source.size || Math.max(width, height) > 2048);
  }
  assert.equal(released, 1);
  assert.equal(canvas.width, 0);
}

async function screenFlow() {
  const cells = [];
  let cursor = 0, creates = 0;
  const uploads = [], navigations = [];
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = initial;
      return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = { current: initial };
      return cells[index];
    }
  };
  const jsx = (type, props) => ({ type, props });
  const mod = load('src/screens/client/RequestDetailsScreen.tsx', { require: name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return { StyleSheet: { create: value => value }, Text: 'Text' };
    if (name === 'expo-image-picker') return {};
    if (name === '@/theme') return { theme: { spacing: {}, typography: {}, colors: {} } };
    if (name === '@/context/BookingContext') return { useBooking: () => ({
      client: { name: 'Test', phone: '000000000' }, service: { id: 1 }, slot: { id: 1 },
      imageUris: ['good', 'bad']
    }) };
    if (name === '@/context/AtelierContext') return { useAtelier: () => ({ addRequest: async () => {
      creates++; await Promise.resolve(); return { id: 42, publicCode: 'TEST' };
    } }) };
    if (name === '@/services/atelierRepository') return { uploadRequestImages: async (id, uris) => {
      assert.equal(id, 42); uploads.push([...uris]);
      return uris.map(uri => uri === 'bad' && uploads.length === 1 ? { uri, error: 'Offline' } : { uri, url: 'remote' });
    }};
    if (name.startsWith('@/components/')) { const component = name.split('/').pop(); return { [component]: component }; }
    throw new Error(name);
  }});
  const render = () => { cursor = 0; return mod.RequestDetailsScreen({ navigation: {
    replace: (...args) => navigations.push(args), goBack() {}
  } }); };
  function button(tree, label) {
    if (!tree || typeof tree !== 'object') return undefined;
    if (tree.type === 'PremiumButton' && tree.props.label === label) return tree.props;
    const children = tree.props?.children;
    for (const child of Array.isArray(children) ? children.flat() : [children]) {
      const found = button(child, label); if (found) return found;
    }
  }
  const confirm = button(render(), 'Confirmar solicitação');
  await Promise.all([confirm.onPress(), confirm.onPress()]);
  assert.equal(creates, 1, 'Rapid double-click must create only one request');
  assert.equal(navigations.length, 0, 'Failed photos must leave retry accessible');
  assert.equal(button(render(), 'Confirmar solicitação'), undefined);
  await button(render(), 'Reenviar somente fotos pendentes').onPress();
  assert.equal(creates, 1, 'Retry must never create another request');
  assert.deepEqual(uploads, [['good', 'bad'], ['bad']]);
  assert.equal(navigations[0][0], 'Confirmation');
}

(async () => {
  await uploads();
  await screenFlow();
  await compression(4032, 3024, { size: 6_000_000, type: 'image/jpeg' }, { size: 400_000 });
  await compression(800, 600, { size: 100_000, type: 'image/png' }, { size: 200_000 });
  await compression(800, 600, { size: 100_000, type: 'image/jpeg' }, null, true);
  console.log('PASS: creation separate from uploads, partial failures, retry only failed, 0/1/3/5/8 photos, bounded concurrency, resize/size/cleanup rules');
})().catch(error => { console.error(error); process.exitCode = 1; });
