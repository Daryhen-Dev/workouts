// Adaptador de vibración (U13 B1 — diseño §8.4, spec pwa «Vibration on Phase
// Transitions»). Contrato: SSR-seguro, no-op silencioso sin navigator.vibrate
// (iOS) y fallos síncronos de la API tragados — jamás rompe la sesión.
//
// jsdom NO define navigator.vibrate: es exactamente el «No-op on iOS» del spec
// pwa — sin vibración, sin error, y el beep + cambio visual siguen marcando la
// transición.
import { afterEach, describe, expect, it, vi } from "vitest";
import { installVibrationFake } from "@/test/fakes";

import { TRANSITION_PATTERN, vibrateOnTransition } from "./vibration";

afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as { vibrate?: unknown }).vibrate;
});

describe("vibrateOnTransition — adaptador", () => {
  it("soportado: vibra UNA vez con el patrón de transición (constante nombrada)", () => {
    const { patterns } = installVibrationFake();

    vibrateOnTransition();

    expect(patterns).toEqual([TRANSITION_PATTERN]);
  });

  it("sin navigator.vibrate: no-op silencioso (iOS) — sin llamadas ni error", () => {
    // navigator jsdom real: sin vibrate (equivalente a vi.unstubAllGlobals).
    expect(() => vibrateOnTransition()).not.toThrow();
  });

  it("sin navigator (SSR): no-op — se evalúa al llamar, sin lanzar", () => {
    vi.stubGlobal("navigator", undefined);
    expect(() => vibrateOnTransition()).not.toThrow();
  });

  it("fallo síncrono de la API: tragado — jamás rompe la sesión", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: () => {
        throw new DOMException("NotAllowedError");
      },
      configurable: true,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => vibrateOnTransition()).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
