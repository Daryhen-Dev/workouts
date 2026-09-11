// Ciclo de vida del AudioContext — U10, diseño §6.1 (add-pwa-workout-timer).
//
// Contrato:
// - `getAudioContext()`: singleton CREADO PEREZOSAMENTE en la primera ruta de
//   gesto de usuario (arrancar/reanudar la sesión — el controlador lo llama
//   desde sus efectos). `null` cuando el entorno no tiene Web Audio: TODO
//   consumidor debe no-operar sobre null (spec audio: «No Web Audio, no
//   failure» — las sesiones siguen funcionando sin beeps).
// - Un contexto por vida de la app; jamás se cierra (crear/cerrar contextos
//   por sesión fragmenta el grafo de audio y desperdicia el límite de
//   contextos por pestaña).
// - `resumeIfSuspended()`: intento de recuperación tras interrupciones (iOS),
//   llamado al arrancar, reanudar y volver de la visibilidad. Best-effort:
//   nunca lanza.
//
// NADA se evalúa en el nivel superior del módulo (SSR seguro): el global se
// toca solo dentro de las funciones.

let singleton: AudioContext | null = null;

/**
 * Contexto de audio de la app (lazy). Primera llamada: lo crea. Siguientes:
 * la misma instancia. Sin Web Audio en el entorno → null (no-op universal).
 */
export function getAudioContext(): AudioContext | null {
 if (typeof AudioContext === "undefined") return null;
 if (singleton === null) {
  singleton = new AudioContext();
 }
 return singleton;
}

/**
 * Reanuda el contexto si quedó suspendido (interrupción iOS / autoplay).
 * Best-effort: errores de resume se tragan — la sesión NO depende del audio.
 */
export async function resumeIfSuspended(): Promise<void> {
 const ctx = getAudioContext();
 if (ctx === null || ctx.state !== "suspended") return;
 try {
  await ctx.resume();
 } catch {
  // best-effort (§6.1): la recuperación fallida jamás rompe la sesión
 }
}
