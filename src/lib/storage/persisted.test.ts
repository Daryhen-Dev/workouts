// Persistencia validada (diseño §4.2) — `createValidatedPersist`: persist de
// zustand con `version`, `migrate` con pasos ordenados, validación zod y
// fallback a defaults parseados JAMÁS lanza (spec local-data: la app sigue
// funcionando con storage corrupto). Los tests usan un store demo genérico;
// el store real (history) hace round-trip en historyStore.test.ts.
import { beforeEach, describe, expect, it } from "vitest";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import {
  historyPersistedSchema,
  defaultHistoryPersisted,
  defaultSettingsPersisted,
  routineRecordSchema,
  settingsPersistedSchema,
} from "@/lib/validation/persistedSchemas";
import { createValidatedPersist } from "./persisted";

// ——— Store demo: el corte de datos persistidos son las claves del schema
// (partialize derivado — nada de acciones ni flags de UI), versión inyectable ———

interface DemoState {
  items: string[];
  nivel: number;
  /** Flag de UI: NO debe persistir (partialize del schema). */
  vueltas: number;
  addItem: (item: string) => void;
}

function makeDemoStore(key: string, version = 1) {
  const schema =
    version >= 2
      ? z.object({ items: z.array(z.string()), nivel: z.number().int() })
      : z.object({ items: z.array(z.string()) });
  const options = createValidatedPersist<
    DemoState,
    { items: string[]; nivel?: number }
  >({
    key,
    schema,
    version,
    fallback: () => (version >= 2 ? { items: [], nivel: 0 } : { items: [] }),
  });
  return create<DemoState>()(
    persist(
      (set) => ({
        items: [],
        nivel: 0,
        vueltas: 0,
        addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      }),
      options,
    ),
  );
}

const readStored = (key: string) =>
  JSON.parse(window.localStorage.getItem(key) ?? "null");

beforeEach(() => {
  window.localStorage.clear();
});

describe("createValidatedPersist — round-trip v1 (spec local-data)", () => {
  it("persiste SOLO el corte de datos del schema (partialize) con version 1", () => {
    const useStore = makeDemoStore("u8.demo.roundtrip");
    useStore.getState().addItem("uno");
    useStore.getState().addItem("dos");
    useStore.setState({ vueltas: 7 }); // flag de UI — fuera del corte

    const stored = readStored("u8.demo.roundtrip");
    expect(stored.version).toBe(1);
    expect(stored.state).toEqual({ items: ["uno", "dos"] }); // ni acciones ni vueltas
  });

  it("rehidrata: skipHydration arranca en defaults y rehydrate() restaura los datos", async () => {
    const useStore = makeDemoStore("u8.demo.roundtrip");
    useStore.getState().addItem("uno");

    // Segunda "instancia" (misma clave): arranca sin hidratar con defaults.
    const useStore2 = makeDemoStore("u8.demo.roundtrip");
    expect(useStore2.getState().items).toEqual([]);
    expect(useStore2.getState().vueltas).toBe(0); // el flag NO viaja por el storage

    await useStore2.persist.rehydrate();
    expect(useStore2.getState().items).toEqual(["uno"]);
  });
});

