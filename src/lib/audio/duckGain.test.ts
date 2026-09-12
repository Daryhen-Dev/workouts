// duckGain (U11 — diseño §6.3) — automatización de la ganancia de ducking.
//
// La derivación PURA (duckEventsFor) ya está testeada en cues.test.ts (U10);
// aquí se prueba la capa impura DELGADA: el GainNode compartido sobre el
// AudioContext singleton (stub) y la aplicación de eventos con la MISMA
// convención de ancla que beepSynth (elapsedActiveMs ↔ ctx.currentTime).
//
// Nota de solape §6.3 (fases de 2 s): re-programar cancela lo pendiente ANTES
// de derivar; el rampBack de la transición saliente que aún no sonó se descarta
// y los eventos de la fase entrante se aplican en orden ascendente — ese
// desenlace documentado se fija aquí como aserción.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduledPhase } from "@/lib/timer/types";
import type { StubAudioContext, StubGainNode } from "@/test/fakes";
import { stubAudioContext } from "@/test/fakes";

// Entorno de audio bajo control del test: stub o null (sin Web Audio).
const audioHolder = vi.hoisted(() => ({
  ctx: null as StubAudioContext | null,
}));
vi.mock("@/lib/audio/context", () => ({
  getAudioContext: () => audioHolder.ctx,
  resumeIfSuspended: async () => {},
}));

import {
  cancelDuckAutomation,
  getDuckGain,
  resetDuckGainForTests,
  scheduleDuckAutomation,
} from "./duckGain";

/** Fase de trabajo de `durationS` segundos empezando en `startOffsetS`. */
function makePhase(
  durationS: number,
  startOffsetS = 0,
  index = 0,
): ScheduledPhase {
  return {
    index,
    kind: "trabajo",
    durationMs: durationS * 1000,
    startOffsetMs: startOffsetS * 1000,
    label: "Trabajo",
  };
}

/** La ganancia de duck es la única conectada al destino en este módulo aislado. */
function gainOf(): StubGainNode {
  const ctx = audioHolder.ctx!;
  const gain = ctx.gains.find((g) => g.connectedTo.includes(ctx.destination));
  expect(
    gain,
    "la ganancia de duck debe existir y estar conectada al destino",
  ).toBeDefined();
  return gain!;
}

beforeEach(() => {
  audioHolder.ctx = stubAudioContext(100); // reloj del contexto: 100 s
  resetDuckGainForTests();
});

afterEach(() => {
  audioHolder.ctx = null;
});

describe("getDuckGain — nodo compartido sobre el contexto singleton", () => {
  it("crea UNA sola ganancia conectada al destino, arrancando en 1", () => {
    const primera = getDuckGain();
    const segunda = getDuckGain();

    expect(primera).toBe(segunda);
    expect(audioHolder.ctx!.gains).toHaveLength(1);
    const gain = gainOf();
    expect(gain.connectedTo).toEqual([audioHolder.ctx!.destination]);
    expect(gain.gain.value).toBe(1);
  });

  it("sin Web Audio devuelve null y todo lo demás es no-op", () => {
    audioHolder.ctx = null;

    expect(getDuckGain()).toBeNull();
    expect(() => {
      scheduleDuckAutomation(makePhase(5), 0);
      cancelDuckAutomation();
    }).not.toThrow();
  });
});

