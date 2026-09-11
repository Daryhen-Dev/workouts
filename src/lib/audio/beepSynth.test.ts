// beepSynth — capa impura DELGADA (U10 — diseño §6.2). Tests con stubAudioContext:
// el módulo `./context` se mockea con un holder para entregar el stub (jsdom no
// tiene Web Audio). Se afirman tiempos EXACTOS en el reloj del contexto, los
// envolventes de oscilador/ganancia, la cancelación y el no-op sobre null.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubAudioContext, type StubAudioContext } from "@/test/fakes";

// El contexto activo lo decide cada test (null = sin Web Audio).
const audioHolder = vi.hoisted(() => ({
  ctx: null as StubAudioContext | null,
}));
vi.mock("@/lib/audio/context", () => ({
  getAudioContext: () => audioHolder.ctx,
  resumeIfSuspended: vi.fn(async () => {}),
}));

import { BEEP } from "./cues";
import { cancelScheduledCues, schedulePhaseCues } from "./beepSynth";
import type { ScheduledPhase } from "@/lib/timer/types";

/** Fase sintética en coordenadas activas: S=1000, D=5000 → cues 3000/4000/5000 + transición 6000. */
const PHASE_5S: ScheduledPhase = {
  index: 1,
  kind: "trabajo",
  durationMs: 5_000,
  startOffsetMs: 1_000,
  label: "Trabajo",
};

const BLIP_S = BEEP.blipDurationMs / 1000;
const TRANSITION_GAP_S = (BEEP.blipDurationMs + BEEP.transitionGapMs) / 1000;

beforeEach(() => {
  audioHolder.ctx = stubAudioContext(100); // reloj del contexto en 100 s
});

afterEach(() => {
  cancelScheduledCues(); // limpia pendientes del módulo entre tests
  audioHolder.ctx = null;
});

describe("schedulePhaseCues — conversión ancla activo-ms → reloj del contexto", () => {
  it("5 s de fase desde elapsed 0: blips en tiempos EXACTOS del contexto", () => {
    schedulePhaseCues(PHASE_5S, 0);

    const blips = audioHolder.ctx!.blips();
    // 3 countdown (880 Hz) + transición DOBLE blip (1245 Hz) = 5 osciladores.
    expect(blips.map((b) => b.frequencyHz)).toEqual([
      BEEP.countdownFrequencyHz,
      BEEP.countdownFrequencyHz,
      BEEP.countdownFrequencyHz,
      BEEP.transitionFrequencyHz,
      BEEP.transitionFrequencyHz,
    ]);
    // ancla: base 100 s ↔ elapsed 0 ms → cue activo 3000 ms ⇒ ctx 103 s; etc.
    expect(blips.map((b) => b.startedAt)).toEqual([
      103,
      104,
      105,
      106,
      106 + TRANSITION_GAP_S,
    ]);
  });

  it("anchor intermedio: elapsed 3500 ms re-ancla la conversión (no desde 0)", () => {
    // cues 3000 (pasado)/4000/5000/6000; elapsed 3500 → deltas 500/1500/2500 ms desde base 100.
    schedulePhaseCues(PHASE_5S, 3_500);

    const blips = audioHolder.ctx!.blips();
    expect(blips.map((b) => b.startedAt)).toEqual([
      100.5,
      101.5,
      102.5,
      102.5 + TRANSITION_GAP_S,
    ]);
  });

  it("descarta los cues que ya quedaron en el pasado (§6.3: drop cues now in the past)", () => {
    // elapsed 4000: cues 3000/4000 pasados; quedan 5000 (countdown) y 6000 (transición).
    schedulePhaseCues(PHASE_5S, 4_000);

    const blips = audioHolder.ctx!.blips();
    expect(blips.map((b) => b.frequencyHz)).toEqual([
      BEEP.countdownFrequencyHz,
      BEEP.transitionFrequencyHz,
      BEEP.transitionFrequencyHz,
    ]);
    expect(blips.map((b) => b.startedAt)).toEqual([
      101,
      102,
      102 + TRANSITION_GAP_S,
    ]);
  });

  it("un cue EXACTAMENTE en el ahora se descarta (no hay ventana para programarlo)", () => {
    schedulePhaseCues(PHASE_5S, 3_000); // cue 3000 == elapsed 3000 → pasado inmediato

    const blips = audioHolder.ctx!.blips();
    expect(blips.map((b) => b.startedAt)).toEqual([
      101,
      102,
      103,
      103 + TRANSITION_GAP_S,
    ]);
  });

  it("la transición es acústicamente distinta: otra frecuencia Y doble blip", () => {
    schedulePhaseCues(PHASE_5S, 0);

    const blips = audioHolder.ctx!.blips();
    const transition = blips.filter(
      (b) => b.frequencyHz === BEEP.transitionFrequencyHz,
    );
    expect(transition).toHaveLength(2);
    expect(transition[1].startedAt - transition[0].startedAt).toBeCloseTo(
      TRANSITION_GAP_S,
      6,
    );
    expect(BEEP.transitionFrequencyHz).not.toBe(BEEP.countdownFrequencyHz);
  });
});

