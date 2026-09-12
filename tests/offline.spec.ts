// Smoke de navegación offline (U12 — diseño §8.3, cierre del riesgo R5).
//
// Playwright/chromium contra build de producción (`pnpm test:offline`):
// jsdom NO puede alojar service workers ni CacheStorage — por eso existe este
// runner aparte del bucle TDD (diseño §11.4). Pasos literales del diseño:
//
//  1. Calentar EN LÍNEA: `/` y todas las rutas; `navigator.serviceWorker.ready`
//     activo y el encabezado español de cada pantalla (strings de copy.ts).
//  2. Cortar la red: `context.setOffline(true)`.
//  3. Navegación dura offline: recargar `/` y URL-navegar a cada ruta.
//  4. Navegación cliente offline: inicio → configuración.
//  5. Sesión Clásico COMPLETA offline (preparación 1 s, trabajo 2 s,
//     descanso 1 s, 1 ronda → ~3 s activos): /resumen muestra modo + rondas +
//     duración y el historial contiene EXACTAMENTE una entrada.
//  6. Assets offline: /manifest.webmanifest y los dos iconos → 200 desde caché.
//  7. Cero fallos de red sin manejar.
//
// Calentamiento de las navegaciones cliente de /sesion y /resumen: una sesión
// de calentamiento EN LÍNEA (cuya entrada se descarta luego limpiando
// localStorage) deja en la caché runtime "pages-rsc" de Serwist los payloads
// exactos que el arranque y el completado piden offline. El RSC de /sesion no
// puede resolverse por navegación dura: una recarga destruye la sesión
// efímera en memoria (diseño §4.1). Es el calentamiento por-ruta de §8.2.

import { expect, test, type Page } from "@playwright/test";
import {
  AJUSTES_COPY,
  BRAND,
  CONFIG_COPY,
  HISTORY_COPY,
  MODE_LABEL,
  RESUMEN_COPY,
  ROUTINES_COPY,
} from "../src/components/shared/copy";

/** Rutas calentadas + encabezado español esperado (copy.ts es la fuente). */
const RUTAS: ReadonlyArray<{ url: string; encabezado: string }> = [
  { url: "/", encabezado: BRAND },
  { url: "/clasico", encabezado: MODE_LABEL.clasico },
  { url: "/tabata", encabezado: MODE_LABEL.tabata },
  { url: "/personalizado", encabezado: MODE_LABEL.personalizado },
  { url: "/rutinas", encabezado: ROUTINES_COPY.titulo },
  { url: "/historial", encabezado: HISTORY_COPY.titulo },
  { url: "/ajustes", encabezado: AJUSTES_COPY.titulo },
  // /resumen se calienta igual que las demás: el completado navega aquí con
  // router.replace (client-side) y el documento + payload RSC deben estar en
  // caché para servir la entrada offline.
  { url: "/resumen", encabezado: RESUMEN_COPY.titulo },
];

/** Sesión corta del smoke: 1 s preparación + 2 s trabajo · 1 ronda (sin
 *  descanso: con una sola ronda no hay descanso — plan.ts U3). */
const SESION_SMOKE = {
  preparacionS: 1,
  trabajoS: 2,
  descansoS: 1,
  rondas: 1,
} as const;

/** Duración activa exacta esperada en /resumen — formatDuration de
 *  lib/history/query.ts: 3_000 ms → "00:03" (el motor reporta exactamente
 *  totalActiveMs al completar, contrato engine U4). */
const DURACION_ESPERADA = "00:03";

/** Rellena el formulario Clásico (ids estables de las pantallas U5). */
async function configurarClasico(
  page: Page,
  valores: typeof SESION_SMOKE,
): Promise<void> {
  await page.locator("#preparacionS").fill(String(valores.preparacionS));
  await page.locator("#trabajoS").fill(String(valores.trabajoS));
  await page.locator("#descansoS").fill(String(valores.descansoS));
  await page.locator("#rondas").fill(String(valores.rondas));
}

