// Relojes inyectables — diseño §3.1/§3.3 (add-pwa-workout-timer).
//
// `systemClock` es Date.now por decisión de diseño §3.3: el reloj de pared
// AVANZA durante la suspensión del dispositivo (el throttling de timers nunca
// lo afecta), que es la base del HARD GATE "sleep/resume consumed real time".
// performance.now se descarta como default precisamente porque su comportamiento
// ante el sleep del SO no es uniforme entre motores.
//
// `createFakeClock` permite expresar las scenarios del spec literalmente en
// pruebas: la "suspensión" es clock.advance(ms) + recomputar la vista.
//
// Módulo PURO de framework: sin React; Date.now es ECMAScript estándar, no una
// API de navegador (el guardián purity.test.ts lo verifica).

import type { Clock } from "./types";

// Re-export del contrato de reloj: la fuente única del tipo vive en types.ts
// (§3.1); clock.ts es el módulo que la superficie pública de relojes expone.
export type { Clock };

/** Reloj de pared real (ms). Avanza a través del sleep del dispositivo. */
export const systemClock: Clock = () => Date.now();

/** Reloj manual para pruebas. */
export interface FakeClock {
  now(): number;
  advance(ms: number): void;
  set(ms: number): void;
}

/** Crea un reloj manual iniciado en startMs (default 0). */
export function createFakeClock(startMs = 0): FakeClock {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    set: (ms: number) => {
      current = ms;
    },
  };
}
