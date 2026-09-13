// Adaptador Vibration API — U13 B1 (diseño §8.4, spec pwa «Vibration on
// Phase Transitions»). La vibración es una mejora progresiva: en cada
// transición de fase vibra JUNTO al beep de transición (doble blip) y al
// cambio visible de fase — el emparejamiento es estructural (mismo tick del
// orquestador); iOS (sin Vibration API) es no-op silencioso: sin vibración,
// sin error, y el beep + el cambio visual siguen marcando la transición.
//
// Contrato:
// - SSR-seguro: nada se evalúa en el nivel superior del módulo; los globals
//   se tocan solo dentro de las funciones.
// - Sin navigator.vibrate → no-op silencioso (jamás gatea la sesión).
// - Fallos SÍNCRONOS de la API (p.ej. Illegal invocation, NotAllowedError)
//   tragados — la sesión jamás se rompe por una vibración.
// - Patrón FIJO y corto, espejo del doble blip del cue de transición.

/** Doble pulso corto (vibra-pausa-vibra, ms) — espejo del doble blip del cue. */
export const TRANSITION_PATTERN: number[] = [80, 60, 80];

/** Forma estructural mínima de navigator.vibrate (independiente de lib.dom). */
type VibrateApiLike = (pattern: number | number[]) => boolean;

function getVibrateApi(): VibrateApiLike | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as { vibrate?: VibrateApiLike }).vibrate;
  return typeof api === "function" ? api : null;
}

/**
 * Vibración de transición de fase. No-op silencioso sin Vibration API;
 * los fallos síncronos se tragan. El llamador (useVibrationDriver) decide
 * CUÁNDO — una sola vez por transición real del índice de fase.
 */
export function vibrateOnTransition(): void {
  const vibrate = getVibrateApi();
  if (vibrate === null) return; // iOS / sin soporte → silencio (spec pwa)
  try {
    vibrate.call(navigator, TRANSITION_PATTERN);
  } catch {
    // La vibración jamás rompe la sesión (spec pwa: degradation never breaks).
  }
}
