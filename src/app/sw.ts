/// <reference lib="webworker" />
// Service worker (U12 — diseño §8.2, decisión #1: Serwist).
//
// Fuente del SW: este archivo. `withSerwist` (next.config.ts) lo compila a
// public/sw.js (artefacto de build, gitignored) e inyecta el registro en
// producción — el sw-entry de @serwist/next feature-gatea el registro con
// «serviceWorker» in navigator && typeof caches !== "undefined": navegadores
// sin SW corren la app completa en línea (spec pwa).
//
// Nota de API (@serwist/sw 9.5.x): la clase `Serwist` del esqueleto del
// diseño §8.2 se eliminó del paquete; su sucesor exacto es `installSerwist`
// (mismas opciones: precacheEntries/skipWaiting/clientsClaim/runtimeCaching/
// fallbacks — cablea los listeners internamente). Desviación documentada en
// apply-progress.
//
// Estrategias (§8.2): `defaultCache` de @serwist/next ya codifica las reglas
// correctas para App Router — documentos y RSC NetworkFirst con fallback a
// caché runtime («pages-rsc», «pages-rsc-prefetch», «others»), assets
// estáticos CacheFirst/SWR, precache de lo firmado por el build. El fallback
// document → /offline se PRECACHEA (revisión fija) para cubrir el caso
// «documento sin entrada en caché». Si el smoke (§8.3) descubre un caso RSC
// sin caché, la regla NetworkFirst explícita se añade AQUÍ (bucle R5).

import { defaultCache } from "@serwist/next/worker";
import { installSerwist } from "@serwist/sw";

/**
 * Entrada del manifiesto de precache que @serwist/next inyecta en el build.
 * Equivalente estructural a `PrecacheEntry` de serwist («url» + revisión
 * opcional); no se importa del paquete `serwist` porque es dependencia
 * transitiva (layout estricto de pnpm).
 */
interface SwManifestEntry {
 url: string;
 revision?: string | null;
 integrity?: string;
}

declare const self: ServiceWorkerGlobalScope & {
 __SW_MANIFEST?: SwManifestEntry[];
};

installSerwist({
 // sw.js es el propio worker: nunca entra en el precache (§8.2).
 precacheEntries: (self.__SW_MANIFEST ?? []).filter(
  (entry) => !entry.url.startsWith("/sw.js"),
 ),
 skipWaiting: true,
 clientsClaim: true,
 runtimeCaching: defaultCache,
 fallbacks: {
  entries: [
   {
    // Revisión fija: el fallback se precachea en la instalación del SW.
    revision: "offline-v1",
    url: "/offline",
    matcher: ({ request }) => request.destination === "document",
   },
  ],
 },
});
