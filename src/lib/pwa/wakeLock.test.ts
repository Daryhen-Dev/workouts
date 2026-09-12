// Adaptador Screen Wake Lock — U13 A1 (diseño §8.4, spec pwa «Wake Lock
// During Active Workout»). A1 cubre SOLO el adaptador a nivel de plataforma;
// el cableo con el ciclo de vida de la sesión es A2 (sin React aquí).
//
// El fake de plataforma vive en `src/test/fakes.ts` (extraído en A2a del
// reslice aprobado de A2 para reutilizarlo en A2b): resuelve CADA petición
// de forma DIFERIDA y PRESERVA el resto del navigator de jsdom (A2b monta
// React sobre él).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
 installWakeLockFake,
 type WakeLockRequestRecord,
} from "../../test/fakes";
import { createWakeLockController } from "./wakeLock";

/** Montaje estándar: plataforma falsa (compartida) + controlador fresco por test. */
function setup(): {
 requests: WakeLockRequestRecord[];
 controller: ReturnType<typeof createWakeLockController>;
} {
 const { requests } = installWakeLockFake();
 return { requests, controller: createWakeLockController() };
}

/** Patrón del repo (sessionAudio/audioDegradation): redefinir visibilityState. */
function setVisibility(state: "visible" | "hidden"): void {
 Object.defineProperty(document, "visibilityState", {
  value: state,
  configurable: true,
 });
}

/** Espera a que corran las microtareas (resolución del adaptador). */
async function flush(): Promise<void> {
 await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
 setVisibility("visible");
});

afterEach(() => {
 vi.unstubAllGlobals();
});

