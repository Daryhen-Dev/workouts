// Compilador de planes — diseño §3.2 (add-pwa-workout-timer).
//
// Función PURA: aplana cualquier SessionConfig a una lista ordenada de fases
// en coordenadas de TIEMPO ACTIVO (startOffsetMs excluye pausas). Sin React,
// sin APIs del navegador. Las scenarios del spec timer-modes son aserciones
// unitarias directas contra la salida de esta función.

import {
  MODE,
  PHASE_KIND,
  type ClasicoValues,
  type PersonalizadoConfig,
  type PhaseKind,
  type PhasePlan,
  type SessionConfig,
  type TabataValues,
} from "./types";

/** Semilla de fase antes de asignar offsets/índices. */
interface PhaseSeed {
  kind: PhaseKind;
  durationMs: number;
  label: string;
}

const seconds = (s: number): number => s * 1000;

/**
 * Alterna `count` unidades de trabajo insertando el descanso SOLO entre
 * unidades consecutivas — nunca al final (regla compartida por Clásico y por
 * las rondas internas de cada tabata; spec "no trailing descanso").
 */
function interleaveWorkRest(
  count: number,
  emitWork: (i: number) => void,
  emitRest: () => void,
): void {
  for (let i = 0; i < count; i += 1) {
    if (i > 0) emitRest();
    emitWork(i);
  }
}

/**
 * Clásico: preparación una vez → rondas de trabajo con descanso SOLO entre
 * trabajos consecutivos; nunca un descanso final (spec timer-modes,
 * "Clásico Run Behavior").
 */
function clasicoSeeds(values: ClasicoValues, prefix = ""): PhaseSeed[] {
  const seeds: PhaseSeed[] = [
    {
      kind: PHASE_KIND.preparacion,
      durationMs: seconds(values.preparacionS),
      label: `${prefix}Preparación`,
    },
  ];
  interleaveWorkRest(
    values.rondas,
    () =>
      seeds.push({
        kind: PHASE_KIND.trabajo,
        durationMs: seconds(values.trabajoS),
        label: `${prefix}Trabajo`,
      }),
    () =>
      seeds.push({
        kind: PHASE_KIND.descanso,
        durationMs: seconds(values.descansoS),
        label: `${prefix}Descanso`,
      }),
  );
  return seeds;
}

/**
 * Tabata: preparación una vez → por tabata: rondas de trabajo con descanso
 * corto entre trabajos consecutivos; tras el trabajo final de un tabata NO
 * final → descanso largo (REEMPLAZA, nunca se apila sobre, el descanso
 * corto); tras el tabata final → fin (spec timer-modes, "Tabata Run Behavior").
 *
 * Nota: usa `rondasPorTabata`; el `rondas` heredado de TabataValues es
 * vestigial y se ignora (el spec define Tabata con seis valores).
 */
function tabataSeeds(values: TabataValues, prefix = ""): PhaseSeed[] {
  const seeds: PhaseSeed[] = [
    {
      kind: PHASE_KIND.preparacion,
      durationMs: seconds(values.preparacionS),
      label: `${prefix}Preparación`,
    },
  ];
  for (let tabata = 0; tabata < values.tabatas; tabata += 1) {
    if (tabata > 0) {
      seeds.push({
        kind: PHASE_KIND.descansoLargo,
        durationMs: seconds(values.descansoLargoS),
        label: `${prefix}Descanso largo`,
      });
    }
    interleaveWorkRest(
      values.rondasPorTabata,
      () =>
        seeds.push({
          kind: PHASE_KIND.trabajo,
          durationMs: seconds(values.trabajoS),
          label: `${prefix}Tabata ${tabata + 1} · Trabajo`,
        }),
      () =>
        seeds.push({
          kind: PHASE_KIND.descanso,
          durationMs: seconds(values.descansoS),
          label: `${prefix}Descanso`,
        }),
    );
  }
  return seeds;
}

/**
 * Personalizado: bloques aplastados siguiendo las reglas del propio modo de
 * cada bloque (los bloques Tabata incluyen su propio descanso largo);
 * descanso global SOLO entre bloques consecutivos — nunca tras el bloque
 * final, y ningún descanso interno de bloque al final de un bloque (spec
 * timer-modes, "Block-Internal Run Rules Match Parent Modes").
 */
function personalizadoSeeds(config: PersonalizadoConfig): PhaseSeed[] {
  const seeds: PhaseSeed[] = [];
  config.blocks.forEach((block, i) => {
    if (i > 0) {
      seeds.push({
        kind: PHASE_KIND.descansoGlobal,
        durationMs: seconds(config.descansoGlobalS),
        label: "Descanso global",
      });
    }
    const prefix = `Bloque ${i + 1} · `;
    if (block.tipo === MODE.tabata) {
      // BlockDef no correlaciona `tipo` con `values` — el configuración llega
      // validada por `configSchemas` aguas arriba; el cast es la única vía.
      seeds.push(...tabataSeeds(block.values as TabataValues, prefix));
    } else {
      seeds.push(...clasicoSeeds(block.values, prefix));
    }
  });
  return seeds;
}

/** Asigna índices contiguos y offsets acumulativos de tiempo activo. */
function withOffsets(seeds: readonly PhaseSeed[]): PhasePlan {
  let offsetMs = 0;
  return seeds.map((seed, index) => {
    const phase = {
      index,
      kind: seed.kind,
      durationMs: seed.durationMs,
      startOffsetMs: offsetMs,
      label: seed.label,
    };
    offsetMs += seed.durationMs;
    return phase;
  });
}

/** Compila la configuración de cualquier modo al plan de fases ejecutable. */
export function compilePlan(config: SessionConfig): PhasePlan {
  switch (config.mode) {
    case MODE.clasico:
      return withOffsets(clasicoSeeds(config.values));
    case MODE.tabata:
      return withOffsets(tabataSeeds(config.values));
    case MODE.personalizado:
      return withOffsets(personalizadoSeeds(config));
  }
}