describe("schedulePhaseCues — envolventes de oscilador/ganancia", () => {
  it("cada blip: envolvente ADSR-rápido sobre GainNode + start/stop en tiempos exactos", () => {
    schedulePhaseCues(PHASE_5S, 0);

    const ctx = audioHolder.ctx!;
    // primer blip: countdown en ctx 103.
    const gain = ctx.gains[0];
    expect(gain.gain.setValueAtTimeCalls).toEqual([
      { value: expect.any(Number), time: 103 },
    ]);
    const ramps = gain.gain.exponentialRampToValueAtTimeCalls;
    expect(ramps).toHaveLength(2);
    expect(ramps[0].time).toBe(103 + 0.005); // ataque
    expect(ramps[1].time).toBeCloseTo(103 + BLIP_S, 6); // caída al final del blip
    expect(ramps[0].value).toBeGreaterThan(ramps[1].value); // sube a pico, baja a silencio
    expect(ramps[1].value).toBeGreaterThan(0); // exponentialRamp exige > 0

    const osc = ctx.oscillators[0];
    expect(osc.startCalls).toEqual([103]);
    expect(osc.stopCalls).toHaveLength(1);
    expect(osc.stopCalls[0]).toBeGreaterThan(103 + BLIP_S); // parada tras el blip

    // grafo: oscilador → ganancia → destino.
    expect(osc.connectedTo).toContain(gain);
    expect(gain.connectedTo).toContain(ctx.destination);
  });
});

describe("cancelScheduledCues — pausa: no se deben beeps mientras pausada (§6.3)", () => {
  it("cancela todos los pendientes: stop precoz + desconexión de ganancia", () => {
    schedulePhaseCues(PHASE_5S, 0);
    const ctx = audioHolder.ctx!;
    expect(ctx.oscillators).toHaveLength(5);

    cancelScheduledCues();

    for (const blip of ctx.blips()) expect(blip.canceled).toBe(true);
    for (const gain of ctx.gains) expect(gain.disconnectCalls).toBe(1);
  });

  it("re-programar tras cancelar parte de cero: nodos nuevos, sin duplicados vivos", () => {
    schedulePhaseCues(PHASE_5S, 0);
    cancelScheduledCues();
    audioHolder.ctx!.advanceTime(1); // el contexto avanzó (tiempo real)
    schedulePhaseCues(PHASE_5S, 1_000);

    const blips = audioHolder.ctx!.blips();
    expect(blips).toHaveLength(10); // 5 cancelados + 5 re-programados
    // base 101 s ↔ elapsed 1000 ms: cue 3000 → 103, …, transición 6000 → 106.
    expect(blips.slice(5).map((b) => b.startedAt)).toEqual([
      103,
      104,
      105,
      106,
      106 + TRANSITION_GAP_S,
    ]);
    // Los re-programados no están cancelados.
    for (const blip of blips.slice(5)) expect(blip.canceled).toBe(false);
  });

  it("cancelar sin pendientes es un no-op seguro", () => {
    expect(() => cancelScheduledCues()).not.toThrow();
  });
});

describe("schedulePhaseCues — sin Web Audio (spec: No Web Audio, no failure)", () => {
  it("contexto null: no-op silencioso, sin nodos, sin lanzar", () => {
    audioHolder.ctx = null;

    expect(() => schedulePhaseCues(PHASE_5S, 0)).not.toThrow();
    // Sin contexto no hay registro alguno — la sesión sigue su curso.
  });
});
