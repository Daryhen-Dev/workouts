// Modelo de datos del historial (diseño §5, decisión #6) — UNA forma plana
// sirve para campos del registro, filtros compuestos y estadísticas. Este
// módulo es solo tipos/constantes: la capa de consulta pura vive en query.ts.

import type { ModeId } from "@/lib/timer/types";

export interface HistoryEntry {
  /** uuid (generado al construir la entrada desde los datos del motor). */
  id: string;
  /** clasico | tabata | personalizado. */
  mode: ModeId;
  /** epoch ms del completado natural. */
  completedAt: number;
  /** Tiempo activo MEDIDO (elapsedActiveMs de la vista completada; excluye pausas). */
  activeDurationMs: number;
  /** Clásico: rondas configuradas · Tabata: trabajo-totales completados. */
  rounds?: number;
  /** Solo Tabata (conteo adicional, MAY según spec history). */
  tabatas?: number;
  /** Solo Personalizado: número de bloques. */
  bloques?: number;
}

/** Períodos del filtro (spec history: al menos dos acotados + todo). */
export const PERIOD = {
  dias7: "dias7",
  dias30: "dias30",
  todo: "todo",
} as const;
export type PeriodId = (typeof PERIOD)[keyof typeof PERIOD];

/** Tipos del filtro: «todas» + cada modo. */
export const HISTORY_TYPE = {
  todas: "todas",
  clasico: "clasico",
  tabata: "tabata",
  personalizado: "personalizado",
} as const;
export type HistoryTypeId = (typeof HISTORY_TYPE)[keyof typeof HISTORY_TYPE];

export interface HistoryFilter {
  period: PeriodId;
  type: HistoryTypeId;
}

export interface HistoryStats {
  count: number;
  totalMs: number;
  avgMs: number;
}
