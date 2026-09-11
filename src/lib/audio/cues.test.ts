// Cue planner PURO (U10 — diseño §6.2, spec audio "In-Memory Countdown Beeps").
//
// `planPhaseCues` trabaja en coordenadas de TIEMPO ACTIVO (startOffsetMs del
// plan U3): la convención de los últimos 3 segundos — un beep por segundo
// restante (3, 2, 1), fases de menos de 3 s obtienen un beep por segundo de la
// fase COMPLETA — más UN cue de transición acústicamente distinguible en la
// frontera S+D. Sin Web Audio, sin DOM: solo aritmética sobre ScheduledPhase.
import { describe, expect, it } from "vitest";
import { compilePlan } from "@/lib/timer/plan";
import type { SessionConfig } from "@/lib/timer/types";
import {
  BEEP,
  CUE_KIND,
  DUCK_EVENT_KIND,
  duckEventsFor,
  planPhaseCues,
} from "./cues";

/** Clásico del spec: prep 10, trabajo 30, descanso 15, 2 rondas → 85 s. */
const CLASICO_85: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

/** Fase real del plan compilado (offsets acumulativos, no cero — expone errores de coordenadas). */
function phaseOf(index: number) {
  const plan = compilePlan(CLASICO_85);
  return plan[index];
}

/** Fase sintética con offset explícito. */
function phase(startOffsetMs: number, durationMs: number) {
  return { ...phaseOf(0), startOffsetMs, durationMs };
}

describe("planPhaseCues — convención de los últimos 3 segundos (spec audio)", () => {
  it("fase de 5 s: countdown a los restantes 3, 2, 1 s + transición en la frontera", () => {
    // S=1000, D=5000 → frontera en 6000.
    const cues = planPhaseCues(phase(1_000, 5_000));

    expect(cues).toEqual([
      { atActiveMs: 3_000, kind: CUE_KIND.countdown }, // restan 3 s
      { atActiveMs: 4_000, kind: CUE_KIND.countdown }, // restan 2 s
      { atActiveMs: 5_000, kind: CUE_KIND.countdown }, // restan 1 s
      { atActiveMs: 6_000, kind: CUE_KIND.transition }, // frontera S+D
    ]);
  });

  it("fase de 2 s (spec «Short phase»): beeps a los 2 y 1 s restantes + transición", () => {
    const cues = planPhaseCues(phase(0, 2_000));

    expect(cues).toEqual([
      { atActiveMs: 0, kind: CUE_KIND.countdown }, // restan 2 s (la fase entera)
      { atActiveMs: 1_000, kind: CUE_KIND.countdown }, // restan 1 s
      { atActiveMs: 2_000, kind: CUE_KIND.transition },
    ]);
  });

  it("fase de 1 s: un único beep al inicio de la fase + transición", () => {
    const cues = planPhaseCues(phase(5_000, 1_000));

    expect(cues).toEqual([
      { atActiveMs: 5_000, kind: CUE_KIND.countdown },
      { atActiveMs: 6_000, kind: CUE_KIND.transition },
    ]);
  });

  it("fase de 3 s: beeps a los 3, 2, 1 s restantes (la fase completa cuenta)", () => {
    const cues = planPhaseCues(phase(0, 3_000));

    expect(cues).toEqual([
      { atActiveMs: 0, kind: CUE_KIND.countdown }, // restan 3 s
      { atActiveMs: 1_000, kind: CUE_KIND.countdown },
      { atActiveMs: 2_000, kind: CUE_KIND.countdown },
      { atActiveMs: 3_000, kind: CUE_KIND.transition },
    ]);
  });

  it("fase de 4 s: solo los últimos 3 s suenan (4 → 3, 2, 1)", () => {
    const cues = planPhaseCues(phase(0, 4_000));

    expect(cues).toEqual([
      { atActiveMs: 1_000, kind: CUE_KIND.countdown },
      { atActiveMs: 2_000, kind: CUE_KIND.countdown },
      { atActiveMs: 3_000, kind: CUE_KIND.countdown },
      { atActiveMs: 4_000, kind: CUE_KIND.transition },
    ]);
  });

  it("cualquier kind de fase y modo produce cues (prep/trabajo/descanso del plan real)", () => {
    // Plan 85 s: prep[0,10) t[10,40) d[40,55) t[55,85) — todas con countdown+transición.
    const plan = compilePlan(CLASICO_85);
    for (const ph of plan) {
      const cues = planPhaseCues(ph);
      expect(
        cues.length,
        `fase ${ph.index} (${ph.label})`,
      ).toBeGreaterThanOrEqual(2);
      expect(cues.at(-1)).toEqual({
        atActiveMs: ph.startOffsetMs + ph.durationMs,
        kind: CUE_KIND.transition,
      });
    }
  });

  it("guarda defensiva: duración sub-segundo jamás produce un cue antes del inicio de la fase", () => {
    // El schema exige ≥1 s, pero el planner es puro y público: D=500 con k=1
    // daría S−500 (¡fase anterior!) — el cue se descarta.
    const cues = planPhaseCues(phase(1_000, 500));

    expect(cues).toEqual([{ atActiveMs: 1_500, kind: CUE_KIND.transition }]);
  });
});

