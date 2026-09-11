// historyStore (U8) — store persistido v1 vía createValidatedPersist:
// addEntry SOLO añade (add-only; el exactly-once lo garantiza el observador
// del controlador), persiste en "tiptap.history" solo el corte de datos y se
// rehidrata a través del registro del StoreHydrationGate (§2.3).
import { beforeEach, describe, expect, it } from "vitest";
import type { HistoryEntry } from "@/lib/history/types";
import { storeRehydrators } from "./storeRehydrators";
import { HISTORY_STORAGE_KEY, useHistoryStore } from "./historyStore";

function sampleEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "e-1",
    mode: "clasico",
    completedAt: 1_700_000_000_000,
    activeDurationMs: 85_000,
    rounds: 2,
    ...overrides,
  };
}

const readStored = () =>
  JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) ?? "null");

/** Simula un disco con datos y memoria fresca (lo que pasa tras una recarga). */
function seedStorage(entries: HistoryEntry[]): void {
  window.localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify({ state: { entries }, version: 1 }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  useHistoryStore.setState({ entries: [] });
});

describe("historyStore — addEntry (add-only)", () => {
  it("añade al final sin tocar las entradas previas", () => {
    const a = sampleEntry({ id: "a", completedAt: 1 });
    const b = sampleEntry({ id: "b", completedAt: 2 });
    useHistoryStore.getState().addEntry(a);
    useHistoryStore.getState().addEntry(b);
    expect(useHistoryStore.getState().entries.map((e) => e.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it(
    "persiste SOLO el corte de datos con version 1 (localStorage " +
      HISTORY_STORAGE_KEY +
      ")",
    () => {
      useHistoryStore.getState().addEntry(sampleEntry());
      const stored = readStored();
      expect(stored.version).toBe(1);
      expect(stored.state).toEqual({ entries: [sampleEntry()] }); // sin acciones
    },
  );
});

describe("historyStore — persistencia (spec local-data: survives reload)", () => {
  it("round-trip: disco con entradas + rehydrate() las restaura en memoria", async () => {
    seedStorage([sampleEntry({ id: "r1" })]);
    expect(useHistoryStore.getState().entries).toEqual([]); // skipHydration: memoria fresca

    await useHistoryStore.persist.rehydrate();
    expect(useHistoryStore.getState().entries.map((e) => e.id)).toEqual(["r1"]);
  });

  it("storage corrupto → defaults sin lanzar (la app sigue funcionando)", async () => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, '{"entries": [roto');
    useHistoryStore.setState({ entries: [sampleEntry({ id: "previa" })] });

    await expect(useHistoryStore.persist.rehydrate()).resolves.toBeUndefined();
    // zustand traga el JSON roto: conserva el estado en memoria.
    expect(useHistoryStore.getState().entries.map((e) => e.id)).toEqual([
      "previa",
    ]);
  });

  it("shape desconocido con la misma versión → defaults", async () => {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify({ state: { otracosa: 42 }, version: 1 }),
    );
    await useHistoryStore.persist.rehydrate();
    expect(useHistoryStore.getState().entries).toEqual([]);
  });
});

describe("historyStore — registro en el gate de hidratación (§2.3)", () => {
  it("el registro global contiene un rehydrator que restaura las entradas", async () => {
    expect(storeRehydrators.length).toBeGreaterThanOrEqual(1);
    seedStorage([sampleEntry({ id: "gate-1" })]);
    expect(useHistoryStore.getState().entries).toEqual([]);

    await Promise.all(storeRehydrators.map((rehydrate) => rehydrate()));
    expect(useHistoryStore.getState().entries.map((e) => e.id)).toEqual([
      "gate-1",
    ]);
  });
});
