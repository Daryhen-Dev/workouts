// Capa de consulta PURA del historial (diseño §5): filtros que componen,
// estadísticas sobre el conjunto filtrado y formateo de presentación. Sin
// React, sin APIs de navegador; `now` SIEMPRE se inyecta (disciplina U4).

import type { HistoryEntry, HistoryFilter, HistoryStats } from "./types";
import { PERIOD } from "./types";

// Superficie única de la capa de consulta: los ids de filtro también salen de aquí
// (diseño §5 los agrupa con filterEntries/computeStats).
export { HISTORY_TYPE, PERIOD } from "./types";
export type {
  HistoryFilter,
  HistoryStats,
  HistoryTypeId,
  PeriodId,
} from "./types";

const DAY_MS = 86_400_000;

/** Longitud de cada período acotado (todo se trata aparte). */
const PERIOD_MS: Record<
  Exclude<HistoryFilter["period"], typeof PERIOD.todo>,
  number
> = {
  [PERIOD.dias7]: 7 * DAY_MS,
  [PERIOD.dias30]: 30 * DAY_MS,
};

/**
 * Filtra por período y tipo — los dos predicados COMPONEN (spec history):
 * una entrada se lista solo si satisface ambos. La frontera del período es
 * inclusiva (completedAt = now − 7 días sigue «dentro de los últimos 7 días»).
 */
export function filterEntries(
  entries: HistoryEntry[],
  filter: HistoryFilter,
  now: number,
): HistoryEntry[] {
  return entries.filter((e) => {
    if (filter.type !== "todas" && e.mode !== filter.type) return false;
    if (
      filter.period !== PERIOD.todo &&
      e.completedAt < now - PERIOD_MS[filter.period]
    ) {
      return false;
    }
    return true;
  });
}

/** Cuenta, total y media sobre el conjunto YA filtrado; vacío → ceros. */
export function computeStats(filtered: HistoryEntry[]): HistoryStats {
  const count = filtered.length;
  if (count === 0) return { count: 0, totalMs: 0, avgMs: 0 };
  const totalMs = filtered.reduce((sum, e) => sum + e.activeDurationMs, 0);
  return { count, totalMs, avgMs: Math.round(totalMs / count) };
}

/** 85_000 → "01:25" (mm:ss) · 3_723_000 → "1:02:03" (h:mm:ss). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  if (hours === 0) return `${mm}:${ss}`;
  return `${hours}:${mm}:${ss}`;
}

/** Plural en español por conteo: 1 ronda · 2 rondas, 1 tabata · 2 tabatas… */
function plural(n: number, singular: string, pluralWord: string): string {
  return `${n} ${n === 1 ? singular : pluralWord}`;
}

/**
 * Cadena de esfuerzo por modo (spec history): «2 rondas» (Clásico),
 * «4 rondas · 2 tabatas» (Tabata), «3 bloques» (Personalizado).
 * Sin conteos registrados → "" (la pantalla omite la línea).
 */
export function describeEffort(entry: HistoryEntry): string {
  if (entry.mode === "tabata") {
    const rondas =
      entry.rounds !== undefined ? plural(entry.rounds, "ronda", "rondas") : "";
    const tabatas =
      entry.tabatas !== undefined
        ? plural(entry.tabatas, "tabata", "tabatas")
        : "";
    return [rondas, tabatas].filter(Boolean).join(" · ");
  }
  if (entry.mode === "personalizado") {
    return entry.bloques !== undefined
      ? plural(entry.bloques, "bloque", "bloques")
      : "";
  }
  return entry.rounds !== undefined
    ? plural(entry.rounds, "ronda", "rondas")
    : "";
}

/** La entrada más reciente por completedAt (null si no hay ninguna). */
export function newestEntry(entries: HistoryEntry[]): HistoryEntry | null {
  let newest: HistoryEntry | null = null;
  for (const e of entries) {
    if (newest === null || e.completedAt > newest.completedAt) newest = e;
  }
  return newest;
}
