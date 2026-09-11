// Formateo de duraciones y total de plan — PURO (sin React, sin navegador).
// El formato m:ss / h:mm:ss es el que el spec history exige para resúmenes e
// historial (U8 reutiliza este helper).

import type { PhasePlan } from "./types";

/** 85_000 → "1:25"; 3_723_000 → "1:02:03"; 0 → "0:00". */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours === 0) {
    return `${minutes}:${ss}`;
  }
  return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
}

/** Suma las duraciones del plan compilado (tiempo activo total, sin pausas). */
export function totalPlanMs(plan: PhasePlan): number {
  let total = 0;
  for (const phase of plan) {
    total += phase.durationMs;
  }
  return total;
}
