const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, { exports, require });
  return exports;
}
const calendar = load('utils/calendar.ts', () => ({}));
const helpers = load('utils/adminRequestList.ts', () => calendar);
const requests = [
  { id: 1, status: 'pending', slotKey: '2026-11-04-08:00' },
  { id: 2, status: 'approved', slotKey: '2026-11-06-10:00' },
  { id: 3, status: 'completed', slotKey: '2026-11-06-14:00' },
  { id: 4, status: 'cancelled', slotKey: 'legacy' }
].map(o => ({ ...o, clientName: 'Teste', serviceName: 'Ajuste', imageUrls: [], clientPhone: '000', slotLabel: o.slotKey }));
assert.equal(requests.filter(o => helpers.visibleInRequestTab(o)).length, 3);
assert.deepEqual(requests.filter(o => helpers.visibleInRequestTab(o, 'completed')).map(o => o.id), [3]);
assert.equal(helpers.groupAdminRequests(requests)[0].requests[0].id, 3);
assert.equal(helpers.groupAdminRequests(requests).at(-1).key, 'unknown');
assert.equal(requests[0].id, 1, 'Sorting must not mutate context');
let cursor = 0; const cells = [];
const jsx = (type, props) => ({ type, props });
const hooks = { useMemo: fn => fn(), useState: initial => {
  const i = cursor++; if (!(i in cells)) cells[i] = initial;
  return [cells[i], value => cells[i] = typeof value === 'function' ? value(cells[i]) : value];
}};
const context = { requests, services: [], updateRequestStatus: async (id, status) => {
  context.requests = context.requests.map(o => o.id === id ? { ...o, status } : o);
}};
const screen = load('screens/admin/AdminRequestsScreen.tsx', name => {
  if (name === 'react') return hooks;
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
  if (name === 'react-native') return { Platform: { OS: 'test' }, Alert: { alert: (_title, _message, actions) => actions[1].onPress() }, StyleSheet: { create: x => x }, Text: 'Text', View: 'View', Modal: 'Modal', ScrollView: 'ScrollView' };
  if (name === '@/context/AtelierContext') return { useAtelier: () => context };
  if (name === '@/hooks/useResponsiveLayout') return { useResponsiveLayout: () => ({ isNarrow: false }) };
  if (name === '@/utils/adminRequestList') return helpers;
  if (name === '@/utils/errors') return { friendlyErrorMessage: (_e, fallback) => fallback };
  if (name === '@/theme') return { theme: { spacing: { sm: 12 }, colors: {}, radius: {}, typography: {}, shadows: {} } };
  const component = name.split('/').at(-1);
  return { [component]: component, Ionicons: 'Ionicons' };
});
const render = () => { cursor = 0; return screen.AdminRequestsScreen(); };
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(x => nodes(x, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function button(tree, label) { return nodes(tree, x => x.props?.label === label)[0]; }
(async () => {
  let tree = render();
  for (const [width, columns] of [[320, 1], [390, 1], [520, 2], [760, 3]]) {
    nodes(tree, x => typeof x.props?.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width } } });
    tree = render();
    const widths = nodes(tree, x => typeof x.props?.style?.width === 'number').map(x => x.props.style.width);
    assert.ok(widths.length > 0);
    for (const actual of widths) assert.equal(actual, (width - 12 * (columns - 1)) / columns);
    assert.ok(widths.every(actual => actual >= 240), 'Cards must not collapse to narrow text columns');
  }
  nodes(tree, x => x.props?.accessibilityLabel?.includes('2026-11-04-08:00'))[0].props.onPress();
  tree = render();
  assert.ok(button(tree, 'Confirmar pedido'));
  assert.equal(button(tree, 'Remarcar horário'), undefined);
  button(tree, 'Confirmar pedido').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  tree = render();
  assert.ok(button(tree, 'Concluir pedido'));
  button(tree, 'Remarcar horário').props.onPress();
  tree = render();
  assert.equal(nodes(tree, x => x.type === 'ReschedulePanel').length, 1);
  button(tree, 'Concluir pedido').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  tree = render();
  assert.equal(nodes(tree, x => x.type === 'Modal').length, 0);
  assert.equal(context.requests[0].status, 'completed');
  assert.equal(nodes(tree, x => x.props?.accessibilityLabel?.includes('2026-11-04-08:00')).length, 0);
  nodes(tree, x => x.props?.accessibilityLabel === 'Filtrar pedidos por Concluídos')[0].props.onPress();
  tree = render();
  nodes(tree, x => x.props?.accessibilityLabel?.includes('2026-11-04-08:00'))[0].props.onPress();
  tree = render();
  assert.equal(button(tree, 'Confirmar pedido'), undefined);
  assert.equal(button(tree, 'Concluir pedido'), undefined);
  assert.equal(button(tree, 'Remarcar horário'), undefined);
  console.log('Admin requests: tab isolation, descending groups, legacy dates, confirmation actions, reschedule visibility and completion passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
