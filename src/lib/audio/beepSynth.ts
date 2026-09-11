// beepSynth — capa impura DELGADA (U10 — diseño §6.2).
//
// Convierte los ms ACTIVOS del planner puro (cues.ts) al RELOJ DEL CONTEXTO
// (`AudioContext.currentTime`) vía el ancla de la sesión y programa
// oscilador/ganancia en instantes exactos: el reloj de Web Audio es inmune
// al throttling del hilo principal mientras la página vive (§6.2).
//
// Ancla: en cada llamada se captura el par (elapsedActiveMs ↔
// ctx.currentTime) del invocador — un par consistente por segmento
// arrancado/reanudado/recomputado basta; el tiempo activo y el del contexto
// avanzan 1:1 mientras la sesión corre. cueCtx = currentTime +
// (cue.atActiveMs − elapsedActiveMs)/1000. Cues en el pasado se descartan.
//
// API de cancelación + re-programación (§6.3): `schedulePhaseCues` SIEMPRE
// cancela lo pendiente antes de derivar de nuevo; el controlador llama
// `cancelScheduledCues` en la pausa (no se deben beeps mientras pausada).
//
// Sin Web Audio: `getAudioContext()` null ⇒ todo no-op, sin lanzar (spec
// audio: «No Web Audio, no failure»). Sin assets: osciladores solamente.

import type { ScheduledPhase } from "@/lib/timer/types";
import { getAudioContext } from "./context";
import { BEEP, CUE_KIND, planPhaseCues } from "./cues";

/** Pico del blip y suelo del envolvente (exponentialRamp exige valores > 0). */
const PEAK_GAIN = 0.3;
const MIN_GAIN = 0.0001;
/** Ataque de 5 ms — click-free. */
const ATTACK_S = 0.005;
/** Colchón tras el blip antes del stop programado del oscilador. */
const STOP_TAIL_S = 0.01;

interface PendingBlip {
  osc: OscillatorNode;
  gain: GainNode;
}

/** Nodos pendientes de esta sesión de audio; los blip se auto-limpian al terminar. */
const pending: PendingBlip[] = [];

/** Programa UN blip (osc → gain → destino) con envolvente en tiempo exacto del contexto. */
function scheduleBlip(ctx: AudioContext, atCtxTime: number, frequencyHz: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = frequencyHz;

  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const blipSeconds = BEEP.blipDurationMs / 1000;
  gain.gain.setValueAtTime(MIN_GAIN, atCtxTime);
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, atCtxTime + ATTACK_S);
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, atCtxTime + blipSeconds);

  osc.start(atCtxTime);
  osc.stop(atCtxTime + blipSeconds + STOP_TAIL_S);

  const entry: PendingBlip = { osc, gain };
  osc.onended = () => {
    const i = pending.indexOf(entry);
    if (i !== -1) pending.splice(i, 1);
  };
  pending.push(entry);
}

/**
 * Programa los cues de la fase actual. `elapsedActiveMs` es el tiempo activo
 * de la sesión EN EL MOMENTO de la llamada (ancla). Cancela lo pendiente y
 * descarta cues pasados — re-derivar de la verdad recomputada (§6.3).
 */
export function schedulePhaseCues(
  phase: ScheduledPhase,
  elapsedActiveMs: number,
): void {
  const ctx = getAudioContext();
  if (ctx === null) return; // sin Web Audio: no-op (la sesión no depende del audio)

  cancelScheduledCues();
  const baseCtxTime = ctx.currentTime;

  for (const cue of planPhaseCues(phase)) {
    const cueCtxTime = baseCtxTime + (cue.atActiveMs - elapsedActiveMs) / 1000;
    if (cueCtxTime <= baseCtxTime) continue; // ya pasó: no se debe

    if (cue.kind === CUE_KIND.transition) {
      // Transición DISTINTA (spec): otra frecuencia + doble blip.
      const secondBlipOffset = (BEEP.blipDurationMs + BEEP.transitionGapMs) / 1000;
      scheduleBlip(ctx, cueCtxTime, BEEP.transitionFrequencyHz);
      scheduleBlip(ctx, cueCtxTime + secondBlipOffset, BEEP.transitionFrequencyHz);
    } else {
      scheduleBlip(ctx, cueCtxTime, BEEP.countdownFrequencyHz);
    }
  }
}

/** Cancela los beeps pendientes (pausa/stop): best-effort, jamás lanza. */
export function cancelScheduledCues(): void {
  for (const { osc, gain } of pending.splice(0)) {
    osc.onended = null;
    try {
      osc.stop();
    } catch {
      // best-effort: un nodo ya terminado no debe romper la cancelación
    }
    gain.disconnect();
  }
}
