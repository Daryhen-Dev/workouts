// routinesStore (U9) — store persistido v1 vía createValidatedPersist (diseño
// §4.1/§4.2): localStorage "tiptap.routines", zod del shape en
// persistedSchemas.ts (routineRecordSchema — definido en U8, reusado). Spec
// routines: save/list, empty name rejected, duplicado NUNCA sobrescribe en
// silencio (rama explícita de confirmación), rename preserva config, delete
// aísla, persistencia a través de rehydrate (spec local-data).
import { beforeEach, describe, expect, it } from "vitest";
import { compilePlan } from "@/lib/timer/plan";
import {
  MODE,
  type ClasicoConfig,
  type PersonalizadoConfig,
  type SessionConfig,
} from "@/lib/timer/types";
import type { HistoryEntry } from "@/lib/history/types";
import { HISTORY_STORAGE_KEY, useHistoryStore } from "./historyStore";
import { storeRehydrators } from "./storeRehydrators";
import { ROUTINES_STORAGE_KEY, useRoutinesStore } from "./routinesStore";

// Fixtures — «Save a Clásico routine» del spec: 10/30/15, 2 rondas.
const clasicoConfig: ClasicoConfig = {
  mode: MODE.clasico,
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

const otroClasico: ClasicoConfig = {
  mode: MODE.clasico,
  values: { ...clasicoConfig.values, trabajoS: 45 },
};

// «Personalizado routine keeps the full sequence»: 3 bloques independientes y
// descanso global 20 s (escenario literal del spec routines).
const personalizadoConfig: PersonalizadoConfig = {
  mode: MODE.personalizado,
  descansoGlobalS: 20,
  blocks: [
    {
      id: "b-tabata",
      tipo: MODE.tabata,
      values: {
        preparacionS: 10,
        trabajoS: 20,
        descansoS: 10,
        rondasPorTabata: 2,
        tabatas: 2,
        descansoLargoS: 60,
        rondas: 2,
      },
    },
    {
      id: "b-clasico-1",
      tipo: MODE.clasico,
      values: { preparacionS: 5, trabajoS: 40, descansoS: 20, rondas: 3 },
    },
    {
      id: "b-clasico-2",
      tipo: MODE.clasico,
      values: { preparacionS: 0 + 5, trabajoS: 25, descansoS: 10, rondas: 1 },
    },
  ],
};

function sampleEntry(id: string): HistoryEntry {
  return {
    id,
    mode: "clasico",
    completedAt: 1_700_000_000_000,
    activeDurationMs: 85_000,
    rounds: 2,
  };
}

const readStored = () =>
  JSON.parse(window.localStorage.getItem(ROUTINES_STORAGE_KEY) ?? "null");

function seedStorage(routines: unknown[]): void {
  window.localStorage.setItem(
    ROUTINES_STORAGE_KEY,
    JSON.stringify({ state: { routines }, version: 1 }),
  );
}

const names = () => useRoutinesStore.getState().routines.map((r) => r.name);

beforeEach(() => {
  window.localStorage.clear();
  useRoutinesStore.setState({ routines: [] });
  useHistoryStore.setState({ entries: [] });
});

describe("routinesStore — save/list (spec: Save a Clásico routine)", () => {
  it("guarda con nombre y modo; la lista conserva la config verbatim", () => {
    const result = useRoutinesStore.getState().save(clasicoConfig, "Piernas");

    expect(result.status).toBe("saved");
    const [record] = useRoutinesStore.getState().routines;
    expect(record).toMatchObject({
      name: "Piernas",
      mode: "clasico",
      config: clasicoConfig,
    });
    expect(record.id).toBeTruthy();
    expect(record.createdAt).toEqual(expect.any(Number));
    expect(record.updatedAt).toEqual(record.createdAt);
  });

  it("recorta el nombre antes de guardarlo («  Piernas  » → «Piernas»)", () => {
    const result = useRoutinesStore
      .getState()
      .save(clasicoConfig, "  Piernas  ");
    expect(result.status).toBe("saved");
    expect(names()).toEqual(["Piernas"]);
  });
});

describe("routinesStore — validación de nombre y config", () => {
  it("nombre vacío (o solo espacios) se rechaza y no crea nada (spec: Empty name rejected)", () => {
    const vacio = useRoutinesStore.getState().save(clasicoConfig, "");
    const espacios = useRoutinesStore.getState().save(clasicoConfig, "   ");

    expect(vacio.status).toBe("rejected-empty-name");
    expect(espacios.status).toBe("rejected-empty-name");
    expect(useRoutinesStore.getState().routines).toEqual([]);
  });

  it("config inválida jamás se escribe (el schema de disco es la aduana)", () => {
    const mala: SessionConfig = {
      ...clasicoConfig,
      values: { ...clasicoConfig.values, trabajoS: 0 },
    };
    const result = useRoutinesStore.getState().save(mala, "Mala");

    expect(result.status).toBe("rejected-invalid-config");
    expect(useRoutinesStore.getState().routines).toEqual([]);
  });
});

describe("routinesStore — duplicados NUNCA sobrescriben en silencio (spec)", () => {
  it("mismo nombre con otra config pide confirmación y NO toca la original", () => {
    const store = useRoutinesStore.getState();
    store.save(clasicoConfig, "Piernas");

    const choque = store.save(otroClasico, "Piernas");
    expect(choque.status).toBe("confirm-overwrite");

    // La original queda intacta: exactamente 1 rutina con la config A.
    const [record] = useRoutinesStore.getState().routines;
    expect(useRoutinesStore.getState().routines).toHaveLength(1);
    expect(record.config).toEqual(clasicoConfig);
  });

  it("con overwrite EXPLÍCITO reemplaza la config conservando id y createdAt", () => {
    const store = useRoutinesStore.getState();
    const primera = store.save(clasicoConfig, "Piernas");
    if (primera.status !== "saved") throw new Error("fixture: primer save");

    const reemplazo = store.save(otroClasico, "Piernas", { overwrite: true });
    expect(reemplazo.status).toBe("saved");

    const rutinas = useRoutinesStore.getState().routines;
    expect(rutinas).toHaveLength(1);
    expect(rutinas[0].config).toEqual(otroClasico);
    expect(rutinas[0].id).toBe(primera.record.id);
    expect(rutinas[0].createdAt).toBe(primera.record.createdAt);
  });
});

describe("routinesStore — rename (spec: Rename preserves configuration)", () => {
  it("renombrar cambia SOLO el nombre: config, modo y createdAt intactos", () => {
    const store = useRoutinesStore.getState();
    const primera = store.save(clasicoConfig, "Piernas");
    if (primera.status !== "saved") throw new Error("fixture: save");

    const result = store.rename(primera.record.id, "Piernas martes");
    expect(result.status).toBe("saved");

    const [record] = useRoutinesStore.getState().routines;
    expect(record.name).toBe("Piernas martes");
    expect(record.config).toEqual(primera.record.config);
    expect(record.mode).toBe("clasico");
    expect(record.createdAt).toBe(primera.record.createdAt);
  });

  it("renombrar a vacío se rechaza (misma validación que guardar)", () => {
    const store = useRoutinesStore.getState();
    const primera = store.save(clasicoConfig, "Piernas");
    if (primera.status !== "saved") throw new Error("fixture: save");

    expect(store.rename(primera.record.id, "   ").status).toBe(
      "rejected-empty-name",
    );
    expect(names()).toEqual(["Piernas"]); // sin cambios
  });

  it("renombrar al nombre de OTRA rutina se rechaza sin tocar nada", () => {
    const store = useRoutinesStore.getState();
    const a = store.save(clasicoConfig, "Piernas");
    const b = store.save(otroClasico, "Brazos");
    if (a.status !== "saved" || b.status !== "saved")
      throw new Error("fixture: saves");

    expect(store.rename(a.record.id, "Brazos").status).toBe(
      "rejected-duplicate-name",
    );
    expect(names()).toEqual(["Piernas", "Brazos"]); // ambas intactas
  });

  it("renombrar un id inexistente se rechaza explícitamente", () => {
    expect(useRoutinesStore.getState().rename("no-existe", "X").status).toBe(
      "rejected-missing",
    );
  });
});

describe("routinesStore — delete aísla (spec: Delete removes only the routine)", () => {
  it("eliminar una rutina no toca las demás NI el historial", () => {
    const store = useRoutinesStore.getState();
    const piernas = store.save(clasicoConfig, "Piernas");
    store.save(otroClasico, "Brazos");
    if (piernas.status !== "saved") throw new Error("fixture: save");
    useHistoryStore.setState({ entries: [sampleEntry("h-1")] });
    const historialEnDisco = window.localStorage.getItem(HISTORY_STORAGE_KEY);

    useRoutinesStore.getState().remove(piernas.record.id);

    expect(names()).toEqual(["Brazos"]);
    expect(useHistoryStore.getState().entries.map((e) => e.id)).toEqual([
      "h-1",
    ]);
    // Aislamiento también en disco: la clave del historial queda byte a byte igual.
    expect(window.localStorage.getItem(HISTORY_STORAGE_KEY)).toBe(
      historialEnDisco,
    );
  });
});

describe("routinesStore — persistencia (spec: Routines survive reload)", () => {
  it("round-trip: disco con rutinas + rehydrate() las restaura en memoria", async () => {
    useRoutinesStore.getState().save(clasicoConfig, "Piernas");
    useRoutinesStore.getState().save(otroClasico, "Brazos");
    const enDisco = useRoutinesStore.getState().routines;
    // Memoria fresca (lo que pasa tras una recarga): setState persiste el corte
    // vacío, así que se re-siembra el disco capturado — patrón historyStore.test.
    useRoutinesStore.setState({ routines: [] });
    seedStorage(enDisco);
    expect(names()).toEqual([]);

    await useRoutinesStore.persist.rehydrate();
    expect(names()).toEqual(["Piernas", "Brazos"]);
    expect(useRoutinesStore.getState().routines[0].config).toEqual(
      clasicoConfig,
    );
  });

  it("persiste SOLO el corte de datos con version 1 en tiptap.routines", () => {
    useRoutinesStore.getState().save(clasicoConfig, "Piernas");
    const stored = readStored();
    expect(stored.version).toBe(1);
    expect(stored.state.routines).toHaveLength(1);
    expect(stored.state.routines[0].name).toBe("Piernas");
    // sin acciones ni flags de UI en el disco
    expect(Object.keys(stored.state.routines[0]).sort()).toEqual([
      "config",
      "createdAt",
      "id",
      "mode",
      "name",
      "updatedAt",
    ]);
  });

  it("storage corrupto → defaults sin lanzar (la app sigue funcionando)", async () => {
    window.localStorage.setItem(ROUTINES_STORAGE_KEY, '{"routines": [roto');
    useRoutinesStore.setState({
      routines: [
        {
          id: "previa",
          name: "Previa",
          mode: "clasico",
          config: clasicoConfig,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });

    await expect(useRoutinesStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(names()).toEqual(["Previa"]); // conserva la memoria
  });

  it("shape desconocido con la misma versión → defaults", async () => {
    seedStorage([{ otracosa: 42 }]);
    await useRoutinesStore.persist.rehydrate();
    expect(useRoutinesStore.getState().routines).toEqual([]);
  });
});

describe("routinesStore — fidelidad Personalizado (spec: keeps the full sequence)", () => {
  it("save → load → compilePlan igualdad exacta incluido descanso global", async () => {
    useRoutinesStore.getState().save(personalizadoConfig, "Mixta");
    const original = compilePlan(personalizadoConfig);
    const enDisco = useRoutinesStore.getState().routines;
    useRoutinesStore.setState({ routines: [] });
    seedStorage(enDisco);

    await useRoutinesStore.persist.rehydrate();
    const [record] = useRoutinesStore.getState().routines;

    expect(record.config).toEqual(personalizadoConfig);
    expect(compilePlan(record.config)).toEqual(original);
    // El descanso global de 20 s está presente ENTRE bloques (no al final).
    const globals = compilePlan(record.config).filter(
      (fase) => fase.kind === "descansoGlobal",
    );
    expect(globals).toHaveLength(2); // 3 bloques ⇒ 2 descansos globales
    expect(globals.every((fase) => fase.durationMs === 20_000)).toBe(true);
  });
});

describe("routinesStore — registro en el gate de hidratación (§2.3)", () => {
  it("el registro global contiene un rehydrator que restaura las rutinas", async () => {
    const record = {
      id: "gate-1",
      name: "Gate",
      mode: "clasico",
      config: clasicoConfig,
      createdAt: 1,
      updatedAt: 1,
    };
    seedStorage([record]);
    expect(useRoutinesStore.getState().routines).toEqual([]);

    await Promise.all(storeRehydrators.map((rehydrate) => rehydrate()));
    expect(names()).toEqual(["Gate"]);
  });
});
