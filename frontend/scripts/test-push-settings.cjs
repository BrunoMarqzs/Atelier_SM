// Component behavior with mocked browser/HTTP APIs; not an iPhone receipt test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness({ permission = "granted", installed = true, apiFailure = false, serverEnabled = true } = {}) {
  let cursor = 0, mounted = false, subscription = null, serverActive = false;
  const states = [], effects = [], calls = [];
  const sub = {
    endpoint: "https://web.push.apple.com/test",
    toJSON: () => ({ keys: { auth: "auth", p256dh: "key" } }),
    unsubscribe: async () => { calls.push("browser-unsubscribe"); subscription = null; return true; }
  };
  const reg = { pushManager: {
    getSubscription: async () => subscription,
    subscribe: async () => { calls.push("browser-subscribe"); subscription = sub; return sub; }
  } };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const api = async (route) => {
    calls.push(route);
    if (route === "config") return { enabled: serverEnabled, publicKey: "AQ" };
    if (route === "status") return { enabled: serverActive };
    if (apiFailure) throw new TypeError("network failed");
    serverActive = route === "subscribe";
    return { enabled: serverActive };
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,
    "../src/components/common/PushSettings.tsx"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  vm.runInNewContext(code, {
    exports, Error, TypeError, Promise, Uint8Array, atob, setTimeout: () => 0,
    window: { isSecureContext: true, PushManager: {}, Notification: {},
      matchMedia: () => ({ matches: installed }) },
    navigator: { userAgent: "iPhone", serviceWorker: {
      register: async () => reg, ready: Promise.resolve(reg)
    } },
    Notification: { permission, requestPermission: async () => { calls.push("permission"); return permission; } },
    require: name => {
      if (name === "react") return {
        useState: initial => {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], value => { states[index] = value; }];
        },
        useEffect: effect => { if (!mounted) effects.push(effect); }
      };
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react-native") return { Platform: { OS: "web" }, Text: "Text", View: "View" };
      if (name === "@/services/api") return { adminPushApi: api };
      return { Notice: "Notice", PremiumButton: "PremiumButton" };
    }
  });
  function render() { cursor = 0; const tree = exports.PushSettings(); mounted = true; return tree; }
  async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
  function nodes(tree) {
    return !tree || typeof tree !== "object" ? [] :
      [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
  }
  return {
    calls,
    async start() { render(); effects.forEach(fn => fn()); await settle(); },
    async click(label) {
      const button = nodes(render()).find(node => node.props?.label === label);
      assert.ok(button, label);
      assert.ok(!button.props.disabled);
      button.props.onPress();
      await settle();
    },
    text: () => JSON.stringify(render()),
    active: () => serverActive
  };
}

async function main() {
  const normal = harness();
  await normal.start();
  await normal.click("Ativar neste aparelho");
  assert.ok(normal.active());
  assert.ok(normal.calls.indexOf("permission") < normal.calls.indexOf("browser-subscribe"));
  await normal.click("Desativar neste aparelho");
  assert.ok(!normal.active());
  assert.ok(normal.calls.indexOf("unsubscribe") < normal.calls.indexOf("browser-unsubscribe"));

  const denied = harness({ permission: "denied" });
  await denied.start();
  await denied.click("Ativar neste aparelho");
  assert.ok(!denied.active());
  assert.ok(denied.text().includes("Permissão"));
  assert.ok(!denied.calls.includes("subscribe"));

  const failed = harness({ apiFailure: true });
  await failed.start();
  await failed.click("Ativar neste aparelho");
  assert.ok(!failed.active());
  assert.ok(failed.text().includes("Não foi possível confirmar"));

  const iphoneTab = harness({ installed: false });
  await iphoneTab.start();
  assert.ok(iphoneTab.text().includes("Adicionar à Tela de Início"));
  const off = harness({ serverEnabled: false });
  await off.start();
  assert.ok(off.text().includes("desligados"));
  console.log("Push settings: activation, disable order, denied permission, API failure, iPhone install and server-off passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
