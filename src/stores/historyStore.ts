// historyStore (U8) — store persistido v1 (diseño §4.1/§4.2):
// - localStorage "tiptap.history", versión 1, validación zod vía
//   createValidatedPersist (corrupto → defaults, jamás lanza).
// - addEntry es ADD-ONLY: solo añade al final. El exactly-once por sesión lo
//   garantiza el observador de completado del SessionController (U7 seam) —
//   el store no deduplica.
// - skipHydration: la rehidratación vive en el StoreHydrationGate (§2.3); el
//   rehydrator se registra desde storeRehydrators.ts (módulo del gate, siempre
//   cargado con el shell — un registro por chunk de ruta llegaría tarde en
//   navegaciones client-side).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HistoryEntry } from "@/lib/history/types";
import { createValidatedPersist } from "@/lib/storage/persisted";
import {
  PERSISTED_SCHEMA_VERSION,
  defaultHistoryPersisted,
  historyPersistedSchema,
  type HistoryPersisted,
} from "@/lib/validation/persistedSchemas";

export const HISTORY_STORAGE_KEY = "tiptap.history";

interface HistoryStoreState {
  entries: HistoryEntry[];
  addEntry: (entry: HistoryEntry) => void;
}

export const useHistoryStore = create<HistoryStoreState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => set((s) => ({ entries: [...s.entries, entry] })),
    }),
    createValidatedPersist<HistoryStoreState, HistoryPersisted>({
      key: HISTORY_STORAGE_KEY,
      schema: historyPersistedSchema,
      version: PERSISTED_SCHEMA_VERSION,
      fallback: defaultHistoryPersisted,
    }),
  ),
);

/** Imperativo para el cableado de completado (observador del controlador). */
export function addHistoryEntry(entry: HistoryEntry): void {
  useHistoryStore.getState().addEntry(entry);
}
