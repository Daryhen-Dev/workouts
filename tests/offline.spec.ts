// Production-only offline PWA smoke (R5 evidence).
//
// It uses the canonical user journey: import a real WAV in Settings, assign it
// globally to Trabajo, save a Personalizado routine, then start it from Rutinas
// while offline. Browser APIs unavailable to jsdom (service workers,
// CacheStorage, IndexedDB media, and native media playback) make Playwright the
// required evidence surface.

import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";
import {
  AJUSTES_COPY,
  BRAND,
  BUILDER_COPY,
  HISTORY_COPY,
  MODE_LABEL,
  RESUMEN_COPY,
  ROUTINES_COPY,
} from "../src/components/shared/copy";

const RUTAS: ReadonlyArray<{ url: string; encabezado: string }> = [
  { url: "/", encabezado: BRAND },
  { url: "/clasico", encabezado: MODE_LABEL.clasico },
  { url: "/tabata", encabezado: MODE_LABEL.tabata },
  { url: "/personalizado", encabezado: MODE_LABEL.personalizado },
  { url: "/rutinas", encabezado: ROUTINES_COPY.titulo },
  { url: "/historial", encabezado: HISTORY_COPY.titulo },
  { url: "/ajustes", encabezado: AJUSTES_COPY.titulo },
  { url: "/resumen", encabezado: RESUMEN_COPY.titulo },
];

const RUTINA = "PWA offline Personalizado";
const DURACION_ESPERADA = "00:03";
const HISTORY_STORAGE_KEY = "tiptap.history";

type MusicTelemetry = { calls: number; resolved: number };

/** Deterministic PCM WAV: 8 kHz mono, 80 ms of silence, valid without assets. */
function wavFixture(): Buffer {
  const sampleRate = 8_000;
  const samples = new Uint8Array(sampleRate * 0.08).fill(128);
  const bytes = new Uint8Array(44 + samples.length);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, value: string) =>
    [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  write(36, "data");
  view.setUint32(40, samples.length, true);
  bytes.set(samples, 44);
  return Buffer.from(bytes);
}

async function waitForControllingWorker(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          navigator.serviceWorker.ready.then((r) => r.active?.state ?? "ninguno"),
        ),
      { timeout: 20_000 },
    )
    .toBe("activated");
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), {
      timeout: 20_000,
    })
    .toBe(true);
}

async function createCanonicalRoutine(page: Page): Promise<void> {
  await page.goto("/ajustes");
  await page.locator('[data-testid="importar-cancion-input"]').setInputFiles({
    name: "offline-tone.wav",
    mimeType: "audio/wav",
    buffer: wavFixture(),
  });
  await expect(page.locator("p").filter({ hasText: /^offline-tone\.wav$/ })).toBeVisible();
  const trabajo = page.getByLabel(AJUSTES_COPY.musica.clases.trabajo);
  await trabajo.selectOption({ label: "offline-tone.wav" });
  await expect(trabajo).not.toHaveValue("");

  await page.getByRole("link", { name: "Inicio" }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: /^Personalizado/ }).click();
  await expect(page).toHaveURL(/\/personalizado$/);
  await page.getByRole("button", { name: BUILDER_COPY.anadirClasico }).click();
  await expect(page.getByRole("heading", { name: "Bloque 1 · Clásico" })).toBeVisible();
  await page.locator('input[id^="bloque-"][id$="-preparacionS"]').fill("1");
  await page.locator('input[id^="bloque-"][id$="-trabajoS"]').fill("2");
  await page.locator('input[id^="bloque-"][id$="-descansoS"]').fill("1");
  await page.locator('input[id^="bloque-"][id$="-rondas"]').fill("1");
  await expect(page.getByTestId("total-sesion")).toHaveText("0:03");
  await page.getByRole("button", { name: ROUTINES_COPY.guardarRutina }).click();
  const dialog = page.getByRole("dialog", { name: ROUTINES_COPY.guardar.titulo });
  await dialog.locator("#rutina-nombre").fill(RUTINA);
  await dialog.getByRole("button", { name: ROUTINES_COPY.guardar.confirmar }).click();
  await expect(page).toHaveURL(/\/personalizado$/);
  await expect(dialog).toBeHidden();
}