describe("createWakeLockController — adaptador Wake Lock (A1)", () => {
 it("SSR: importar y operar sin globals de navegador es silencioso, sin lanzar", async () => {
  vi.stubGlobal("navigator", undefined);
  vi.stubGlobal("document", undefined);
  vi.resetModules();
  const { createWakeLockController: create } = await import("./wakeLock");
  const controller = create();
  expect(() => {
   controller.acquire();
   controller.onVisibleReturn();
   controller.release();
   controller.dispose();
  }).not.toThrow(); // afterEach restaura los globals
 });

 it("sin navigator.wakeLock: todo es no-op silencioso (spec «Unsupported platforms skip silently»)", () => {
  vi.stubGlobal("navigator", {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const controller = createWakeLockController();

  expect(() => {
   controller.acquire();
   controller.onVisibleReturn();
   controller.release();
   controller.dispose();
  }).not.toThrow();
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
 });

 it("acquire visible soportado: pide «screen», retiene el sentinel y release() lo suelta una vez", async () => {
  const { requests, controller } = setup();

  controller.acquire();
  expect(requests).toHaveLength(1);
  expect(requests[0].type).toBe("screen");
  expect(requests[0].sentinel.releaseCalls).toBe(0); // retenido, no soltado

  requests[0].resolve();
  await flush();
  expect(requests[0].sentinel.releaseCalls).toBe(0); // sigue retenido

  controller.release();
  controller.release(); // idempotente: sin doble release de plataforma
  expect(requests[0].sentinel.releaseCalls).toBe(1);
 });

 it("acquire repetido con el lock retenido: no hay segunda petición (idempotente)", async () => {
  const { requests, controller } = setup();

  controller.acquire();
  requests[0].resolve();
  await flush();

  controller.acquire();
  controller.onVisibleReturn(); // ya retenido: tampoco re-pide
  expect(requests).toHaveLength(1);
 });

 it("petición rechazada (AbortError): silenciosa, y un acquire posterior reintenta", async () => {
  const { requests, controller } = setup();

  controller.acquire();
  requests[0].reject(new DOMException("aborted", "AbortError"));
  await expect(flush()).resolves.toBeUndefined(); // sin rechazo no manejado

  controller.acquire();
  expect(requests).toHaveLength(2); // el reintento se difiere al próximo acquire
  requests[1].resolve();
  await flush();
  expect(requests[1].sentinel.releaseCalls).toBe(0);
 });

 it("acquire con la página OCULTA: difiere (no pide); el retorno visible pide (spec: re-acquire)", async () => {
  const { requests, controller } = setup();

  setVisibility("hidden");
  controller.acquire();
  controller.onVisibleReturn(); // sigue oculto: nada
  expect(requests).toHaveLength(0);

  setVisibility("visible");
  controller.onVisibleReturn();
  expect(requests).toHaveLength(1);
  requests[0].resolve();
  await flush();
  expect(requests[0].sentinel.releaseCalls).toBe(0);
 });

 it("onVisibleReturn sin acquire previo: no pide nada", () => {
  const { requests, controller } = setup();

  controller.onVisibleReturn();
  expect(requests).toHaveLength(0);
 });

 it("dispose: suelta el sentinel, desactiva el adaptador y es idempotente", async () => {
  const { requests, controller } = setup();

  controller.acquire();
  requests[0].resolve();
  await flush();

  controller.dispose();
  expect(requests[0].sentinel.releaseCalls).toBe(1);

  controller.acquire(); // desactivado: no-op
  expect(requests).toHaveLength(1);
  expect(() => controller.dispose()).not.toThrow();
 });
});

describe("createWakeLockController — carreras y política re-adquisición (A1)", () => {
 it("soltado INESPERADO en primer plano: re-petición inmediata (spec: re-acquire)", async () => {
  const { requests, controller } = setup();

  controller.acquire();
  requests[0].resolve();
  await flush();
  expect(requests).toHaveLength(1);

  requests[0].sentinel.dispatchOsRelease();
  expect(requests).toHaveLength(2); // inmediata: sin esperar retorno visible

  requests[1].resolve();
  await flush();
  controller.release();
  expect(requests[0].sentinel.releaseCalls).toBe(0); // el SO ya lo soltó
  expect(requests[1].sentinel.releaseCalls).toBe(1);
 });

 it("el SO suelta el lock al OCULTARSE: sin re-petición oculto; retorno visible re-adquiere (spec)", async () => {
  const { requests, controller } = setup();

  controller.acquire();
  requests[0].resolve();
  await flush();

  setVisibility("hidden");
  requests[0].sentinel.dispatchOsRelease(); // el navegador suelta al ocultar
  expect(requests).toHaveLength(1); // oculto: jamás re-pide

  setVisibility("visible");
  controller.onVisibleReturn();
  expect(requests).toHaveLength(2);
  requests[1].resolve();
  await flush();
  expect(requests[1].sentinel.releaseCalls).toBe(0); // re-adquirido
 });

 it("acquire CONCURRENTE + retorno visible con la petición sin resolver: UNA sola petición, sin huérfanos", async () => {
  const { requests, controller } = setup();

  controller.acquire(); // petición en vuelo
  controller.acquire();
  controller.onVisibleReturn();
  expect(requests).toHaveLength(1); // deduplicación de petición en vuelo

  requests[0].resolve();
  await flush();
  expect(requests).toHaveLength(1);
  expect(requests[0].sentinel.releaseCalls).toBe(0); // retenido, no huérfano
 });

 it("release con la petición EN VUELO: el sentinel resultante se suelta y NUNCA queda activo (carrera del verificador)", async () => {
  const { requests, controller } = setup();

  controller.acquire(); // en vuelo…
  controller.release(); // …revoca la intención antes de resolver
  requests[0].resolve();
  await flush();

  expect(requests[0].sentinel.releaseCalls).toBe(1); // huérfano imposible: soltado en el acto

  controller.acquire(); // si el resultado tardío hubiera quedado activo, no habría petición
  expect(requests).toHaveLength(2);
  requests[1].resolve();
  await flush();
  expect(requests[1].sentinel.releaseCalls).toBe(0); // este sí queda activo
 });

 it("release→acquire con la PRIMERA petición en vuelo: el resultado tardío se suelta y no sobreescribe al vigente (token)", async () => {
  const { requests, controller } = setup();

  controller.acquire(); // petición A (gen 0) en vuelo
  controller.release(); // gen 1: A queda invalidada
  controller.acquire(); // petición B (gen 1)
  expect(requests).toHaveLength(2);

  requests[0].resolve(); // A tardía: se suelta, jamás se activa
  requests[1].resolve(); // B vigente: se retiene
  await flush();

  expect(requests[0].sentinel.releaseCalls).toBe(1);
  expect(requests[1].sentinel.releaseCalls).toBe(0);

  controller.release();
  expect(requests[1].sentinel.releaseCalls).toBe(1);
 });
});

describe("installWakeLockFake — contrato del fake compartido (A2a)", () => {
 it("preserva el resto del navigator de jsdom (A2b monta React sobre él)", () => {
  const userAgent = navigator.userAgent; // propiedad jsdom previa a instalar

  installWakeLockFake();

  expect(navigator.userAgent).toBe(userAgent);
  expect("wakeLock" in navigator).toBe(true);
  expect(typeof navigator.wakeLock.request).toBe("function"); // lectura real del adaptador
 });
});
