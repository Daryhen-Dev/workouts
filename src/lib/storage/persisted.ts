// createValidatedPersist (diseño §4.2) — helper compartido por los TRES stores
// persistidos (history U8, routines U9, settings U11):
//
//   persist({ version, migrate, partialize, skipHydration: true })
//
// Contratos que este helper hace estructurales:
// - `migrate` aplica los pasos de migración EN ORDEN (por `from`), luego
//   `schema.safeParse`: parse fallido (shape corrupto/desconocido) → defaults
//   parseados con zod. JAMÁS lanza hacia React (spec local-data: la app sigue
//   funcionando aunque el storage esté corrupto).
// - `partialize` se deriva de las claves del schema: el disco SOLO contiene el
//   corte de datos (sin acciones ni flags de UI).
// - `merge` valida TAMBIÉN el caso misma-versión (zustand solo llama `migrate`
//   cuando las versiones difieren): shape inválido v1 → estado actual (defaults).
// - JSON no parseable: el storage JSON de zustand ya lo traga (catch interno del
//   middleware) → el store conserva sus defaults; el gate de hidratación es
//   fail-open por diseño (§2.3).

import type { PersistOptions } from "zustand/middleware";
import type { z } from "zod";
import { ZodObject } from "zod";

/** Un paso de migración: transforma el estado de disco de `from` a `to`. */
export interface MigrationStep {
  from: number;
  to: number;
  /** Puramente transformadora; el resultado se valida con el schema destino. */
  migrate: (state: unknown) => unknown;
}

export interface ValidatedPersistConfig<T> {
  /** Clave de localStorage (p. ej. "tiptap.history"). */
  key: string;
  /** Schema zod del corte de datos persistido (fuente única: persistedSchemas.ts). */
  schema: z.ZodType<T>;
  /** Versión actual del shape en disco. */
  version: number;
  /** Pasos ordenados por `from` (se aplican en cadena hasta alcanzar `version`). */
  migrations?: readonly MigrationStep[];
  /** Defaults del corte de datos; se devuelve ZOD-PARSEADO (debe validar limpio). */
  fallback: () => T;
}

/**
 * Construye las PersistOptions validadas para `persist(creator, options)`.
 * El tipo S es el estado completo del store; T el corte persistido (z.infer).
 */
export function createValidatedPersist<S extends object, T extends object>(
  config: ValidatedPersistConfig<T>,
): PersistOptions<S, T> {
  const { key, schema, version, migrations = [], fallback } = config;

  /** safeParse → datos válidos o defaults parseados. Nunca lanza. */
  const validate = (value: unknown): T => {
    const result = schema.safeParse(value);
    return result.success ? result.data : schema.parse(fallback());
  };

  /** Cadena ordenada de pasos hasta agotar (versiones futuras: paso a paso). */
  const runOrderedMigrations = (
    persisted: unknown,
    persistedVersion: number,
  ): T => {
    try {
      let current = persisted;
      let v = persistedVersion;
      const ordered = [...migrations].sort((a, b) => a.from - b.from);
      // A lo sumo un paso por entrada de la lista: ciclo imposible por construcción.
      for (let i = 0; i < ordered.length; i += 1) {
        const step = ordered[i];
        if (v !== step.from) continue;
        current = step.migrate(current);
        v = step.to;
      }
      // La cadena debe llegar EXACTAMENTE a la versión actual: un salto roto o una
      // versión de disco futura (app vieja sobre datos nuevos) no se adopta aunque
      // el shape parzca válido — no podemos saber qué cambió esa versión.
      if (v !== version) return schema.parse(fallback());
      return validate(current);
    } catch {
      // Una migración defectuosa nunca debe tumbar la hidratación.
      return schema.parse(fallback());
    }
  };

  /** partialize derivado: SOLO las claves del schema (corte de datos). */
  const partialize = (state: S): T => {
    if (!(schema instanceof ZodObject)) {
      // SAFETY: schema no-objeto no declara corte → se persiste el estado tal cual;
      // los tres stores v1 usan z.object (rama cubierta solo por completitud del tipo).
      return state as unknown as T;
    }
    const slice: Record<string, unknown> = {};
    for (const dataKey of Object.keys(schema.shape)) {
      // SAFETY: los stores garantizan por construcción que las claves del schema
      // existen en S (el estado CONTIENE el corte de datos que persiste);
      // la proyección por clave no añade nada que el schema no valide al rehidratar.
      slice[dataKey] = (state as unknown as Record<string, unknown>)[dataKey];
    }
    return slice as T;
  };

  return {
    name: key,
    version,
    skipHydration: true,
    partialize,
    migrate: runOrderedMigrations,
    merge: (persistedState, currentState) => {
      const result = schema.safeParse(persistedState);
      return result.success
        ? { ...currentState, ...result.data }
        : currentState; // misma versión con shape inválido → defaults actuales
    },
  };
}
