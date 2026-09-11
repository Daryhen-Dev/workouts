import { describe, expect, it } from "vitest";
import { compilePlan } from "./plan";
import {
  MODE,
  PHASE_KIND,
  type ClasicoConfig,
  type PersonalizadoConfig,
  type PhasePlan,
  type TabataConfig,
} from "./types";

// Espejo de [kind, durationMs, startOffsetMs, label] por fase — las scenarios
// del spec timer-modes son aserciones directas sobre exactamente esto.
type PhaseRow = readonly [string, number, number, string];

function rows(plan: PhasePlan): PhaseRow[] {
  return plan.map((phase) => [
    phase.kind,
    phase.durationMs,
    phase.startOffsetMs,
    phase.label,
  ]);
}

function totalMs(plan: PhasePlan): number {
  const last = plan[plan.length - 1];
  return last ? last.startOffsetMs + last.durationMs : 0;
}

// Scenario "Valid configuration starts a session" / "Two-round sequence":
// preparación 10 s, trabajo 30 s, descanso 15 s, 2 rondas → 85 s en total.
const clasicoDosRondas: ClasicoConfig = {
  mode: MODE.clasico,
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

describe("compilePlan — Clásico", () => {
  it("produce la secuencia exacta preparación → trabajo → descanso → trabajo (85 s)", () => {
    const plan = compilePlan(clasicoDosRondas);

    expect(rows(plan)).toEqual([
      ["preparacion", 10_000, 0, "Preparación"],
      ["trabajo", 30_000, 10_000, "Trabajo"],
      ["descanso", 15_000, 40_000, "Descanso"],
      ["trabajo", 30_000, 55_000, "Trabajo"],
    ] satisfies PhaseRow[]);
    expect(totalMs(plan)).toBe(85_000);
  });

  it("numera los índices 0..n-1 en orden contiguo", () => {
    const plan = compilePlan(clasicoDosRondas);
    expect(plan.map((phase) => phase.index)).toEqual([0, 1, 2, 3]);
  });

  // Scenario "Single-round session has no rest phase".
  it("con 1 ronda no emite ningún descanso", () => {
    const plan = compilePlan({
      mode: MODE.clasico,
      values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 1 },
    });

    expect(rows(plan)).toEqual([
      ["preparacion", 10_000, 0, "Preparación"],
      ["trabajo", 30_000, 10_000, "Trabajo"],
    ] satisfies PhaseRow[]);
    expect(plan.some((phase) => phase.kind === PHASE_KIND.descanso)).toBe(
      false,
    );
  });
});

// Scenario "Two tabatas with long rest": preparación 10, trabajo 20,
// descanso 10, 2 rondas por tabata, 2 tabatas, descanso largo 60 → 170 s.
const tabataDosTabatas: TabataConfig = {
  mode: MODE.tabata,
  values: {
    preparacionS: 10,
    trabajoS: 20,
    descansoS: 10,
    rondas: 2, // vestigial (TabataValues extends ClasicoValues) — la compilación usa rondasPorTabata
    rondasPorTabata: 2,
    tabatas: 2,
    descansoLargoS: 60,
  },
};

