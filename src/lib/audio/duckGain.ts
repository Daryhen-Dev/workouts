// duckGain (U11 — diseño §6.3) — GainNode compartido de ducking + automatización.
//
// Capa impura DELGADA sobre el AudioContext singleton (lib/audio/context): la
// derivación PURA vive en cues.ts (duckEventsFor). Convención de ancla idéntica
// a beepSynth: ctx.currentTime ↔ elapsedActiveMs avanzan uno a uno mientras la
// sesión corre, por lo que un evento activo X se programa en
// currentTime + (X − elapsed) / 1000.
//
// Nota de solape §6.3 (fases muy cortas): cada programación cancela lo
// pendiente ANTES de derivar; los eventos ya pasados (atActiveMs < elapsed) se
// descartan — incluido el rampBack de una transición saliente que aún no sonó —
// y los de la fase entrante se aplican en orden ascendente sobre el reloj del
// contexto. Cancelar no corta el blip de transición final: solo pausa y
// descarto cancelan (ver useCueScheduler).

import type { ScheduledPhase } from "@/lib/timer/types";
import { BEEP, DUCK_EVENT_KIND, duckEventsFor, planPhaseCues } from "./cues";
import { getAudioContext } from "./context";

let sharedDuckGain: GainNode | null = null;

/** El GainNode de duck compartido (conectado al destino), o null sin Web Audio. */
export function getDuckGain(): GainNode | null {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (!sharedDuckGain) {
    sharedDuckGain = ctx.createGain();
    sharedDuckGain.connect(ctx.destination);
    sharedDuckGain.gain.value = 1;
  }
  return sharedDuckGain;
}

/** Reprograma la automatización de duck para `phase` desde `elapsedActiveMs`. */
export function scheduleDuckAutomation(
  phase: ScheduledPhase,
  elapsedActiveMs: number,
): void {
  const gain = getDuckGain();
  const ctx = getAudioContext();
  if (!gain || !ctx) return;

  gain.gain.cancelScheduledValues(0);
  const nowS = ctx.currentTime;
  // Se descarta el PAR completo de un cue cuyo duckDown ya pasó (su rampBack
  // huérfano no debe sonar tras la reprogramación — nota de solape §6.3).
  const events = duckEventsFor(
    planPhaseCues(phase).filter(
      (cue) => cue.atActiveMs - BEEP.duckPadMs >= elapsedActiveMs,
    ),
  ).sort((a, b) => a.atActiveMs - b.atActiveMs);

  // Línea base: música a tope ahora; los eventos enmarcan cada cue.
  gain.gain.setValueAtTime(1, nowS);
  for (const event of events) {
    const atCtxTime = nowS + (event.atActiveMs - elapsedActiveMs) / 1000;
    if (event.kind === DUCK_EVENT_KIND.duckDown) {
      gain.gain.setValueAtTime(event.toValue, atCtxTime);
    } else {
      gain.gain.linearRampToValueAtTime(event.toValue, atCtxTime);
    }
  }
}

/** Cancela lo pendiente y restaura la ganancia a 1 (música a tope). */
export function cancelDuckAutomation(): void {
  const gain = getDuckGain();
  const ctx = getAudioContext();
  if (!gain || !ctx) return;
  gain.gain.cancelScheduledValues(0);
  gain.gain.setValueAtTime(1, ctx.currentTime);
}

/** Solo para tests: olvida el singleton (el contexto stub cambia por test). */
export function resetDuckGainForTests(): void {
  sharedDuckGain = null;
}
