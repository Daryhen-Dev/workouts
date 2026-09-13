// Adaptador de badging (U13 B2 — diseño §8.4, spec pwa «App Badging»).
// Contrato: SSR-seguro, no-op silencioso sin Badging API (Firefox/Safari),
// fallos síncronos y promesas rechazadas tragados — jamás rompe la sesión.
//
// jsdom NO define setAppBadge/clearAppBadge: es exactamente el «No badge
// elsewhere» del spec pwa — sin badge, sin error, y la sesión es idéntica.
import { afterEach, describe, expect, it, vi } from "vitest";
import { installBadgingFake } from "@/test/fakes";

import { clearSessionBadge, setSessionBadge } from "./badging";

afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as { setAppBadge?: unknown }).setAppBadge;
  delete (navigator as { clearAppBadge?: unknown }).clearAppBadge;
});

describe("badging — adaptador (U13 B2)", () => {
  it("soportado: setAppBadge UNA vez y SIN argumento (badge por defecto — el MAY de pausa NO se usa)", () => {
    const badging = installBadgingFake();

    setSessionBadge();

    expect(badging.setCalls).toEqual([undefined]);
    expect(badging.clearCalls).toBe(0);
  });

  it("soportado: clearAppBadge UNA vez, sin set previo", () => {
    const badging = installBadgingFake();

    clearSessionBadge();

    expect(badging.clearCalls).toBe(1);
    expect(badging.setCalls).toEqual([]);
  });

  it("sin Badging API: no-op silencioso (Firefox/Safari) — sin llamadas ni error", () => {
    // navigator jsdom real: sin setAppBadge/clearAppBadge.
    expect(() => setSessionBadge()).not.toThrow();
    expect(() => clearSessionBadge()).not.toThrow();
  });

  it("sin navigator (SSR): no-op — se evalúa al llamar, sin lanzar", () => {
    vi.stubGlobal("navigator", undefined);
    expect(() => setSessionBadge()).not.toThrow();
    expect(() => clearSessionBadge()).not.toThrow();
  });

  it("fallo síncrono de la API: tragado — jamás rompe la sesión", () => {
    const boom = (): Promise<void> => {
      throw new DOMException("InvalidStateError");
    };
    Object.defineProperty(navigator, "setAppBadge", {
      value: boom,
      configurable: true,
    });
    Object.defineProperty(navigator, "clearAppBadge", {
      value: boom,
      configurable: true,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => setSessionBadge()).not.toThrow();
    expect(() => clearSessionBadge()).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("promesa rechazada: tragada — sin unhandled rejection", async () => {
    Object.defineProperty(navigator, "setAppBadge", {
      value: () => Promise.reject(new Error("badge refused")),
      configurable: true,
    });

    expect(() => setSessionBadge()).not.toThrow();
    await Promise.resolve(); // drena microtareas: un rechazo suelto fallaría aquí
  });
});