describe("compilePlan — Tabata", () => {
  it("produce la secuencia exacta de dos tabatas con descanso largo (170 s)", () => {
    const plan = compilePlan(tabataDosTabatas);

    expect(rows(plan)).toEqual([
      ["preparacion", 10_000, 0, "Preparación"],
      ["trabajo", 20_000, 10_000, "Tabata 1 · Trabajo"],
      ["descanso", 10_000, 30_000, "Descanso"],
      ["trabajo", 20_000, 40_000, "Tabata 1 · Trabajo"],
      ["descansoLargo", 60_000, 60_000, "Descanso largo"],
      ["trabajo", 20_000, 120_000, "Tabata 2 · Trabajo"],
      ["descanso", 10_000, 140_000, "Descanso"],
      ["trabajo", 20_000, 150_000, "Tabata 2 · Trabajo"],
    ] satisfies PhaseRow[]);
    expect(totalMs(plan)).toBe(170_000);
  });

  // Scenario "Long rest replaces short rest": tras el trabajo final del
  // tabata 1 empieza el descanso largo inmediatamente — nunca un descanso
  // corto antes, ni descansos consecutivos apilados.
  it("el descanso largo reemplaza (nunca se apila sobre) el descanso corto", () => {
    const plan = compilePlan(tabataDosTabatas);

    const trasTrabajoFinalTabata1 = plan[4];
    expect(trasTrabajoFinalTabata1.kind).toBe(PHASE_KIND.descansoLargo);
    expect(trasTrabajoFinalTabata1.startOffsetMs).toBe(60_000);

    const rests = [PHASE_KIND.descanso, PHASE_KIND.descansoLargo] as const;
    for (let i = 1; i < plan.length; i += 1) {
      const prevIsRest = rests.some((k) => plan[i - 1].kind === k);
      const currIsRest = rests.some((k) => plan[i].kind === k);
      expect(prevIsRest && currIsRest).toBe(false);
    }
  });

  it("con 1 tabata termina en el trabajo final sin descanso largo", () => {
    const plan = compilePlan({
      mode: MODE.tabata,
      values: {
        preparacionS: 10,
        trabajoS: 20,
        descansoS: 10,
        rondas: 2,
        rondasPorTabata: 2,
        tabatas: 1,
        descansoLargoS: 60,
      },
    });

    expect(plan.map((phase) => phase.kind)).toEqual([
      "preparacion",
      "trabajo",
      "descanso",
      "trabajo",
    ]);
    expect(plan.some((phase) => phase.kind === PHASE_KIND.descansoLargo)).toBe(
      false,
    );
  });
});

