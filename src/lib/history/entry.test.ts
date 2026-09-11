// Constructor PURO de HistoryEntry desde los datos del motor (seam U7 →
// spec history: conteos de esfuerzo por modo). La entrada nace con id propio;
// activo/completado se copian TAL CUAL del motor (85 s pausados excluidos).
import { describe, expect, it } from "vitest";
import type { SessionConfig } from "@/lib/timer/types";
import { buildHistoryEntry } from "./entry";

const CLASICO: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

const TABATA: SessionConfig = {
  mode: "tabata",
  values: {
    preparacionS: 10,
    trabajoS: 20,
    descansoS: 10,
    rondas: 2, // vestigial (contrato U3): el conteo usa rondasPorTabata
    rondasPorTabata: 2,
    tabatas: 2,
    descansoLargoS: 60,
  },
};

const PERSONALIZADO: SessionConfig = {
  mode: "personalizado",
  descansoGlobalS: 20,
  blocks: [
    {
      id: "b1",
      tipo: "clasico",
      values: { preparacionS: 5, trabajoS: 30, descansoS: 15, rondas: 2 },
    },
    {
      id: "b2",
      tipo: "tabata",
      values: {
        preparacionS: 10,
        trabajoS: 20,
        descansoS: 10,
        rondas: 2,
        rondasPorTabata: 2,
        tabatas: 2,
        descansoLargoS: 60,
      },
    },
  ],
};

const SOURCE = { elapsedActiveMs: 85_000, completedAt: 1_700_000_000_000 };

describe("buildHistoryEntry — conteos de esfuerzo por modo (spec history)", () => {
  it("Clásico → rondas configuradas, sin tabatas ni bloques", () => {
    const entry = buildHistoryEntry({ config: CLASICO, ...SOURCE });
    expect(entry.mode).toBe("clasico");
    expect(entry.rounds).toBe(2);
    expect(entry.tabatas).toBeUndefined();
    expect(entry.bloques).toBeUndefined();
  });

  it("Tabata → rounds = trabajo-totales (rondasPorTabata × tabatas) + tabatas", () => {
    const entry = buildHistoryEntry({ config: TABATA, ...SOURCE });
    expect(entry.mode).toBe("tabata");
    expect(entry.rounds).toBe(4); // 2 rondas por tabata × 2 tabatas = 4 trabajo-totales
    expect(entry.tabatas).toBe(2);
  });

  it("Personalizado → bloques = número de bloques de la secuencia", () => {
    const entry = buildHistoryEntry({ config: PERSONALIZADO, ...SOURCE });
    expect(entry.mode).toBe("personalizado");
    expect(entry.bloques).toBe(2);
    expect(entry.rounds).toBeUndefined();
  });

  it("copia el activo medido y la fecha de completado tal cual del motor", () => {
    const entry = buildHistoryEntry({ config: CLASICO, ...SOURCE });
    expect(entry.activeDurationMs).toBe(85_000);
    expect(entry.completedAt).toBe(1_700_000_000_000);
  });

  it("cada entrada nace con un id único no vacío", () => {
    const a = buildHistoryEntry({ config: CLASICO, ...SOURCE });
    const b = buildHistoryEntry({ config: CLASICO, ...SOURCE });
    expect(a.id).toMatch(/.+/);
    expect(b.id).toMatch(/.+/);
    expect(a.id).not.toBe(b.id);
  });
});
