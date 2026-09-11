// routinesStore (U9) — store persistido v1 (diseño §4.1/§4.2):
// - localStorage "tiptap.routines", versión 1, validación zod vía
//   createValidatedPersist (corrupto → defaults, jamás lanza). El schema de
//   disco (`routinesPersistedSchema`/`routineRecordSchema`) se definió COMPLETO
//   en U8 y aquí se REUSA — no se redefine (fuente única: persistedSchemas.ts).
// - skipHydration: la rehidratación vive en el StoreHydrationGate (§2.3); el
//   rehydrator se registra en storeRehydrators.ts.
//
// Contrato anti-sobrescritura (spec routines: "Duplicate names never silently
// overwrite"): `save` con nombre existente devuelve `confirm-overwrite` y NO
// escribe nada; solo `{ overwrite: true }` — la confirmación EXPLÍCITA de la
// UI — reemplaza la config (conservando id y createdAt). Renombrar sobre el
// nombre de otra rutina se rechaza sin opción de sobrescribir (perdería la
// otra rutina; la spec solo exige la rama explícita al GUARDAR).
//
// Aduana de config: `sessionConfigSchema.safeParse` antes de escribir — una
// config inválida en disco rebotaría al rehidratar y el fallback de zod
// tiraría TODA la lista; jamás se persiste lo que el schema no validaría.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { z } from "zod";
import type { ModeId, SessionConfig } from "@/lib/timer/types";
import { MODE } from "@/lib/timer/types";
import { createValidatedPersist } from "@/lib/storage/persisted";
import { sessionConfigSchema } from "@/lib/validation/configSchemas";
import {
  PERSISTED_SCHEMA_VERSION,
  defaultRoutinesPersisted,
  routinesPersistedSchema,
  type RoutinesPersisted,
} from "@/lib/validation/persistedSchemas";

export const ROUTINES_STORAGE_KEY = "tiptap.routines";

/** Registro de rutina (diseño §4.1) — paridad con `routineRecordSchema` (U8). */
export interface RoutineRecord {
  id: string;
  name: string;
  mode: ModeId;
  /** Config COMPLETA por modo (la secuencia Personalizado se preserva verbatim). */
  config: SessionConfig;
  createdAt: number;
  updatedAt: number;
}

/** Resultados de escritura — una sola unión para save y rename (compartida
 *  por los diálogos de U9: la UI mapea status → error/confirmación/éxito). */
export const ROUTINE_WRITE_RESULT = {
  saved: "saved",
  rejectedEmptyName: "rejected-empty-name",
  rejectedDuplicateName: "rejected-duplicate-name",
  rejectedInvalidConfig: "rejected-invalid-config",
  rejectedMissing: "rejected-missing",
  confirmOverwrite: "confirm-overwrite",
} as const;
export type RoutineWriteResultKind =
  (typeof ROUTINE_WRITE_RESULT)[keyof typeof ROUTINE_WRITE_RESULT];

export type RoutineWriteResult =
  | { status: typeof ROUTINE_WRITE_RESULT.saved; record: RoutineRecord }
  | { status: typeof ROUTINE_WRITE_RESULT.rejectedEmptyName }
  | { status: typeof ROUTINE_WRITE_RESULT.rejectedDuplicateName }
  | { status: typeof ROUTINE_WRITE_RESULT.rejectedInvalidConfig }
  | { status: typeof ROUTINE_WRITE_RESULT.rejectedMissing }
  | {
      status: typeof ROUTINE_WRITE_RESULT.confirmOverwrite;
      existing: RoutineRecord;
    };

export interface SaveOptions {
  /** Confirmación EXPLÍCITA de sobrescritura (la UI la pide antes de reintentar). */
  overwrite?: boolean;
}

let fallbackCounter = 0;

/** Id estable: crypto.randomUUID, o contador si no existe (jsdom). */
function newRoutineId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `rutina-${Date.now()}-${fallbackCounter}`;
}

/** Normaliza el `rondas` vestigial de Tabata (flag U3) — a nivel config Y a
 *  nivel de bloque Personalizado: el schema lo acepta opcional pero
 *  `SessionConfig` lo exige y la compilación usa exclusivamente
 *  `rondasPorTabata` — se fija igual que en las pantallas U5/U6 (sin cast). */
