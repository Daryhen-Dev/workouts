// Planificador de cues PURO — U10, diseño §6.2 (add-pwa-workout-timer).
//
// Dos capas de audio (diseño §6.2): este módulo es la capa PURA que decide
// QUÉ suena y CUÁNDO en coordenadas de tiempo ACTIVO del plan U3
// (startOffsetMs acumulativo, excluye pausas). La capa impura delgada
// (beepSynth.ts) convierte esos ms activos al reloj del AudioContext y
// programa los osciladores. Este módulo no conoce Web Audio: solo
// aritmética sobre ScheduledPhase — testeable sin ningún stub.
//
// Convención (spec audio, «In-Memory Countdown Beeps»): durante los últimos
// 3 segundos de TODA fase suena un beep por segundo restante; en fases de
// menos de 3 s, un beep por segundo de la fase COMPLETA; la transición de
// fase suena con un cue distinguible (otra frecuencia + doble blip).
//
// Este archivo está bajo el guardián purity.test.ts: sin React, sin APIs ni
// identificadores de navegador (ni siquiera en comentarios).

import type { ScheduledPhase } from "@/lib/timer/types";

/** Kind de cue: cuenta atrás (un blip) o transición de fase (doble blip, otra frecuencia). */
export const CUE_KIND = {
 countdown: "countdown",
 transition: "transition",
} as const;
export type CueKind = (typeof CUE_KIND)[keyof typeof CUE_KIND];

export interface CueEvent {
 /** Momento del cue en TIEMPO ACTIVO absoluto de la sesión (ms; coordenadas del plan). */
 atActiveMs: number;
 kind: CueKind;
}

/**
 * Parámetros acústicos compartidos por las dos capas: el planner deriva las
 * ventanas de ducking y beepSynth programa los envolventes — una sola fuente
 * de verdad para que el duck (U11) enmarque exactamente lo que suena.
 */
export const BEEP = {
 /** Frecuencia del beep de cuenta atrás (blip corto y agudo). */
 countdownFrequencyHz: 880,
 /** Frecuencia del cue de transición — DISTINTA para ser distinguible (spec). */
 transitionFrequencyHz: 1_245,
 /** Duración de cada blip (countdown: 1 blip; transición: 2 blips con hueco). */
 blipDurationMs: 80,
 /** Hueco entre los dos blips del cue de transición. */
 transitionGapMs: 90,
 /** Nivel al que baja la música durante un cue (diseño §6.3: ~25 %). */
 duckLevel: 0.25,
 /** Margen de ducking a cada lado de la ventana del cue (~150 ms, §6.3). */
 duckPadMs: 150,
} as const;

/** Ventana sonora de un cue: desde el primer blip hasta el final del último (ms activos). */
export function cueWindowMs(kind: CueKind): number {
 return kind === CUE_KIND.transition
  ? 2 * BEEP.blipDurationMs + BEEP.transitionGapMs
  : BEEP.blipDurationMs;
}

/**
 * Cues de una fase [S, S+D):
 * - countdown en S+D−k·1000 para k = 1..min(3, ⌈D/1000⌉) — convención de
 *   últimos-3-segundos; una fase de 2 s obtiene beeps a los 2 y 1 s restantes;
 * - UN transition en la frontera S+D.
 * Orden ascendente por atActiveMs. Guarda defensiva: jamás un cue antes de S.
 */
export function planPhaseCues(phase: ScheduledPhase): CueEvent[] {
 const start = phase.startOffsetMs;
 const end = start + phase.durationMs;
 const cues: CueEvent[] = [];

 const seconds = Math.ceil(phase.durationMs / 1000);
 const countdowns = Math.min(3, seconds);
 for (let k = countdowns; k >= 1; k--) {
  const at = end - k * 1000;
  if (at >= start) {
   cues.push({ atActiveMs: at, kind: CUE_KIND.countdown });
  }
 }
 cues.push({ atActiveMs: end, kind: CUE_KIND.transition });
 return cues;
}

/** Kind de evento de ducking: bajar antes del cue, restaurar tras su ventana. */
export const DUCK_EVENT_KIND = {
 duckDown: "duckDown",
 rampBack: "rampBack",
} as const;
export type DuckEventKind =
 (typeof DUCK_EVENT_KIND)[keyof typeof DUCK_EVENT_KIND];

export interface DuckEvent {
 kind: DuckEventKind;
 /** Momento del evento en TIEMPO ACTIVO absoluto de la sesión (ms). */
 atActiveMs: number;
 /** Valor de ganancia objetivo (duckDown → duckLevel; rampBack → 1). */
 toValue: number;
}

/**
 * Derivación PURA de eventos de ducking (diseño §6.3): cada cue queda
 * enmarcado por un duckDown (pad antes del primer blip) y un rampBack (pad
 * tras el final de su ventana sonora). U11 los traduce a automatización del
 * GainNode. Puede haber solape entre el rampBack de un cue y el duckDown del
 * siguiente en fases muy cortas: la resolución de orden la hace la capa de
 * automatización al programar sobre el reloj del contexto (eventos ya ordenados).
 */
export function duckEventsFor(cues: readonly CueEvent[]): DuckEvent[] {
 const events: DuckEvent[] = [];
 for (const cue of cues) {
  const windowMs = cueWindowMs(cue.kind);
  events.push({
   kind: DUCK_EVENT_KIND.duckDown,
   atActiveMs: cue.atActiveMs - BEEP.duckPadMs,
   toValue: BEEP.duckLevel,
  });
  events.push({
   kind: DUCK_EVENT_KIND.rampBack,
   atActiveMs: cue.atActiveMs + windowMs + BEEP.duckPadMs,
   toValue: 1,
  });
 }
 return events;
}