test("sesión completa offline tras la primera visita (cierre R5, diseño §8.3)", async ({
  page,
}) => {
  test.setTimeout(120_000);

  // Paso 7 (recolección desde el principio): cero fallos de red sin manejar.
  const fallos: string[] = [];
  page.on("requestfailed", (request) => {
    fallos.push(
      `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "?"}`,
    );
  });

  // ——— Paso 1: registrar el SW y calentar EN LÍNEA bajo su control ———
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(BRAND);
  // navigator.serviceWorker.ready resuelve con el worker ACTIVO (el precache
  // de todos los assets estáticos ya se instaló).
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          navigator.serviceWorker.ready.then(
            (r) => r.active?.state ?? "ninguno",
          ),
        ),
      { timeout: 20_000 },
    )
    .toBe("activated");

  // The initial navigation registers the worker but is not necessarily
  // controlled by it. Reload once after `ready` so every following warm-up
  // request goes through Serwist and can populate its runtime caches.
  await expect
    .poll(
      () => page.evaluate(() => navigator.serviceWorker.controller !== null),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  // Metadata routes are not emitted into Serwist's static asset manifest.
  // Warm the generated manifest once while this page is worker-controlled so
  // the default NetworkFirst rule can serve it after the connection drops.
  const manifestStatusOnline = await page.evaluate(() =>
    fetch("/manifest.webmanifest").then((response) => response.status),
  );
  expect(manifestStatusOnline).toBe(200);

  // Warm documents and their RSC payloads under worker control.
  for (const { url, encabezado } of RUTAS) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      encabezado,
    );
  }

  // A hard navigation warms the document, but the start button later uses
  // router.push. Warm that exact RSC request too so the offline flow proves
  // the user-facing client transition, rather than hiding a cache miss.
  await page.goto("/");
  await page.getByRole("button", { name: /^Clásico/ }).click();
  await expect(page).toHaveURL(/\/clasico$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    MODE_LABEL.clasico,
  );

  // Calentamiento de /sesion y /resumen por navegación cliente (ver cabecera):
  // sesión corta EN LÍNEA que completa (~3 s) y deja los payloads RSC en la
  // caché runtime; su entrada de historial se descarta limpiando localStorage
  // para que la sesión offline quede como la ÚNICA entrada (paso 5).
  await page.goto("/clasico");
  await configurarClasico(page, SESION_SMOKE);
  await page.getByRole("button", { name: CONFIG_COPY.iniciar }).click();
  await expect(page).toHaveURL(/\/sesion$/);
  await expect(page).toHaveURL(/\/resumen$/, { timeout: 20_000 });
  await expect(
    page.getByText(MODE_LABEL.clasico, { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(BRAND);

  // ——— Paso 2: cortar la red ———
  await page.context().setOffline(true);

  // ——— Paso 3: navegación dura offline ———
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(BRAND);
  for (const { url, encabezado } of RUTAS) {
    if (url === "/") continue;
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      encabezado,
    );
  }
  await page.goto("/");

  // ——— Paso 4: navegación cliente offline (inicio → configuración) ———
  // La tarjeta de modo tiene un nombre accesible que empieza por «Clásico»;
  // la descripción de Personalizado también menciona ese modo.
  await page.getByRole("button", { name: /^Clásico/ }).click();
  await expect(page).toHaveURL(/\/clasico$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    MODE_LABEL.clasico,
  );

  // ——— Paso 5: sesión Clásico completa offline ———
  await configurarClasico(page, SESION_SMOKE);
  await page.getByRole("button", { name: CONFIG_COPY.iniciar }).click();
  await expect(page).toHaveURL(/\/sesion$/);
  // 1 s preparación + 2 s trabajo + detección (≤250 ms del ticker) + navegación.
  await expect(page).toHaveURL(/\/resumen$/, { timeout: 20_000 });

  await expect(
    page.getByText(MODE_LABEL.clasico, { exact: true }),
  ).toBeVisible();
  // describeEffort (lib/history/query.ts): Clásico 1 ronda → «1 ronda».
  await expect(page.getByText("1 ronda", { exact: true })).toBeVisible();
  await expect(page.getByLabel(RESUMEN_COPY.tiempoActivo)).toHaveText(
    DURACION_ESPERADA,
  );

  // El historial contiene EXACTAMENTE una entrada: la sesión offline.
  await page.goto("/historial");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    HISTORY_COPY.titulo,
  );
  await expect(page.locator("[data-entry-id]")).toHaveCount(1);

  // ——— Paso 6: assets offline desde caché ———
  const manifestStatus = await page.evaluate(() =>
    fetch("/manifest.webmanifest").then((r) => r.status),
  );
  expect(manifestStatus).toBe(200);
  const ICONOS = [
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
  ] as const;
  for (const icono of ICONOS) {
    const status = await page.evaluate(
      (url) => fetch(url).then((r) => r.status),
      icono,
    );
    expect(status, icono).toBe(200);
  }

  // A route with no cached document must fall back to the dedicated offline
  // page instead of leaking a browser network error.
  const fallbackResponse = await page.goto("/ruta-nunca-visitada");
  expect(fallbackResponse?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sin conexión",
  );

  // ——— Paso 7: cero fallos de red sin manejar ———
  expect(fallos, `fallos de red sin manejar:\n${fallos.join("\n")}`).toEqual(
    [],
  );
});
