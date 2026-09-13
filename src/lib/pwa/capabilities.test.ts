// capabilities (U12) — detección de service worker + postura sin SW.
//
// U12 aterriza SOLO `hasServiceWorker()` (la línea TRIANGULATE de «no
// service-worker browsers» del tasks.md la referencia literal); U13 extiende
// el registro con los seis módulos de capacidad y sus pruebas RED propias.
//
// jsdom NO define navigator.serviceWorker: es exactamente el navegador «sin
// service worker» del spec pwa — y la app debe seguir funcional en línea con
// localStorage + IndexedDB (spec pwa / local-data).

import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasBadging,
  hasServiceWorker,
  hasVibration,
  hasWakeLock,
} from "@/lib/pwa/capabilities";
import { buildHistoryEntry } from "@/lib/history/entry";
import { HISTORY_STORAGE_KEY, addHistoryEntry } from "@/stores/historyStore";
import {
  ROUTINE_WRITE_RESULT,
  ROUTINES_STORAGE_KEY,
  useRoutinesStore,
} from "@/stores/routinesStore";
import { createMusicStore } from "@/lib/storage/musicStore";
import {
  STORE_TRACK_BLOBS,
  openMusicDb,
  resetMusicDbForTests,
} from "@/lib/storage/db";
import { MODE, type ClasicoConfig } from "@/lib/timer/types";

// U13 A2b: detección Wake Lock del registro (informativa — la puerta real
// del lock es el no-op silencioso del adaptador A1, jamás un gate).

/** Config Clásico válida para las tiendas reales. */
const CONFIG_CLASICO: ClasicoConfig = {
  mode: MODE.clasico,
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("hasServiceWorker — detección perezosa (SSR-segura)", () => {
  it("false en jsdom: navigator.serviceWorker no existe (navegador sin SW)", () => {
    expect(navigator.serviceWorker).toBeUndefined();
    expect(hasServiceWorker()).toBe(false);
  });

  it("true cuando el navegador expone serviceWorker", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {},
      configurable: true,
    });
    try {
      expect(hasServiceWorker()).toBe(true);
    } finally {
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    }
  });

  it("importar el módulo no toca navigator en el nivel superior del módulo", async () => {
    // SSR: el módulo debe ser importable aunque navigator no exista (la
    // detección se evalúa al LLAMAR, nunca al importar — diseño §8.4).
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    try {
      Object.defineProperty(globalThis, "navigator", {
        get: () => undefined,
        configurable: true,
      });
      vi.resetModules();
      await import("@/lib/pwa/capabilities");
      expect(true).toBe(true); // llegó hasta aquí sin lanzar
    } finally {
      if (original) {
        Object.defineProperty(globalThis, "navigator", original);
      }
    }
  });
});

describe("sin service worker, la app sigue funcional en línea (persistencia)", () => {
  it("el registro está feature-gateado: sin navigator.serviceWorker no hay nada que registrar", () => {
    // La puerta de registro es la del sw-entry de Serwist («serviceWorker» in
    // navigator, verificado en su fuente) + esta detección: con hasServiceWorker()
    // false, ningún código de registro corre. En jsdom se cumple de forma
    // estructural: el global no existe.
    expect(hasServiceWorker()).toBe(false);
  });

  it("localStorage persiste rutinas + historial sin SW", async () => {
    expect(hasServiceWorker()).toBe(false);

    // Rutinas (localStorage "tiptap.routines")
    const resultado = useRoutinesStore
      .getState()
      .save(CONFIG_CLASICO, "Rutina sin SW");
    expect(resultado.status).toBe(ROUTINE_WRITE_RESULT.saved);

    // Historial (localStorage "tiptap.history") — la misma fábrica del
    // observador de completado (U8).
    addHistoryEntry(
      buildHistoryEntry({
        config: CONFIG_CLASICO,
        elapsedActiveMs: 85_000,
        completedAt: Date.now(),
      }),
    );

    const rutinasEnDisco = window.localStorage.getItem(ROUTINES_STORAGE_KEY);
    const historialEnDisco = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    expect(rutinasEnDisco).toContain("Rutina sin SW");
    expect(historialEnDisco).toContain("clasico");
  });

  it("IndexedDB (música) responde sin SW", async () => {
    expect(hasServiceWorker()).toBe(false);
    await resetMusicDbForTests();

    // Pipeline real de importación de U11 con la sonda OK inyectada (el fake
    // de IDB clona los Blob de jsdom como objeto plano — nota de fidelidad de
    // musicStore.test.ts; por eso se afirma por metadatos y conteo de blobs).
    const store = createMusicStore({ probeFile: async () => {} });
    const meta = await store.importTrack(
      new File([new Uint8Array([1, 2, 3, 4])], "cancion.mp3", {
        type: "audio/mpeg",
      }),
    );
    expect(await store.list()).toEqual([
      expect.objectContaining({ id: meta.id, name: "cancion.mp3" }),
    ]);

    const db = await openMusicDb();
    expect(await db.count(STORE_TRACK_BLOBS)).toBe(1);
    await db.close();
  });
});

describe("hasVibration — detección perezosa (SSR-segura, U13 B1)", () => {
  it("false en jsdom: navigator.vibrate no existe (navegador sin Vibration)", () => {
    expect("vibrate" in navigator).toBe(false);
    expect(hasVibration()).toBe(false);
  });

  it("true cuando el navegador expone vibrate", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: () => true,
      configurable: true,
    });
    try {
      expect(hasVibration()).toBe(true);
    } finally {
      delete (navigator as { vibrate?: unknown }).vibrate;
    }
  });

  it("false sin navigator (SSR): se evalúa al llamar, sin lanzar", () => {
    vi.stubGlobal("navigator", undefined);
    try {
      expect(hasVibration()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("hasWakeLock — detección perezosa (SSR-segura, U13 A2b)", () => {
  it("false en jsdom: navigator.wakeLock no existe (navegador sin Wake Lock)", () => {
    expect("wakeLock" in navigator).toBe(false);
    expect(hasWakeLock()).toBe(false);
  });

  it("true cuando el navegador expone wakeLock", () => {
    Object.defineProperty(navigator, "wakeLock", {
      value: { request: () => Promise.resolve() },
      configurable: true,
    });
    try {
      expect(hasWakeLock()).toBe(true);
    } finally {
      delete (navigator as { wakeLock?: unknown }).wakeLock;
    }
  });

      it("false sin navigator (SSR): se evalúa al llamar, sin lanzar", () => {
        vi.stubGlobal("navigator", undefined);
        try {
          expect(hasWakeLock()).toBe(false);
        } finally {
          vi.unstubAllGlobals();
        }
      });
    });

describe("hasBadging — detección perezosa (SSR-segura, U13 B2)", () => {
  it("false en jsdom: navigator.setAppBadge no existe (navegador sin Badging)", () => {
    expect("setAppBadge" in navigator).toBe(false);
    expect(hasBadging()).toBe(false);
  });

  it("true cuando el navegador expone setAppBadge", () => {
    Object.defineProperty(navigator, "setAppBadge", {
      value: () => Promise.resolve(),
      configurable: true,
    });
    try {
      expect(hasBadging()).toBe(true);
    } finally {
      delete (navigator as { setAppBadge?: unknown }).setAppBadge;
    }
  });

  it("false sin navigator (SSR): se evalúa al llamar, sin lanzar", () => {
    vi.stubGlobal("navigator", undefined);
    try {
      expect(hasBadging()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