describe("duckEventsFor — eventos de ducking que enmarcan cada cue (base U11)", () => {
  it("un cue de countdown se enmarca con duckDown antes y rampBack después", () => {
    const [events] = duckEventsFor([
      { atActiveMs: 4_000, kind: CUE_KIND.countdown },
    ]);

    expect(events).toEqual({
      kind: DUCK_EVENT_KIND.duckDown,
      atActiveMs: 4_000 - BEEP.duckPadMs,
      toValue: BEEP.duckLevel,
    });
    const [, ramp] = duckEventsFor([
      { atActiveMs: 4_000, kind: CUE_KIND.countdown },
    ]);
    expect(ramp).toEqual({
      kind: DUCK_EVENT_KIND.rampBack,
      // ventana del cue countdown = 1 blip; ramp tras la ventana + pad
      atActiveMs: 4_000 + BEEP.blipDurationMs + BEEP.duckPadMs,
      toValue: 1,
    });
  });

  it("la ventana del cue de transición cubre el doble blip completo (más largo que el countdown)", () => {
    const transitionWindowMs = 2 * BEEP.blipDurationMs + BEEP.transitionGapMs;
    const [, ramp] = duckEventsFor([
      { atActiveMs: 6_000, kind: CUE_KIND.transition },
    ]);
    expect(ramp).toEqual({
      kind: DUCK_EVENT_KIND.rampBack,
      atActiveMs: 6_000 + transitionWindowMs + BEEP.duckPadMs,
      toValue: 1,
    });
  });

  it("devuelve un par por cue, en el mismo orden, para el plan de una fase de 5 s", () => {
    const cues = planPhaseCues(phase(1_000, 5_000));
    const events = duckEventsFor(cues);

    expect(events).toHaveLength(cues.length * 2);
    // El primer duckDown antecede al primer cue; cada rampBack sigue a su ventana.
    expect(events[0].atActiveMs).toBeLessThan(cues[0].atActiveMs);
    for (let i = 0; i < cues.length; i++) {
      const duck = events[2 * i];
      const ramp = events[2 * i + 1];
      expect(duck.kind).toBe(DUCK_EVENT_KIND.duckDown);
      expect(ramp.kind).toBe(DUCK_EVENT_KIND.rampBack);
      expect(duck.atActiveMs).toBeLessThan(cues[i].atActiveMs);
      expect(ramp.atActiveMs).toBeGreaterThan(cues[i].atActiveMs);
    }
  });

  it("lista vacía → lista vacía (fase sin cues no emite automatización)", () => {
    expect(duckEventsFor([])).toEqual([]);
  });
});