describe("createValidatedPersist — storage corrupto o desconocido → defaults, sin lanzar", () => {
  it("JSON corrupto (no parseable) cae a defaults parseados sin lanzar", async () => {
    window.localStorage.setItem("u8.demo.corrupto", '{"items": ["x"');
    const useStore = makeDemoStore("u8.demo.corrupto");

    await expect(useStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(useStore.getState().items).toEqual([]); // defaults del fallback
  });

  it("shape desconocido con la MISMA versión cae a defaults (validación en merge)", async () => {
    window.localStorage.setItem(
      "u8.demo.shape",
      JSON.stringify({
        state: { sorpresa: true, items: "no-array" },
        version: 1,
      }),
    );
    const useStore = makeDemoStore("u8.demo.shape");

    await useStore.persist.rehydrate();
    expect(useStore.getState().items).toEqual([]);
    expect(useStore.getState().vueltas).toBe(0);
  });

  it("versión futura desconocida sin migración aplicable cae a defaults", async () => {
    window.localStorage.setItem(
      "u8.demo.futuro",
      JSON.stringify({ state: { items: ["x"], nivel: 3 }, version: 9 }),
    );
    const useStore = makeDemoStore("u8.demo.futuro", 2);

    await useStore.persist.rehydrate();
    expect(useStore.getState().items).toEqual([]);
    expect(useStore.getState().nivel).toBe(0);
  });
});

describe("createValidatedPersist — camino de migración ordenado (versiones futuras)", () => {
  it("aplica los pasos en orden (1→2→3) y valida el resultado con el schema destino", async () => {
    // On-disk v1: { list }; v2 añade `nivel` renombrando `list`→`items`; v3 normaliza.
    window.localStorage.setItem(
      "u8.demo.migrar",
      JSON.stringify({ state: { list: ["a", "b"] }, version: 1 }),
    );
    const options = createValidatedPersist<
      DemoState,
      { items: string[]; nivel: number }
    >({
      key: "u8.demo.migrar",
      schema: z.object({ items: z.array(z.string()), nivel: z.number().int() }),
      version: 3,
      migrations: [
        // Desordenados a propósito: el helper los aplica por `from`.
        {
          from: 2,
          to: 3,
          migrate: (s: unknown) => ({ ...(s as object), nivel: 0 }),
        },
        {
          from: 1,
          to: 2,
          migrate: (s: unknown) => {
            const prev = s as { list?: string[] };
            return { items: prev.list ?? [] };
          },
        },
      ],
      fallback: () => ({ items: [], nivel: 0 }),
    });
    const useStore = create<DemoState>()(
      persist(
        (_set) => ({ items: [], nivel: 0, vueltas: 0, addItem: () => {} }),
        options,
      ),
    );

    await useStore.persist.rehydrate();
    expect(useStore.getState().items).toEqual(["a", "b"]); // paso 1→2 aplicado
    expect(useStore.getState().nivel).toBe(0); // paso 2→3 aplicado DESPUÉS

    // La migración se persiste de vuelta con la versión destino.
    expect(readStored("u8.demo.migrar").version).toBe(3);
  });

  it("una migración que produce basura cae a los defaults parseados (nunca lanza)", async () => {
    window.localStorage.setItem(
      "u8.demo.migrar-mal",
      JSON.stringify({ state: { list: ["a"] }, version: 1 }),
    );
    const options = createValidatedPersist<
      { items: string[] },
      { items: string[] }
    >({
      key: "u8.demo.migrar-mal",
      schema: z.object({ items: z.array(z.string()) }),
      version: 2,
      migrations: [
        { from: 1, to: 2, migrate: () => ({ nada: "útil" }) }, // rompe el shape
      ],
      fallback: () => ({ items: ["default"] }),
    });
    const useStore = create<{ items: string[] }>()(
      persist(() => ({ items: [] as string[] }), options),
    );

    await useStore.persist.rehydrate();
    expect(useStore.getState().items).toEqual(["default"]); // fallback zod-parseado
  });
});

// ——— persistedSchemas: shapes v1 completos (routines/history/settings —
// diseño §4.2: se definen AHORA para evitar churn de versión en U9/U11/U13) ———

describe("persistedSchemas — v1 completos", () => {
  it("history: valida una entrada completa con conteos de esfuerzo por modo", () => {
    const parsed = historyPersistedSchema.parse({
      entries: [
        {
          id: "id-1",
          mode: "clasico",
          completedAt: 1_700_000_000_000,
          activeDurationMs: 85_000,
          rounds: 2,
        },
        {
          id: "id-2",
          mode: "tabata",
          completedAt: 1_700_000_090_000,
          activeDurationMs: 170_000,
          rounds: 4,
          tabatas: 2,
        },
        {
          id: "id-3",
          mode: "personalizado",
          completedAt: 1_700_000_200_000,
          activeDurationMs: 115_000,
          bloques: 2,
        },
      ],
    });
    expect(parsed.entries).toHaveLength(3);
  });

  it("history: rechaza un modo desconocido y los defaults del fallback parsean limpio", () => {
    expect(
      historyPersistedSchema.safeParse({
        entries: [
          { id: "x", mode: "emom", completedAt: 1, activeDurationMs: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(historyPersistedSchema.parse(defaultHistoryPersisted())).toEqual({
      entries: [],
    });
  });

  it("settings: las cinco clases de fase existen como claves, todas null por defecto", () => {
    const defaults = defaultSettingsPersisted();
    expect(settingsPersistedSchema.parse(defaults)).toEqual(defaults);
    expect(Object.keys(defaults.assignments).sort()).toEqual(
      [
        "descanso",
        "descansoGlobal",
        "descansoLargo",
        "preparacion",
        "trabajo",
      ].sort(),
    );
    expect(Object.values(defaults.assignments)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("routines: valida un registro con config Personalizado anidada (secuencia completa)", () => {
    const record = {
      id: "rut-1",
      name: "Mi mix",
      mode: "personalizado",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      config: {
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
              rondasPorTabata: 2,
              tabatas: 2,
              descansoLargoS: 60,
            },
          },
        ],
      },
    };
    expect(routineRecordSchema.parse(record).name).toBe("Mi mix");
    expect(routineRecordSchema.safeParse({ ...record, name: "" }).success).toBe(
      false,
    );
  });
});
