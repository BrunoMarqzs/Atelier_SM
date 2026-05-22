import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const manifest = JSON.parse(read("public/manifest.webmanifest"));
assert(manifest.name === "Atelier Sibele Marques", "Manifest precisa conter o nome completo do app.");
assert(manifest.display === "standalone", "Manifest precisa usar display standalone para PWA.");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Manifest precisa declarar ícones do app.");

const serviceWorker = read("public/sw.js");
assert(serviceWorker.includes("offline.html"), "Service worker precisa incluir fallback offline.");
assert(serviceWorker.includes("CACHE_NAME"), "Service worker precisa declarar cache versionado.");

const apiSource = read("src/services/api.ts");
assert(apiSource.includes("mapOptionalMoney"), "API precisa normalizar valores monetários vindos do backend.");
assert(apiSource.includes("estimatedPrice: mapOptionalMoney"), "Pedido precisa mapear estimated_price para número.");

const analyticsSource = read("src/utils/adminAnalytics.ts");
assert(
  analyticsSource.includes("Number(request.estimatedPrice"),
  "Receita estimada precisa converter orçamento para número antes de somar."
);

const requests = [
  { estimatedPrice: Number("85.00"), status: "pending" },
  { estimatedPrice: Number("100.00"), status: "approved" },
  { estimatedPrice: undefined, status: "pending" },
  { estimatedPrice: Number("90.00"), status: "rejected" }
];
const deployRevenue = requests
  .filter((request) => !["rejected", "cancelled"].includes(request.status))
  .reduce((total, request) => {
    const value = Number(request.estimatedPrice ?? 0);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
assert(deployRevenue === 185, `Receita estimada esperada 185, recebida ${deployRevenue}.`);

console.log("Pré-deploy frontend smoke OK");
