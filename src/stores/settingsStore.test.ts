// settingsStore (U11 — diseño §4.1) — store persistido v1:
// localStorage "tiptap.settings" con asignaciones de música por clase de fase
// (las CINCO), opt-in de notificaciones y timestamp del nudge de instalación
// (campos U13 definidos ya — el shape v1 completo se fijó en U8).
//
// Cobertura: defaults; asignación por kind; round-trip por rehydrate; JSON
// corrupto → defaults; clearTrack (limpieza de huérfanos del musicStore);
// registro en el gate de rehidratación (§2.3).
import { beforeEach, describe, expect, it } from "vitest";
import type { TrackId } from "@/lib/storage/musicStore";
import { PHASE_KIND, type PhaseKind } from "@/lib/timer/types";
import { storeRehydrators } from "./storeRehydrators";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "@/stores/settingsStore";

const TODOS_LOS_KINDS: PhaseKind[] = Object.values(PHASE_KIND);

const readStored = () =>
  JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null");

function seedStorage(state: unknown): void {
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ state, version: 1 }),
  );
}

const assignments = () => useSettingsStore.getState().assignments;

beforeEach(() => {
  window.localStorage.clear();
  useSettingsStore.setState({
    assignments: {
      [PHASE_KIND.preparacion]: null,
      [PHASE_KIND.trabajo]: null,
      [PHASE_KIND.descanso]: null,
      [PHASE_KIND.descansoLargo]: null,
      [PHASE_KIND.descansoGlobal]: null,
    },
    notificationsOptIn: false,
    installNudgeDismissedAt: null,
  });
});

describe("settingsStore — shape v1 (diseño §4.1)", () => {
  it("arranca con las CINCO asignaciones en null y opt-ins neutros", () => {
    for (const kind of TODOS_LOS_KINDS) {
      expect(assignments()[kind]).toBeNull();
    }
    expect(useSettingsStore.getState().notificationsOptIn).toBe(false);
    expect(useSettingsStore.getState().installNudgeDismissedAt).toBeNull();
  });

  it("setAssignment asigna SOLO el kind pedido (spec: Assignment per phase kind)", () => {
    const { setAssignment } = useSettingsStore.getState();

    setAssignment(PHASE_KIND.trabajo, "track-1");
    setAssignment(PHASE_KIND.descanso, "track-2");

    expect(assignments()[PHASE_KIND.trabajo]).toBe("track-1");
    expect(assignments()[PHASE_KIND.descanso]).toBe("track-2");
    expect(assignments()[PHASE_KIND.preparacion]).toBeNull();
    expect(assignments()[PHASE_KIND.descansoLargo]).toBeNull();
    expect(assignments()[PHASE_KIND.descansoGlobal]).toBeNull();
  });

  it("setAssignment(kind, null) desasigna (fase en silencio salvo beeps)", () => {
    const { setAssignment } = useSettingsStore.getState();
    setAssignment(PHASE_KIND.trabajo, "track-1");
    setAssignment(PHASE_KIND.trabajo, null);
    expect(assignments()[PHASE_KIND.trabajo]).toBeNull();
  });
});

describe("settingsStore — persistencia (spec local-data)", () => {
  it("round-trip: disco con asignaciones + rehydrate() las restaura", async () => {
    useSettingsStore.getState().setAssignment(PHASE_KIND.trabajo, "track-9");
    useSettingsStore.getState().setNotificationsOptIn(true);
    useSettingsStore.getState().dismissInstallNudge(1_700_000_000_000);

    // El disco guarda exactamente el corte v1.
    const stored = readStored();
    expect(stored.state.assignments.trabajo).toBe("track-9");
    expect(stored.state.notificationsOptIn).toBe(true);
    expect(stored.state.installNudgeDismissedAt).toBe(1_700_000_000_000);

    // «Recarga»: memoria a defaults, disco restaurado, rehydrate.
    useSettingsStore.setState({
      assignments: Object.fromEntries(
        TODOS_LOS_KINDS.map((k) => [k, null]),
      ) as Record<PhaseKind, TrackId | null>,
      notificationsOptIn: false,
      installNudgeDismissedAt: null,
    });
    seedStorage(stored.state);
    await useSettingsStore.persist.rehydrate();
    expect(assignments()[PHASE_KIND.trabajo]).toBe("track-9");
    expect(useSettingsStore.getState().notificationsOptIn).toBe(true);
    expect(useSettingsStore.getState().installNudgeDismissedAt).toBe(
      1_700_000_000_000,
    );
  });

  it("JSON corrupto → defaults del schema, jamás lanza (contrato §4.2)", async () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{"assignments": [roto');
    await expect(useSettingsStore.persist.rehydrate()).resolves.toBeUndefined();
    for (const kind of TODOS_LOS_KINDS) {
      expect(assignments()[kind]).toBeNull();
    }
  });
});

describe("settingsStore — clearTrack (limpieza de huérfanos del musicStore)", () => {
  it("limpia TODAS las asignaciones que referencian la pista y solo esas", () => {
    const { setAssignment, clearTrack } = useSettingsStore.getState();
    setAssignment(PHASE_KIND.trabajo, "compartida");
    setAssignment(PHASE_KIND.descanso, "compartida");
    setAssignment(PHASE_KIND.preparacion, "otra");

    clearTrack("compartida");

    expect(assignments()[PHASE_KIND.trabajo]).toBeNull();
    expect(assignments()[PHASE_KIND.descanso]).toBeNull();
    expect(assignments()[PHASE_KIND.preparacion]).toBe("otra");
  });
});

describe("settingsStore — registro en el gate (§2.3)", () => {
  it("está registrado en storeRehydrators y rehidrata «tiptap.settings»", async () => {
    expect(storeRehydrators.length).toBeGreaterThanOrEqual(3);

    seedStorage({
      assignments: {
        ...Object.fromEntries(TODOS_LOS_KINDS.map((k) => [k, null])),
        descansoGlobal: "track-g",
      },
      notificationsOptIn: false,
      installNudgeDismissedAt: null,
    });
    await Promise.all(storeRehydrators.map((rehydrate) => rehydrate()));
    expect(assignments()[PHASE_KIND.descansoGlobal]).toBe("track-g");
  });
});
