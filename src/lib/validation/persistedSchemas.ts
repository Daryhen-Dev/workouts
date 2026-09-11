// Schemas zod de los TRES shapes v1 en disco (diseño §4.2/§4.1):
// fuente única de verdad de lo que se persiste. Se definen COMPLETOS ahora
// (U8) — incluidos los campos de U9 (routines) y U11/U13 (settings) — para
// evitar churn de versión: los stores que aterrizan después reusan este
// contrato sin tocar `version`.

import { z } from "zod";
import {
    MODE,
    PHASE_KIND,
    type ModeId,
    type PhaseKind,
} from "@/lib/timer/types";
import { sessionConfigSchema } from "./configSchemas";

export const PERSISTED_SCHEMA_VERSION = 1;

const MODE_KEYS = Object.values(MODE) as [ModeId, ...ModeId[]];
const PHASE_KIND_KEYS = Object.values(PHASE_KIND) as [
    PhaseKind,
    ...PhaseKind[],
];

export const modeSchema = z.enum(MODE_KEYS);

// ——— History (U8): localStorage "tiptap.history" ———

export const historyEntrySchema = z.object({
    id: z.string().min(1),
    mode: modeSchema,
    /** epoch ms del momento de completado natural. */
    completedAt: z.number(),
    /** tiempo activo medido (elapsed − pausas), ms. */
    activeDurationMs: z.number().min(0),
    /** Clásico: rondas configuradas · Tabata: trabajo-totales completados. */
    rounds: z.number().int().min(0).optional(),
    /** Solo Tabata (conteo adicional, MAY según spec history). */
    tabatas: z.number().int().min(0).optional(),
    /** Solo Personalizado: número de bloques. */
    bloques: z.number().int().min(0).optional(),
});

export const historyPersistedSchema = z.object({
    entries: z.array(historyEntrySchema),
});

export type HistoryPersisted = z.infer<typeof historyPersistedSchema>;

export function defaultHistoryPersisted(): HistoryPersisted {
    return { entries: [] };
}

// ——— Routines (U9): localStorage "tiptap.routines" ———

export const routineRecordSchema = z.object({
    id: z.string().min(1),
    /** Nombre requerido no vacío (spec routines: empty name rejected). */
    name: z.string().min(1),
    mode: modeSchema,
    /** Config COMPLETA por modo (la secuencia Personalizado se preserva verbatim). */
    config: sessionConfigSchema,
    createdAt: z.number(),
    updatedAt: z.number(),
});

export const routinesPersistedSchema = z.object({
    routines: z.array(routineRecordSchema),
});

export type RoutinesPersisted = z.infer<typeof routinesPersistedSchema>;

export function defaultRoutinesPersisted(): RoutinesPersisted {
    return { routines: [] };
}

// ——— Settings (U11/U13): localStorage "tiptap.settings" ———

/** Id de pista (uuid de IndexedDB) o null (sin asignación). */
export const trackIdSchema = z.string().min(1).nullable();

export const settingsPersistedSchema = z.object({
    /** Asignación por clase de fase — las CINCO claves (registro exhaustivo). */
    assignments: z.record(z.enum(PHASE_KIND_KEYS), trackIdSchema),
    /** Opt-in de notificaciones (solo se pide desde el gesto de ajustes). */
    notificationsOptIn: z.boolean(),
    /** Timestamp del «ya no mostrar» de la guía de instalación iOS; null = mostrar. */
    installNudgeDismissedAt: z.number().nullable(),
});

export type SettingsPersisted = z.infer<typeof settingsPersistedSchema>;

export function defaultSettingsPersisted(): SettingsPersisted {
    return {
        assignments: {
            [PHASE_KIND.preparacion]: null,
            [PHASE_KIND.trabajo]: null,
            [PHASE_KIND.descanso]: null,
            [PHASE_KIND.descansoLargo]: null,
            [PHASE_KIND.descansoGlobal]: null,
        },
        notificationsOptIn: false,
        installNudgeDismissedAt: null,
    };
}
