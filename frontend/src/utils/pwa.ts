import { Platform } from "react-native";

function ensureLink(rel: string, href: string, extra?: Record<string, string>) {
  const existing = document.querySelector(`link[rel="${rel}"][href="${href}"]`);
  if (existing) {
    return;
  }
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  Object.entries(extra ?? {}).forEach(([key, value]) => link.setAttribute(key, value));
  document.head.appendChild(link);
}

function ensureMeta(name: string, content: string) {
  const existing = document.querySelector(`meta[name="${name}"]`);
  if (existing) {
    existing.setAttribute("content", content);
    return;
  }
  const meta = document.createElement("meta");
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

export function setupPwa() {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  document.title = "Atelier Sibele Marques";
  ensureLink("manifest", "/manifest.webmanifest");
  ensureLink("apple-touch-icon", "/icons/icon-192.svg");
  ensureMeta("theme-color", "#FBF7F3");
  ensureMeta("apple-mobile-web-app-capable", "yes");
  ensureMeta("apple-mobile-web-app-title", "Atelier Sibele");
  ensureMeta("apple-mobile-web-app-status-bar-style", "default");
  ensureMeta(
    "description",
    "Web app mobile-first para agendamentos e gestão do Atelier Sibele Marques."
  );

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }
}

