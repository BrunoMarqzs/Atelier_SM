const CACHE_NAME = "atelier-sibele-v3";
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/maskable-icon.svg",
  "/offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache only public static resources. Never persist page or account data.
        if (response.ok && response.type === "basic" && request.mode !== "navigate" &&
            ["script", "style", "image", "font"].includes(request.destination)) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined));
        }
        return response;
      })
      .catch(async () => {
        if (request.mode === "navigate") return (await caches.match("/offline.html")) || Response.error();
        return (await caches.match(request)) || Response.error();
      })
  );
});

// Safari requires a visible notification for every push. Deduplicate at the server;
// stable tags replace an existing notice rather than adding a duplicate card.
let pushChain = Promise.resolve();
self.addEventListener("push", (event) => {
  pushChain = pushChain.catch(() => undefined).then(async () => {
    let data;
    try { data = event.data.json(); } catch { return; }
    if (!Number.isSafeInteger(data.eventId) || data.eventId < 1) return;
    await self.registration.showNotification("Ateliê — Novo pedido recebido", {
      body: "Abra o painel para consultar os pedidos.",
      icon: "/icons/icon-192.png",
      tag: `atelier-request-${data.eventId}`,
      renotify: false,
      data: { url: "/admin" }
    });
  });
  event.waitUntil(pushChain);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Fixed login URL: never trust a payload-supplied destination.
  event.waitUntil(self.clients.openWindow(new URL("/admin", self.location.origin).href));
});