describe("scheduleDuckAutomation — eventos exactos en el reloj del contexto", () => {
  it("fase de 5 s desde el inicio: cada cue queda enmarcado (0.25 antes, 1 después)", () => {
    scheduleDuckAutomation(makePhase(5), 0);

    const gain = gainOf();
    // Base 100 + ancla elapsed 0: baseline(1) + ducks a 1.85/2.85/3.85/4.85 s.
    expect(gain.gain.setValueAtTimeCalls).toEqual([
      { value: 1, time: 100 },
      { value: 0.25, time: 101.85 },
      { value: 0.25, time: 102.85 },
      { value: 0.25, time: 103.85 },
      { value: 0.25, time: 104.85 },
    ]);
    // Ramps tras cada ventana: 2.23/3.23/4.23 s + transición (250 ms) → 5.4 s.
    expect(gain.gain.linearRampToValueAtTimeCalls).toEqual([
      { value: 1, time: 102.23 },
      { value: 1, time: 103.23 },
      { value: 1, time: 104.23 },
      { value: 1, time: 105.4 },
    ]);
  });

  it("re-programar a mitad de fase descarta los eventos ya pasados", () => {
    scheduleDuckAutomation(makePhase(5), 2_500); // elapsed 2.5 s: cue de 2 s ya pasó

    const gain = gainOf();
    expect(gain.gain.setValueAtTimeCalls).toEqual([
      { value: 1, time: 100 },
      { value: 0.25, time: 100.35 },
      { value: 0.25, time: 101.35 },
      { value: 0.25, time: 102.35 },
    ]);
    expect(gain.gain.linearRampToValueAtTimeCalls).toEqual([
      { value: 1, time: 100.73 },
      { value: 1, time: 101.73 },
      { value: 1, time: 102.9 },
    ]);
  });
});

describe("re-programación y cancelación — nota de solape en fases de 2 s", () => {
  it("cancela lo pendiente antes de derivar; la fase entrante aplica ascendente", () => {
    // Fase A de 2 s [0,2000): cues a 1 y 2 s.
    scheduleDuckAutomation(makePhase(2, 0, 0), 0);
    let gain = gainOf();
    expect(gain.gain.setValueAtTimeCalls).toEqual([
      { value: 1, time: 100 },
      { value: 0.25, time: 100.85 },
      { value: 0.25, time: 101.85 },
    ]);
    expect(gain.gain.linearRampToValueAtTimeCalls).toEqual([
      { value: 1, time: 101.23 },
      { value: 1, time: 102.4 }, // rampBack de la transición saliente
    ]);

    // El reloj del contexto llega a la frontera; la fase B [2000,4000) se deriva.
    audioHolder.ctx!.advanceTime(2);
    scheduleDuckAutomation(makePhase(2, 2, 1), 2_000);

    gain = gainOf();
    // UNA cancelación por programación: la segunda derivación parte limpia.
    expect(gain.gain.cancelScheduledValuesCalls).toEqual([0, 0]);
    // El log acumula: primera aplicación + baseline nuevo + ducks de B ascendentes.
    expect(gain.gain.setValueAtTimeCalls).toEqual([
      { value: 1, time: 100 },
      { value: 0.25, time: 100.85 },
      { value: 0.25, time: 101.85 },
      { value: 1, time: 102 },
      { value: 0.25, time: 102.85 },
      { value: 0.25, time: 103.85 },
    ]);
    expect(gain.gain.linearRampToValueAtTimeCalls).toEqual([
      { value: 1, time: 101.23 },
      { value: 1, time: 102.4 },
      { value: 1, time: 103.23 },
      { value: 1, time: 104.4 },
    ]);
  });

  it("cancelDuckAutomation restaura la ganancia a 1 (música a tope)", () => {
    scheduleDuckAutomation(makePhase(5), 0);

    cancelDuckAutomation();

    const gain = gainOf();
    expect(gain.gain.cancelScheduledValuesCalls).toEqual([0, 0]);
    const ultima = gain.gain.setValueAtTimeCalls.at(-1);
    expect(ultima).toEqual({ value: 1, time: 100 });
  });
});

describe("grafo §6.3 — media element source a través del duck", () => {
  it("el stub del contexto expone createMediaElementSource (consumido por musicPlayer)", () => {
    const source = audioHolder.ctx!.createMediaElementSource({
      elemento: true,
    });
    expect(source.connectedTo).toEqual([]);
    expect(typeof source.connect).toBe("function");
  });
});