test("Personalizado saved routine completes with assigned music offline after first load", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const failedRequests: string[] = [];
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "?"}`,
    );
  });

  // Telemetry wraps the native method and returns its original promise unchanged.
  // It never supplies audio, mocks adapters, or short-circuits production playback.
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    const telemetry = { calls: 0, resolved: 0 };
    Object.defineProperty(window, "__offlineMusicTelemetry", {
      value: telemetry,
      configurable: true,
    });
    HTMLMediaElement.prototype.play = function playWithTelemetry(...args) {
      telemetry.calls += 1;
      const result = nativePlay.apply(this, args);
      void Promise.resolve(result).then(() => {
        telemetry.resolved += 1;
      });
      return result;
    };
  });

  // Worker control precedes every warming request. A reload makes the first
  // navigation worker-controlled even if registration completed during page load.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(BRAND);
  await waitForControllingWorker(page);
  await page.reload();
  await waitForControllingWorker(page);

  const manifestOnline = await page.evaluate(() =>
    fetch("/manifest.webmanifest").then((response) => response.status),
  );
  expect(manifestOnline).toBe(200);
  for (const { url, encabezado } of RUTAS) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(encabezado);
  }

  await createCanonicalRoutine(page);
  await page.getByRole("link", { name: "Rutinas" }).first().click();
  await expect(page).toHaveURL(/\/rutinas$/);
  const routine = page.locator("[data-routine-id]", { hasText: RUTINA });
  await expect(routine).toBeVisible();

  // Warm the exact saved-routine client transition plus its completion route.
  await routine.getByRole("button", { name: ROUTINES_COPY.iniciar }).click();
  await expect(page).toHaveURL(/\/sesion$/);
  await expect(page).toHaveURL(/\/resumen$/, { timeout: 20_000 });
  await page.evaluate((key) => localStorage.removeItem(key), HISTORY_STORAGE_KEY);
  await page.getByRole("link", { name: "Inicio" }).first().click();
  await expect(page).toHaveURL(/\/$/);

  // The assertion must prove playback in the OFFLINE session, not the warm-up.
  await page.evaluate(() => {
    const telemetry = (window as typeof window & {
      __offlineMusicTelemetry: MusicTelemetry;
    }).__offlineMusicTelemetry;
    telemetry.calls = 0;
    telemetry.resolved = 0;
  });
  await page.context().setOffline(true);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(BRAND);
  for (const { url, encabezado } of RUTAS) {
    if (url === "/") continue;
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(encabezado);
  }

  await page.goto("/rutinas");
  await expect(page.getByRole("status", { name: "Cargando datos" })).toBeHidden();
  const offlineRoutine = page.locator("[data-routine-id]", { hasText: RUTINA });
  await offlineRoutine.getByRole("button", { name: ROUTINES_COPY.iniciar }).click();
  await expect(page).toHaveURL(/\/sesion$/);
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as typeof window & {
              __offlineMusicTelemetry: MusicTelemetry;
            }).__offlineMusicTelemetry.resolved,
        ),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);
  await expect(page).toHaveURL(/\/resumen$/, { timeout: 20_000 });

  await expect(page.getByText(MODE_LABEL.personalizado, { exact: true })).toBeVisible();
  await expect(page.getByText("1 bloque", { exact: true })).toBeVisible();
  await expect(page.getByLabel(RESUMEN_COPY.tiempoActivo)).toHaveText(DURACION_ESPERADA);

  await page.goto("/historial");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(HISTORY_COPY.titulo);
  const entries = page.locator("[data-entry-id]");
  await expect(entries).toHaveCount(1);
  await expect(entries.first().getByText(MODE_LABEL.personalizado, { exact: true })).toBeVisible();
  await expect(entries.first().getByText("1 bloque", { exact: true })).toBeVisible();

  for (const url of [
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
  ]) {
    expect(await page.evaluate((asset) => fetch(asset).then((r) => r.status), url), url).toBe(200);
  }

  const fallbackResponse = await page.goto("/ruta-nunca-visitada");
  expect(fallbackResponse?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sin conexión");
  expect(failedRequests, `unhandled network failures:\n${failedRequests.join("\n")}`).toEqual([]);
});
