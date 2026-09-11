// Capa de consulta PURA del historial (diseño §5) — spec history: filtros de
// período y tipo que componen, estadísticas sobre el conjunto FILTRADO y
// helpers de formato (mm:ss / h:mm:ss, etiquetas de esfuerzo en español).
// `now` se inyecta: nada de Date.now dentro (misma disciplina que el motor U4).
import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "./types";
import {
  HISTORY_TYPE,
  PERIOD,
  computeStats,
  describeEffort,
  filterEntries,
  formatDuration,
  newestEntry,
} from "./query";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function entry(
  overrides: Partial<HistoryEntry> & Pick<HistoryEntry, "mode">,
): HistoryEntry {
  return {
    id: `id-${Math.random().toString(36).slice(2)}`,
    completedAt: NOW - DAY,
    activeDurationMs: 100_000,
    ...overrides,
  };
}

describe("filterEntries — filtro de período (spec history: Period Filter)", () => {
  const hace2Dias = entry({
    id: "e2d",
    mode: "clasico",
    completedAt: NOW - 2 * DAY,
  });
  const hace20Dias = entry({
    id: "e20d",
    mode: "clasico",
    completedAt: NOW - 20 * DAY,
  });

  it("últimos 7 días: solo la entrada de hace 2 días", () => {
    const out = filterEntries(
      [hace2Dias, hace20Dias],
      { period: PERIOD.dias7, type: HISTORY_TYPE.todas },
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(["e2d"]);
  });

  it("últimos 30 días: ambas entradas (2 y 20 días)", () => {
    const out = filterEntries(
      [hace2Dias, hace20Dias],
      { period: PERIOD.dias30, type: HISTORY_TYPE.todas },
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(["e2d", "e20d"]);
  });

  it("toda la historia: muestra todo aunque hubiera un filtro de período activo", () => {
    const out = filterEntries(
      [hace2Dias, hace20Dias],
      { period: PERIOD.todo, type: HISTORY_TYPE.todas },
      NOW,
    );
    expect(out).toHaveLength(2);
  });

  it("la frontera exacta del período queda incluida (completedAt = now − 7 días)", () => {
    const justo = entry({
      id: "justo",
      mode: "clasico",
      completedAt: NOW - 7 * DAY,
    });
    const unMsMenos = entry({
      id: "fuera",
      mode: "clasico",
      completedAt: NOW - 7 * DAY - 1,
    });
    const out = filterEntries(
      [justo, unMsMenos],
      { period: PERIOD.dias7, type: HISTORY_TYPE.todas },
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(["justo"]);
  });
});

describe("filterEntries — filtro de tipo y composición (spec history: Type Filter)", () => {
  const c1 = entry({ id: "c1", mode: "clasico" });
  const c2 = entry({ id: "c2", mode: "clasico" });
  const t1 = entry({ id: "t1", mode: "tabata" });

  it("tipo Tabata: solo la entrada Tabata", () => {
    const out = filterEntries(
      [c1, c2, t1],
      { period: PERIOD.todo, type: HISTORY_TYPE.tabata },
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(["t1"]);
  });

  it("todas: no filtra por modo", () => {
    const out = filterEntries(
      [c1, c2, t1],
      { period: PERIOD.todo, type: HISTORY_TYPE.todas },
      NOW,
    );
    expect(out).toHaveLength(3);
  });

  it("componen: Clásico + últimos 7 días excluye el Clásico de hace un mes y la Tabata reciente", () => {
    const mes = entry({
      id: "c-viejo",
      mode: "clasico",
      completedAt: NOW - 31 * DAY,
    });
    const out = filterEntries(
      [c1, c2, t1, mes],
      { period: PERIOD.dias7, type: HISTORY_TYPE.clasico },
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(["c1", "c2"]);
  });

  it("componen en el otro sentido: Tabata + últimos 30 días", () => {
    const out = filterEntries(
      [c1, t1],
      { period: PERIOD.dias30, type: HISTORY_TYPE.tabata },
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(["t1"]);
  });
});

describe("computeStats — estadísticas sobre el conjunto filtrado (spec history: Summary Statistics)", () => {
  it("devuelve cuenta, total y media (100 s + 200 s)", () => {
    const stats = computeStats([
      entry({ mode: "clasico", activeDurationMs: 100_000 }),
      entry({ mode: "tabata", activeDurationMs: 200_000 }),
    ]);
    expect(stats).toEqual({ count: 2, totalMs: 300_000, avgMs: 150_000 });
  });

  it("un único conjunto de 100 s → 1 sesión, 100 s total, 100 s media", () => {
    const stats = computeStats([
      entry({ mode: "clasico", activeDurationMs: 100_000 }),
    ]);
    expect(stats).toEqual({ count: 1, totalMs: 100_000, avgMs: 100_000 });
  });

  it("conjunto vacío → ceros, SIN división por cero", () => {
    expect(computeStats([])).toEqual({ count: 0, totalMs: 0, avgMs: 0 });
  });
});

describe("formatDuration — mm:ss y h:mm:ss (diseño §5)", () => {
  it("85 s → 01:25 (minutos con dos dígitos)", () => {
    expect(formatDuration(85_000)).toBe("01:25");
  });

  it("0 s → 00:00", () => {
    expect(formatDuration(0)).toBe("00:00");
  });

  it("más de una hora → h:mm:ss", () => {
    expect(formatDuration(3_723_000)).toBe("1:02:03");
  });
});

describe("describeEffort — conteos de esfuerzo por modo (cadenas del spec)", () => {
  it("Clásico → «2 rondas»; singular → «1 ronda»", () => {
    expect(describeEffort(entry({ mode: "clasico", rounds: 2 }))).toBe(
      "2 rondas",
    );
    expect(describeEffort(entry({ mode: "clasico", rounds: 1 }))).toBe(
      "1 ronda",
    );
  });

  it("Tabata → «4 rondas · 2 tabatas» (trabajo-totales + tabatas)", () => {
    expect(
      describeEffort(entry({ mode: "tabata", rounds: 4, tabatas: 2 })),
    ).toBe("4 rondas · 2 tabatas");
  });

  it("Personalizado → «3 bloques»; singular → «1 bloque»", () => {
    expect(describeEffort(entry({ mode: "personalizado", bloques: 3 }))).toBe(
      "3 bloques",
    );
    expect(describeEffort(entry({ mode: "personalizado", bloques: 1 }))).toBe(
      "1 bloque",
    );
  });

  it("sin conteos conocidos → cadena vacía (pantalla la omite)", () => {
    expect(describeEffort(entry({ mode: "clasico" }))).toBe("");
  });
});

describe("newestEntry — la más reciente por completedAt", () => {
  it("devuelve la entrada con mayor completedAt (no asume orden de inserción)", () => {
    const vieja = entry({
      id: "v",
      mode: "clasico",
      completedAt: NOW - 5 * DAY,
    });
    const nueva = entry({
      id: "n",
      mode: "clasico",
      completedAt: NOW - 1 * DAY,
    });
    expect(newestEntry([vieja, nueva])?.id).toBe("n");
  });

  it("vacío → null", () => {
    expect(newestEntry([])).toBeNull();
  });
});
