const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

async function main() {
  const handlers = {}, displayed = new Map(), opened = [];
  let displayCalls = 0;
  const context = {
    URL, Response, Promise, Number,
    self: {
      location: { origin: "https://atelier.test" },
      addEventListener: (name, fn) => { handlers[name] = fn; },
      registration: { showNotification: async (title, options) => {
        displayCalls++;
        displayed.set(options.tag, { title, options });
      } },
      clients: { openWindow: async url => opened.push(url) }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/sw.js"), "utf8"), context);
  function push(data) {
    let promise;
    handlers.push({ data: { json: () => data }, waitUntil: value => { promise = value; } });
    return promise;
  }
  await Promise.all([push({ eventId: 1 }), push({ eventId: 1 }), push({ eventId: 2 })]);
  assert.equal(displayed.size, 2, "Repeated pushes replace the existing notification by tag");
  assert.equal(displayCalls, 3, "Every valid push displays a notice, as required by Safari");
  assert.equal(displayed.get("atelier-request-1").options.renotify, false);
  await push({ eventId: "invalid", url: "https://evil.test", clientName: "Sensitive" });
  assert.equal(displayed.size, 2);
  let click;
  handlers.notificationclick({
    notification: { close() {}, data: { url: "https://evil.test" } },
    waitUntil: value => { click = value; }
  });
  await click;
  assert.deepEqual(opened, ["https://atelier.test/admin"]);
  // Tags remain stable across worker restarts.
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/sw.js"), "utf8"), { ...context });
  await push({ eventId: 1 });
  assert.equal(displayed.size, 2);
  console.log("Push worker: duplicate, concurrent, restart, invalid payload and safe click checks passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
