// capabilities (diseño §8.4) — registro de detección de capacidades del
// navegador. Evaluación PEREZOSA: nada aquí toca `navigator`/`window` en el
// nivel superior del módulo (SSR-seguro).
//
// U12 aterriza SOLO `hasServiceWorker()` (la detección que la línea
// «no service-worker browsers» del tasks.md referencia); U13 extiende el
// registro con wakeLock, mediaSession, vibration, notifications, badging e
// install junto a sus seis módulos.
//
// La puerta del REGISTRO del service worker vive en el sw-entry que
// `withSerwist` inyecta («serviceWorker» in navigator && typeof caches !==
// "undefined", verificado en la fuente de @serwist/next): en navegadores sin
// SW no corre ningún código de registro y la app sigue funcional en línea con
// localStorage + IndexedDB (spec pwa).

/**
 * true cuando el navegador soporta service workers (contexto seguro).
 * En SSR y en navegadores sin SW devuelve false sin lanzar.
 */
export function hasServiceWorker(): boolean {
 return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * true cuando el navegador expone la Screen Wake Lock API. En SSR y sin
 * soporte devuelve false sin lanzar. SOLO informativa: la puerta real del
 * lock es el no-op silencioso del adaptador (wakeLock.ts) — jamás gatea la
 * sesión (spec pwa «Unsupported platforms skip silently»).
 */
export function hasWakeLock(): boolean {
 return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/**
 * true cuando el navegador expone la Vibration API (contrato del diseño §8.4:
 * "vibrate" in navigator). En SSR y sin soporte devuelve false sin lanzar.
 * SOLO informativa: la puerta real es el no-op silencioso del adaptador
 * (vibration.ts) — jamás gatea la sesión (spec pwa «Unsupported platforms
 * skip silently»; iOS no vibra y nada falla).
 */
export function hasVibration(): boolean {
 return typeof navigator !== "undefined" && "vibrate" in navigator;
}
