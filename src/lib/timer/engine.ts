// Motor de sesiones — diseño §3.3 (add-pwa-workout-timer). NÚCLEO DEL HARD GATE.
//
// Funciones PURAS con el reloj INYECTADO: el tiempo SIEMPRE llega como el
// argumento `now`; este módulo jamás lee un reloj internamente. La vista es una
// función pura de (state, now) — sin acumulación de ticks en ninguna parte —
// por lo que background/tab-switch/sleep se reducen estructuralmente a
// "llamar computeView con un now posterior": verdad de reloj de pared por
// construcción, no por caso especial.
//
// Decisiones de contrato documentadas (elegidas y fijadas aquí):
// - `startSession` compila el plan INTERNAMENTE vía compilePlan(config): el
//   estado siempre nace coherente (plan + totalActiveMs derivados de la misma
//   config que retiene para el resumen/conteos de esfuerzo).
// - pauseSession sobre paused/completed → NO-OP que devuelve la MISMA
//   referencia (identidad estructural; nunca lanza) — los observadores del
//   controlador (§3.5) quedan a salvo de pulsaciones duplicadas.
// - resumeSession sobre running/completed → NO-OP con la misma referencia.
// - computeView con elapsed ≥ totalActiveMs — incluso con status "paused"
//   (una pausa que llega tarde) — → vista completada: la verdad de reloj de
//   pared gana; una sesión ya terminada no se puede congelar.
// - La vista completada reporta elapsedActiveMs = totalActiveMs EXACTAMENTE:
//   la duración de una sesión completa ES el total configurado (spec
//   "Session completes while suspended" exige los totales configurados; el
//   sobrepaso de reloj es latencia de detección, no actividad).

import { compilePlan } from "./plan";
import {
  SESSION_STATUS,
  type PhasePlan,
  type ScheduledPhase,
  type SessionConfig,
  type SessionState,
  type SessionView,
} from "./types";

/** Inicia una sesión: compila el plan y ancla runningSince en now. */
export function startSession(config: SessionConfig, now: number): SessionState {
  const plan = compilePlan(config);
  let totalActiveMs = 0;
  for (const phase of plan) totalActiveMs += phase.durationMs;
  return {
    status: SESSION_STATUS.running,
    plan,
    totalActiveMs,
    runningSince: now,
    accumulatedActiveMs: 0,
    config,
  };
}

/** running → paused: pliega now − runningSince en accumulatedActiveMs. */
export function pauseSession(state: SessionState, now: number): SessionState {
  if (state.status !== SESSION_STATUS.running || state.runningSince === null) {
    return state; // no-op idempotente: ya pausada o completada
  }
  return {
    ...state,
    status: SESSION_STATUS.paused,
    runningSince: null,
    accumulatedActiveMs: state.accumulatedActiveMs + (now - state.runningSince),
  };
}

/** paused → running: re-ancla runningSince en now (el restante se conserva). */
export function resumeSession(state: SessionState, now: number): SessionState {
  if (state.status !== SESSION_STATUS.paused) {
    return state; // no-op idempotente: corriendo o completada
  }
  return { ...state, status: SESSION_STATUS.running, runningSince: now };
}

/** Vista completada: phase null, restante 0, elapsed = total configurado. */
function completedView(state: SessionState): SessionView {
  return {
    status: SESSION_STATUS.completed,
    phase: null,
    nextPhase: null,
    remainingMs: 0,
    elapsedActiveMs: state.totalActiveMs,
  };
}

/**
 * Búsqueda de frontera: plan[i] con startOffsetMs ≤ elapsedActiveMs <
 * startOffsetMs + durationMs (el llamador garantiza elapsed < totalActiveMs).
 * Los offsets del plan son acumulativos y crecientes ⇒ el último candidato
 * cuyo inicio ≤ elapsed es la fase en curso.
 */
function findPhaseAt(plan: PhasePlan, elapsedActiveMs: number): ScheduledPhase {
  let found = plan[0];
  for (const phase of plan) {
    if (elapsedActiveMs >= phase.startOffsetMs) found = phase;
    else break;
  }
  return found;
}

/**
 * La vista completa: función pura de (state, now) — toda la historia de
 * corrección del HARD GATE vive aquí.
 */
export function computeView(state: SessionState, now: number): SessionView {
  if (state.status === SESSION_STATUS.completed) {
    return completedView(state);
  }
  // Aritmética del ancla §3.3: pausada (runningSince null) ⇒ solo lo
  // acumulado — el tiempo de suspensión JAMÁS entra en la suma.
  const elapsedActiveMs =
    state.runningSince !== null
      ? state.accumulatedActiveMs + (now - state.runningSince)
      : state.accumulatedActiveMs;
  if (elapsedActiveMs >= state.totalActiveMs) {
    return completedView(state);
  }
  const phase = findPhaseAt(state.plan, elapsedActiveMs);
  return {
    status: state.status,
    phase,
    nextPhase: state.plan[phase.index + 1] ?? null,
    remainingMs: phase.startOffsetMs + phase.durationMs - elapsedActiveMs,
    elapsedActiveMs,
  };
}

/**
 * Redondeo de pantalla — diseño §3.4: ceil(remaining/1000). Una fase muestra
 * su valor completo al entrar (restante 30 s → "30") y 0 exactamente en su
 * frontera. Los beeps de cuenta atrás (U10) comparten estas fronteras enteras
 * (restante 3, 2, 1).
 */
export function displaySeconds(remainingMs: number): number {
  return Math.ceil(remainingMs / 1000);
}