describe("compilePlan — Personalizado", () => {
  // Scenario "Mixed sequence runs block by block": bloque 1 = Tabata (2
  // rondas × 1 tabata), bloque 2 = Clásico (1 ronda), descanso global 20 s.
  const mixto: PersonalizadoConfig = {
    mode: MODE.personalizado,
    descansoGlobalS: 20,
    blocks: [
      {
        id: "b1",
        tipo: MODE.tabata,
        values: {
          preparacionS: 10,
          trabajoS: 20,
          descansoS: 10,
          rondas: 2,
          rondasPorTabata: 2,
          tabatas: 1,
          descansoLargoS: 60,
        },
      },
      {
        id: "b2",
        tipo: MODE.clasico,
        values: { preparacionS: 5, trabajoS: 30, descansoS: 15, rondas: 1 },
      },
    ],
  };

  it("aplastra bloques mixtos con descanso global SOLO entre bloques (115 s)", () => {
    const plan = compilePlan(mixto);

    expect(rows(plan)).toEqual([
      ["preparacion", 10_000, 0, "Bloque 1 · Preparación"],
      ["trabajo", 20_000, 10_000, "Bloque 1 · Tabata 1 · Trabajo"],
      ["descanso", 10_000, 30_000, "Bloque 1 · Descanso"],
      ["trabajo", 20_000, 40_000, "Bloque 1 · Tabata 1 · Trabajo"],
      ["descansoGlobal", 20_000, 60_000, "Descanso global"],
      ["preparacion", 5_000, 80_000, "Bloque 2 · Preparación"],
      ["trabajo", 30_000, 85_000, "Bloque 2 · Trabajo"],
    ] satisfies PhaseRow[]);
    expect(totalMs(plan)).toBe(115_000);
  });

  // Scenarios "No global rest after the final block" + "No rest stacking at
  // block boundaries": la sesión termina en el trabajo final del último
  // bloque y el descanso global sigue inmediatamente al trabajo final del
  // bloque anterior (sin descanso interno de bloque antes).
  it("nunca emite descanso global tras el bloque final ni descansos apilados", () => {
    const plan = compilePlan(mixto);

    const last = plan[plan.length - 1];
    expect(last.kind).toBe(PHASE_KIND.trabajo);
    expect(last.label).toBe("Bloque 2 · Trabajo");

    const globals = plan.filter(
      (phase) => phase.kind === PHASE_KIND.descansoGlobal,
    );
    expect(globals).toHaveLength(1); // exactamente entre los dos bloques

    const globalIndex = plan.findIndex(
      (phase) => phase.kind === PHASE_KIND.descansoGlobal,
    );
    expect(plan[globalIndex - 1].kind).toBe(PHASE_KIND.trabajo);
    expect(plan[globalIndex + 1].kind).toBe(PHASE_KIND.preparacion);
  });

  // Scenario "Block values are independent": los valores de cada bloque
  // rigen sus propias fases.
  it("los valores de cada bloque son independientes", () => {
    const plan = compilePlan({
      mode: MODE.personalizado,
      descansoGlobalS: 30,
      blocks: [
        {
          id: "a",
          tipo: MODE.clasico,
          values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
        },
        {
          id: "b",
          tipo: MODE.clasico,
          values: { preparacionS: 10, trabajoS: 45, descansoS: 20, rondas: 2 },
        },
      ],
    });

    expect(rows(plan)).toEqual([
      ["preparacion", 10_000, 0, "Bloque 1 · Preparación"],
      ["trabajo", 30_000, 10_000, "Bloque 1 · Trabajo"],
      ["descanso", 15_000, 40_000, "Bloque 1 · Descanso"],
      ["trabajo", 30_000, 55_000, "Bloque 1 · Trabajo"],
      ["descansoGlobal", 30_000, 85_000, "Descanso global"],
      ["preparacion", 10_000, 115_000, "Bloque 2 · Preparación"],
      ["trabajo", 45_000, 125_000, "Bloque 2 · Trabajo"],
      ["descanso", 20_000, 170_000, "Bloque 2 · Descanso"],
      ["trabajo", 45_000, 190_000, "Bloque 2 · Trabajo"],
    ] satisfies PhaseRow[]);
  });

  // "Block-Internal Run Rules Match Parent Modes": un bloque Tabata con
  // varios tabatas aplica SU descanso largo entre ellos.
  it("un bloque Tabata multi-tabata incluye su propio descanso largo", () => {
    const plan = compilePlan({
      mode: MODE.personalizado,
      descansoGlobalS: 20,
      blocks: [
        {
          id: "t1",
          tipo: MODE.tabata,
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
        {
          id: "c1",
          tipo: MODE.clasico,
          values: { preparacionS: 5, trabajoS: 30, descansoS: 15, rondas: 1 },
        },
      ],
    });

    expect(rows(plan)).toEqual([
      ["preparacion", 10_000, 0, "Bloque 1 · Preparación"],
      ["trabajo", 20_000, 10_000, "Bloque 1 · Tabata 1 · Trabajo"],
      ["descanso", 10_000, 30_000, "Bloque 1 · Descanso"],
      ["trabajo", 20_000, 40_000, "Bloque 1 · Tabata 1 · Trabajo"],
      ["descansoLargo", 60_000, 60_000, "Bloque 1 · Descanso largo"],
      ["trabajo", 20_000, 120_000, "Bloque 1 · Tabata 2 · Trabajo"],
      ["descanso", 10_000, 140_000, "Bloque 1 · Descanso"],
      ["trabajo", 20_000, 150_000, "Bloque 1 · Tabata 2 · Trabajo"],
      ["descansoGlobal", 20_000, 170_000, "Descanso global"],
      ["preparacion", 5_000, 190_000, "Bloque 2 · Preparación"],
      ["trabajo", 30_000, 195_000, "Bloque 2 · Trabajo"],
    ] satisfies PhaseRow[]);
    expect(totalMs(plan)).toBe(225_000);
  });
});
