// Adaptador de Media Session (U13 C1 — diseño §8.4, spec pwa «Media Session
// Controls While Music Plays»). Contrato del ADAPTADOR (la decisión de CUÁNDO
// exponer metadata/handlers es del driver C2):
// - SSR-seguro: nada se evalúa en el nivel superior; los globals se tocan solo
//   dentro de las funciones (estos tests importan el módulo con navigator
//   ausente/undefined y no explota — prueba estructural de SSR).
// - Sin navigator.mediaSession → no-op silencioso (jsdom NO la implementa).
// - Registra EXACTAMENTE play/pause/stop; un fallo síncrono de UNA acción no
//   impide el registro de las demás; la limpieza es individual por acción.
// - Metadata best effort: usa MediaMetadata si existe; objeto plano si no.
// - Libre de copy y del session store: entradas y callbacks los aporta C2.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMediaSessionFake } from "@/test/fakes";

import {
  MEDIA_SESSION_ACTIONS,
  clearSessionMediaHandlers,
  setSessionMedia,
} from "./mediaSession";

const METADATA = { title: "Tip Tap Workout — Clásico", artist: "Entrenamiento" };

function noopHandlers(): { onPlay: () => void; onPause: () => void; onStop: () => void } {
  return { onPlay: () => {}, onPause: () => {}, onStop: () => {} };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mediaSession — adaptador (U13 C1)", () => {
  it("sin Media Session API (jsdom real): no-op silencioso — sin llamadas ni error", () => {
    expect("mediaSession" in navigator).toBe(false);

    expect(() => setSessionMedia(METADATA, noopHandlers())).not.toThrow();
    expect(() => clearSessionMediaHandlers()).not.toThrow();
  });

  it("sin navigator (SSR): no-op — se evalúa al llamar, sin lanzar", () => {
    vi.stubGlobal("navigator", undefined);

    expect(() => setSessionMedia(METADATA, noopHandlers())).not.toThrow();
    expect(() => clearSessionMediaHandlers()).not.toThrow();
  });

  it("soportado: registra EXACTAMENTE play, pause y stop — cada callback en su acción", () => {
    const fake = installMediaSessionFake();
    const calls: string[] = [];

    setSessionMedia(METADATA, {
      onPlay: () => calls.push("play"),
      onPause: () => calls.push("pause"),
      onStop: () => calls.push("stop"),
    });

    expect(MEDIA_SESSION_ACTIONS).toEqual(["play", "pause", "stop"]);
    expect(fake.setActionHandlerCalls.map((c) => c.action)).toEqual([
      "play",
      "pause",
      "stop",
    ]);
    fake.handlers.get("play")?.();
    fake.handlers.get("pause")?.();
    fake.handlers.get("stop")?.();
    expect(calls).toEqual(["play", "pause", "stop"]);
  });

  it("metadata: usa el constructor MediaMetadata cuando existe", () => {
    const fake = installMediaSessionFake();
    const inits: unknown[] = [];
    class FakeMediaMetadata {
      constructor(init: unknown) {
        inits.push(init);
      }
    }
    vi.stubGlobal("MediaMetadata", FakeMediaMetadata);

    setSessionMedia(METADATA, noopHandlers());

    expect(inits).toEqual([METADATA]);
    expect(fake.metadataSets[0]).toBeInstanceOf(FakeMediaMetadata);
  });

  it("metadata best effort SIN MediaMetadata: objeto plano asignado (sin lanzar)", () => {
    const fake = installMediaSessionFake();
    expect(typeof globalThis.MediaMetadata).toBe("undefined");

    setSessionMedia(METADATA, noopHandlers());

    expect(fake.metadataSets).toEqual([METADATA]);
  });

  it("fallo síncrono de UNA acción: tragado — las demás acciones se registran", () => {
    const fake = installMediaSessionFake();
    const real = fake.session.setActionHandler.bind(fake.session);
    fake.session.setActionHandler = (action, handler) => {
      if (action === "pause") throw new DOMException("NotSupportedError");
      real(action, handler);
    };

    expect(() => setSessionMedia(METADATA, noopHandlers())).not.toThrow();

    expect(fake.handlers.get("play")).toBeTypeOf("function");
    expect(fake.handlers.has("pause")).toBe(false);
    expect(fake.handlers.get("stop")).toBeTypeOf("function");
  });

  it("fallo del setter de metadata: tragado — los handlers se registran igual", () => {
    const fake = installMediaSessionFake();
    Object.defineProperty(fake.session, "metadata", {
      get: () => null,
      set() {
        throw new DOMException("TypeMismatchError");
      },
      configurable: true,
    });

    expect(() => setSessionMedia(METADATA, noopHandlers())).not.toThrow();

    expect([...fake.handlers.keys()]).toEqual(["play", "pause", "stop"]);
  });

  it("clear: pone null en las tres acciones, individualmente", () => {
    const fake = installMediaSessionFake();
    setSessionMedia(METADATA, noopHandlers());

    clearSessionMediaHandlers();

    const clearCalls = fake.setActionHandlerCalls.slice(3);
    expect(clearCalls.map((c) => c.action)).toEqual(["play", "pause", "stop"]);
    expect(clearCalls.every((c) => c.handler === null)).toBe(true);
    expect(fake.handlers.get("play")).toBeNull();
    expect(fake.handlers.get("pause")).toBeNull();
    expect(fake.handlers.get("stop")).toBeNull();
  });

  it("clear: un fallo síncrono de una acción no impide limpiar las demás", () => {
    const fake = installMediaSessionFake();
    setSessionMedia(METADATA, noopHandlers());
    const real = fake.session.setActionHandler.bind(fake.session);
    fake.session.setActionHandler = (action, handler) => {
      if (action === "pause" && handler === null) throw new DOMException("InvalidStateError");
      real(action, handler);
    };

    expect(() => clearSessionMediaHandlers()).not.toThrow();

    expect(fake.handlers.get("play")).toBeNull();
    expect(fake.handlers.get("pause")).toBeTypeOf("function"); // no se pudo limpiar
    expect(fake.handlers.get("stop")).toBeNull();
  });

  it("re-exposición (C2 puede re-poner metadata al volver la música): segunda llamada re-asigna y re-registra", () => {
    const fake = installMediaSessionFake();
    setSessionMedia(METADATA, noopHandlers());
    clearSessionMediaHandlers();

    setSessionMedia({ title: "Tip Tap Workout — Tabata" }, noopHandlers());

    expect(fake.metadataSets).toEqual([
      METADATA,
      { title: "Tip Tap Workout — Tabata", artist: undefined },
    ]);
    // 3 (set inicial) + 3 (clear) + 3 (re-set) — re-registro completo.
    expect(fake.setActionHandlerCalls).toHaveLength(9);
    expect(
      fake.setActionHandlerCalls.slice(6).map((c) => c.action),
    ).toEqual(["play", "pause", "stop"]);
    expect(
      fake.setActionHandlerCalls.slice(6).every((c) => c.handler !== null),
    ).toBe(true);
  });

  it("contrato C1: libre de copy y del session store — el adaptador no los importa", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/pwa/mediaSession.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/components\/shared\/copy/u);
    expect(source).not.toMatch(/stores\/sessionStore/u);
    // Sin otros globals de navegador: el adaptador SOLO toca navigator, y bajo
    // guarda typeof (SSR) — window/document no tienen razón de ser aquí.
    expect(source).not.toMatch(/\bwindow\b|\bdocument\b/u);
  });
});
