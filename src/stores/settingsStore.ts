// settingsStore (U11) — store persistido v1 (diseño §4.1):
// - localStorage "tiptap.settings" con las asignaciones de música por clase de
//   fase (las CINCO: preparación, trabajo, descanso, descanso largo, descanso
//   global), el opt-in de notificaciones y el timestamp del nudge de
//   instalación iOS — el shape v1 COMPLETO se fijó en U8 y aquí se REUSA (sin
//   churn de versión). U13 consume los dos últimos campos.
// - clearTrack: limpieza de huérfanos del musicStore (diseño §7) — al eliminar
//   una pista, TODAS las asignaciones que la referencian pasan a null; las
//   demás no se tocan.
// - skipHydration: la rehidratación vive en el StoreHydrationGate (§2.3); el
//   rehydrator está registrado en storeRehydrators.ts.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TrackId } from "@/lib/storage/musicStore"; // solo tipo: sin ciclo runtime
import { PHASE_KIND, type PhaseKind } from "@/lib/timer/types";
import { createValidatedPersist } from "@/lib/storage/persisted";
import {
    PERSISTED_SCHEMA_VERSION,
    defaultSettingsPersisted,
    settingsPersistedSchema,
    type SettingsPersisted,
} from "@/lib/validation/persistedSchemas";

export const SETTINGS_STORAGE_KEY = "tiptap.settings";

/** Asignaciones por defecto — las cinco clases en null (silencio salvo beeps). */
function defaultAssignments(): Record<PhaseKind, TrackId | null> {
    return { ...defaultSettingsPersisted().assignments };
}

interface SettingsStoreState {
    /** Pista asignada a cada clase de fase; null = sin música en esa clase. */
    assignments: Record<PhaseKind, TrackId | null>;
    /** Opt-in de notificaciones — el permiso SOLO se pide desde el gesto de ajustes (U13). */
    notificationsOptIn: boolean;
    /** Timestamp del «ya no mostrar» de la guía de instalación iOS (U13); null = mostrar. */
    installNudgeDismissedAt: number | null;
    setAssignment: (kind: PhaseKind, trackId: TrackId | null) => void;
    /** Limpieza de huérfanos (§7): todas las asignaciones de la pista → null. */
    clearTrack: (trackId: TrackId) => void;
    setNotificationsOptIn: (value: boolean) => void;
    dismissInstallNudge: (at: number) => void;
}

export const useSettingsStore = create<SettingsStoreState>()(
    persist(
        (set) => ({
            assignments: defaultAssignments(),
            notificationsOptIn: false,
            installNudgeDismissedAt: null,
            setAssignment: (kind, trackId) =>
                set((s) => ({
                    assignments: { ...s.assignments, [kind]: trackId },
                })),
            clearTrack: (trackId) =>
                set((s) => ({
                    assignments: Object.fromEntries(
                        Object.entries(s.assignments).map(([kind, id]) => [
                            kind,
                            id === trackId ? null : id,
                        ]),
                    ) as Record<PhaseKind, TrackId | null>,
                })),
            setNotificationsOptIn: (value) =>
                set({ notificationsOptIn: value }),
            dismissInstallNudge: (at) => set({ installNudgeDismissedAt: at }),
        }),
        // Genéricos EXPLÍCITOS: S no es inferible desde los argumentos (lección U8).
        createValidatedPersist<SettingsStoreState, SettingsPersisted>({
            key: SETTINGS_STORAGE_KEY,
            schema: settingsPersistedSchema,
            version: PERSISTED_SCHEMA_VERSION,
            fallback: defaultSettingsPersisted,
        }),
    ),
);

/** Imperativo para la limpieza de huérfanos del musicStore (diseño §7). */
export function clearTrackAssignments(trackId: TrackId): void {
    useSettingsStore.getState().clearTrack(trackId);
}

/** PHASE_KIND se re-exporta por comodidad de las superficies de asignación. */
export { PHASE_KIND };