function normalizeConfig(
  config: z.infer<typeof sessionConfigSchema>,
): SessionConfig {
  if (config.mode === MODE.tabata) {
    return {
      ...config,
      values: {
        ...config.values,
        rondas: config.values.rondas ?? config.values.rondasPorTabata,
      },
    };
  }
  if (config.mode === MODE.personalizado) {
    return {
      ...config,
      blocks: config.blocks.map((block) =>
        block.tipo === MODE.tabata
          ? {
              ...block,
              values: {
                ...block.values,
                rondas: block.values.rondas ?? block.values.rondasPorTabata,
              },
            }
          : block,
      ),
    };
  }
  return config;
}

interface RoutinesStoreState {
  routines: RoutineRecord[];
  /** Guarda (o, con overwrite explícito, reemplaza) una config nombrada. */
  save: (
    config: SessionConfig,
    name: string,
    opts?: SaveOptions,
  ) => RoutineWriteResult;
  /** Renombra conservando TODO lo demás; misma validación de nombre que save. */
  rename: (id: string, newName: string) => RoutineWriteResult;
  /** Elimina SOLO la rutina objetivo (historial y demás rutinas intactos). */
  remove: (id: string) => void;
}

export const useRoutinesStore = create<RoutinesStoreState>()(
  persist(
    (set, get) => ({
      routines: [],
      save: (config, name, opts) => {
        const trimmed = name.trim();
        if (trimmed === "") {
          return { status: ROUTINE_WRITE_RESULT.rejectedEmptyName };
        }
        const parsed = sessionConfigSchema.safeParse(config);
        if (!parsed.success) {
          return { status: ROUTINE_WRITE_RESULT.rejectedInvalidConfig };
        }
        const normalizada = normalizeConfig(parsed.data);
        const now = Date.now();
        const existing = get().routines.find((r) => r.name === trimmed);
        if (existing) {
          if (!opts?.overwrite) {
            // NUNCA sobrescribe en silencio: la UI debe confirmar y reintentar.
            return {
              status: ROUTINE_WRITE_RESULT.confirmOverwrite,
              existing,
            };
          }
          const record: RoutineRecord = {
            ...existing,
            name: trimmed,
            mode: normalizada.mode,
            config: normalizada,
            updatedAt: now,
          };
          set({
            routines: get().routines.map((r) =>
              r.id === existing.id ? record : r,
            ),
          });
          return { status: ROUTINE_WRITE_RESULT.saved, record };
        }
        const record: RoutineRecord = {
          id: newRoutineId(),
          name: trimmed,
          mode: normalizada.mode,
          config: normalizada,
          createdAt: now,
          updatedAt: now,
        };
        set({ routines: [...get().routines, record] });
        return { status: ROUTINE_WRITE_RESULT.saved, record };
      },
      rename: (id, newName) => {
        const trimmed = newName.trim();
        if (trimmed === "") {
          return { status: ROUTINE_WRITE_RESULT.rejectedEmptyName };
        }
        const current = get().routines;
        const target = current.find((r) => r.id === id);
        if (!target) {
          return { status: ROUTINE_WRITE_RESULT.rejectedMissing };
        }
        const clash = current.some(
          (r) => r.id !== id && r.name === trimmed,
        );
        if (clash) {
          return { status: ROUTINE_WRITE_RESULT.rejectedDuplicateName };
        }
        const record: RoutineRecord = {
          ...target,
          name: trimmed,
          updatedAt: Date.now(),
        };
        set({
          routines: current.map((r) => (r.id === id ? record : r)),
        });
        return { status: ROUTINE_WRITE_RESULT.saved, record };
      },
      remove: (id) =>
        set({ routines: get().routines.filter((r) => r.id !== id) }),
    }),
    createValidatedPersist<RoutinesStoreState, RoutinesPersisted>({
      key: ROUTINES_STORAGE_KEY,
      schema: routinesPersistedSchema,
      version: PERSISTED_SCHEMA_VERSION,
      fallback: defaultRoutinesPersisted,
    }),
  ),
);
