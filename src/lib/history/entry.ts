// Constructor de HistoryEntry desde los datos del motor (diseño §5). PURO salvo
// la generación del id (uuid). La semántica de conteos de esfuerzo por modo es
// la del spec history:
//   Clásico      → rounds = rondas CONFIGURADAS
//   Tabata       → rounds = trabajo-totales completados (rondasPorTabata × tabatas)
//                  + tabatas (conteo adicional, MAY)
//   Personalizado→ bloques = número de bloques
// El corte de entrada coincide estructuralmente con SessionCompletionData (seam
// U7): el cableado pasa los datos del motor TAL CUAL (tipado estructural, sin
// importar el store — lib queda libre de dependencias de stores).

import type { HistoryEntry } from "./types";
import type { SessionConfig } from "@/lib/timer/types";

export interface CompletionSource {
  config: SessionConfig;
  elapsedActiveMs: number;
  completedAt: number;
}

let idCounter = 0;

/** uuid con fallback a contador (jsdom no garantiza crypto.randomUUID). */
function randomId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  idCounter += 1;
  return `hist-${Date.now()}-${idCounter}`;
}

export function buildHistoryEntry(source: CompletionSource): HistoryEntry {
  const { config, elapsedActiveMs, completedAt } = source;
  const base = {
    id: randomId(),
    mode: config.mode,
    completedAt,
    activeDurationMs: elapsedActiveMs,
  };
  switch (config.mode) {
    case "clasico":
      return { ...base, rounds: config.values.rondas };
    case "tabata":
      return {
        ...base,
        rounds: config.values.rondasPorTabata * config.values.tabatas,
        tabatas: config.values.tabatas,
      };
    case "personalizado":
      return { ...base, bloques: config.blocks.length };
  }
}
