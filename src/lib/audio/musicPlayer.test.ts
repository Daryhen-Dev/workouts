// musicPlayer (U11 — diseño §6.3) — jugador de música por fase.
//
// CONTRATO bajo prueba (tasks.md U11 + spec audio «Per-Phase Music Playback»):
// - UN elemento <audio> oculto de larga vida, cableado UNA sola vez vía
//   createMediaElementSource → duckGain (grafo §6.3);
// - retargetToPhase: para la saliente, arranca la entrante DESDE 0 con loop,
//   revoca la URL vieja TRAS el swap — el jugador posee EXACTAMENTE UNA URL de
//   objeto activa en todo momento (tarea REFACTOR U11);
// - fase sin asignación → detiene la música (silencio salvo beeps);
// - pause/resume nativos del elemento (posición preservada — spec);
// - todo es no-op seguro sin <audio>, sin Web Audio o con IndexedDB caído.
//
// Ducking: NO vive aquí — la automatización de ganancia se empareja con los
// cues en useCueScheduler (pruebas en sessionMusic.test.tsx).
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ScheduledPhase, PhaseKind } from "@/lib/timer/types";
import type { TrackId } from "@/lib/storage/musicStore";
import {
  stubAudioContext,
  stubAudioElement,
  type StubAudioContext,
  type StubAudioElement,
} from "@/test/fakes";

// Entorno de audio bajo control del test: el cableado POR DEFECTO del jugador
// usa getAudioContext + getDuckGain reales; el stub permite asertar el grafo.
const audioHolder = vi.hoisted(() => ({
  ctx: null as StubAudioContext | null,
}));
vi.mock("@/lib/audio/context", () => ({
  getAudioContext: () => audioHolder.ctx,
  resumeIfSuspended: async () => {},
}));

import { createMusicPlayer, type MusicPlayer } from "./musicPlayer";

/** Fase de `kind` empezando en 0 s (el jugador solo lee kind). */
function phaseOf(kind: PhaseKind, index = 0): ScheduledPhase {
  return {
    index,
    kind,
    durationMs: 30_000,
    startOffsetMs: 0,
    label: kind,
  };
}

interface Fixture {
  player: MusicPlayer;
  element: StubAudioElement;
  wireElement: Mock;
  /** Asignaciones mutables kind → TrackId | null. */
  assignments: Record<string, TrackId | null>;
  getObjectUrl: Mock<(id: TrackId) => Promise<string>>;
  revoked: string[];
}

/** Jugador con elemento stub + store falso — el cableado por defecto corre. */
function makePlayer(
  overrides: Partial<Pick<Fixture, "getObjectUrl">> = {},
): Fixture {
  const element = stubAudioElement();
  const wireElement = vi.fn();
  const assignments: Record<string, TrackId | null> = {};
  const getObjectUrl =
    overrides.getObjectUrl ??
    vi.fn(async (id: TrackId): Promise<string> => `blob:${id}`);
  const revoked: string[] = [];
  const player = createMusicPlayer({
    createElement: () => element,
    wireElement,
    store: { getObjectUrl },
    getAssignment: (kind) => assignments[kind] ?? null,
    revokeUrl: (url) => revoked.push(url),
  });
  return { player, element, wireElement, assignments, getObjectUrl, revoked };
}

beforeEach(() => {
  audioHolder.ctx = stubAudioContext(100);
});

afterEach(() => {
  audioHolder.ctx = null;
});

describe("retargetToPhase — swap de pistas y ciclo de vida de la URL", () => {
  it("arranca la pista asignada desde 0 con loop=true (spec: Assignment per phase kind)", async () => {
    const f = makePlayer();
    f.assignments.trabajo = "t1";

    await f.player.retargetToPhase(phaseOf("trabajo"));

    expect(f.element.srcSets).toEqual(["blob:t1"]);
    expect(f.element.loop).toBe(true);
    expect(f.element.currentTime).toBe(0);
    expect(f.element.playCalls).toBe(1);
    expect(f.revoked).toEqual([]); // nada que revocar: primera URL activa
  });

  it("cambio de fase: para la saliente, arranca la entrante desde 0 y revoca SOLO la URL vieja", async () => {
    const f = makePlayer();
    f.assignments.trabajo = "t1";
    f.assignments.descanso = "t2";

    await f.player.retargetToPhase(phaseOf("trabajo", 0));
    f.element.currentTime = 17; // la saliente llevaba 17 s sonando
    await f.player.retargetToPhase(phaseOf("descanso", 1));

    expect(f.element.srcSets).toEqual(["blob:t1", "blob:t2"]);
    expect(f.element.currentTime).toBe(0); // entrante desde 0
    expect(f.element.playCalls).toBe(2);
    expect(f.element.pauseCalls).toBeGreaterThanOrEqual(1); // saliente detenida
    expect(f.revoked).toEqual(["blob:t1"]); // la vieja se libera TRAS el swap
    expect(f.getObjectUrl).toHaveBeenCalledTimes(2);
  });

  it("fase sin asignación → detiene la música y libera la URL (silencio salvo beeps)", async () => {
    const f = makePlayer();
    f.assignments.trabajo = "t1";

    await f.player.retargetToPhase(phaseOf("trabajo", 0));
    await f.player.retargetToPhase(phaseOf("descanso", 1)); // sin asignación

    expect(f.element.pauseCalls).toBeGreaterThanOrEqual(1);
    expect(f.element.removedAttributes).toContain("src");
    expect(f.revoked).toEqual(["blob:t1"]);
    expect(f.element.playCalls).toBe(1); // nada nuevo suena
    // Sin URL activa: reanudar ya no reproduce nada.
    f.player.resumeMusic();
    expect(f.element.playCalls).toBe(1);
  });

  it("misma pista re-apuntada: reinicia desde 0 SIN churn de URLs", async () => {
    const f = makePlayer();
    f.assignments.trabajo = "t1";

    await f.player.retargetToPhase(phaseOf("trabajo", 0));
    f.element.currentTime = 23;
    await f.player.retargetToPhase(phaseOf("trabajo", 2));

    expect(f.element.srcSets).toEqual(["blob:t1"]); // un solo src
    expect(f.element.currentTime).toBe(0);
    expect(f.element.playCalls).toBe(2);
    expect(f.getObjectUrl).toHaveBeenCalledTimes(1); // sin re-fetch
    expect(f.revoked).toEqual([]);
  });

  it("EXACTAMENTE una URL activa tras N swaps (contrato REFACTOR U11)", async () => {
    const f = makePlayer();
    f.assignments.trabajo = "t1";
    f.assignments.descanso = "t2";
    f.assignments.preparacion = "t3";

    await f.player.retargetToPhase(phaseOf("preparacion", 0));
    await f.player.retargetToPhase(phaseOf("trabajo", 1));
    await f.player.retargetToPhase(phaseOf("descanso", 2));

    const activadas = ["blob:t3", "blob:t1", "blob:t2"];
    expect(f.revoked).toEqual(activadas.slice(0, -1)); // todas menos la vigente
    expect(f.element.src).toBe("blob:t2");
  });
});

describe("pause/resume/stop — posición y liberación", () => {
  it("pausa y reanudación preservan la posición del elemento (nativa)", async () => {
    const f = makePlayer();
    f.assignments.trabajo = "t1";
    await f.player.retargetToPhase(phaseOf("trabajo", 0));
    f.element.currentTime = 12.5; // llevaba 12.5 s

    f.player.pauseMusic();
    f.player.resumeMusic();

    expect(f.element.pauseCalls).toBe(1);
    expect(f.element.playCalls).toBe(2);
    expect(f.element.srcSets).toEqual(["blob:t1"]); // sin swap ni reinicio
    expect(f.element.currentTime).toBe(12.5); // posición intacta
    expect(f.revoked).toEqual([]);
  });

  it("stopMusic libera la URL y es seguro llamarlo de nuevo (disconnect-safe)", async () => {
    const f = makePlayer();
    f.assignments.trabajo = "t1";
    await f.player.retargetToPhase(phaseOf("trabajo", 0));

    f.player.stopMusic();
    f.player.stopMusic(); // idempotente

    expect(f.element.pauseCalls).toBeGreaterThanOrEqual(1);
    expect(f.revoked).toEqual(["blob:t1"]);
    expect(f.element.removedAttributes).toContain("src");
  });

  it("pausa/reanudación sin sesión de reproducción son no-ops inofensivos", () => {
    const f = makePlayer();

    expect(() => {
      f.player.pauseMusic();
      f.player.resumeMusic();
      f.player.stopMusic();
    }).not.toThrow();
    expect(f.element.playCalls).toBe(0);
  });
});

describe("degradación — sin elemento, sin IndexedDB, carreras", () => {
  it("sin <audio> (createElement null): todo es no-op, nunca lanza", async () => {
    const wireElement = vi.fn();
    const player = createMusicPlayer({
      createElement: () => null,
      wireElement,
      store: { getObjectUrl: vi.fn(async () => "blob:x") },
      getAssignment: () => "t1",
    });

    await expect(player.retargetToPhase(phaseOf("trabajo"))).resolves.toBeUndefined();
    expect(() => {
      player.pauseMusic();
      player.resumeMusic();
      player.stopMusic();
    }).not.toThrow();
    expect(wireElement).not.toHaveBeenCalled();
  });

  it("pista huérfana (getObjectUrl rechaza) → silencio sin crash", async () => {
    const f = makePlayer({
      getObjectUrl: vi.fn(async () => {
        throw new Error("Pista no encontrada");
      }),
    });
    f.assignments.trabajo = "borrada";

    await expect(
      f.player.retargetToPhase(phaseOf("trabajo")),
    ).resolves.toBeUndefined();

    expect(f.element.playCalls).toBe(0);
    expect(f.element.pauseCalls).toBeGreaterThanOrEqual(1); // se aseguró el silencio
    f.player.resumeMusic();
    expect(f.element.playCalls).toBe(0); // sin URL activa no hay nada que reanudar
  });

  it("carrera: un retarget tardío NO pisa al vigente (su URL se revoca)", async () => {
    let resolverT1!: (url: string) => void;
    const slowT1 = vi.fn(
      (id: TrackId) =>
        new Promise<string>((resolve) => {
          if (id === "t1") resolverT1 = resolve;
          else resolve(`blob:${id}`);
        }),
    );
    const f = makePlayer({ getObjectUrl: slowT1 });
    f.assignments.trabajo = "t1";
    f.assignments.descanso = "t2";

    const lenta = f.player.retargetToPhase(phaseOf("trabajo", 0)); // lenta
    await f.player.retargetToPhase(phaseOf("descanso", 1)); // rápida gana
    resolverT1("blob:t1"); // la lenta llega tarde
    await lenta;

    expect(f.element.srcSets).toEqual(["blob:t2"]); // el tardío no pisó
    expect(f.element.playCalls).toBe(1);
    expect(f.revoked).toEqual(["blob:t1"]); // su URL se revoca al descartarse
  });
});

describe("grafo §6.3 — elemento de larga vida cableado UNA vez", () => {
  it("createMediaElementSource → duckGain una sola vez, aunque haya N retargets", async () => {
    const element = stubAudioElement();
    const assignments: Record<string, TrackId | null> = {
      trabajo: "t1",
      descanso: "t2",
    };
    const player = createMusicPlayer({
      createElement: () => element,
      // Cableado POR DEFECTO: getAudioContext/duckGain reales sobre el stub.
      store: { getObjectUrl: vi.fn(async (id: TrackId) => `blob:${id}`) },
      getAssignment: (kind) => assignments[kind] ?? null,
    });

    await player.retargetToPhase(phaseOf("trabajo", 0));
    await player.retargetToPhase(phaseOf("descanso", 1));
    await player.retargetToPhase(phaseOf("trabajo", 2));

    const ctx = audioHolder.ctx!;
    expect(ctx.mediaElementSources).toHaveLength(1); // cableado UNA vez
    const source = ctx.mediaElementSources[0];
    expect(source.element).toBe(element); // el MISMO elemento de larga vida
    const duckGain = ctx.gains.find((g) =>
      g.connectedTo.includes(ctx.destination),
    );
    expect(duckGain).toBeDefined();
    expect(source.connectedTo).toEqual([duckGain]);
  });

  it("sin Web Audio el cableado se omite y el elemento sigue siendo útil (degradación)", async () => {
    audioHolder.ctx = null;
    const element = stubAudioElement();
    const player = createMusicPlayer({
      createElement: () => element,
      store: { getObjectUrl: vi.fn(async (id: TrackId) => `blob:${id}`) },
      getAssignment: () => "t1",
    });

    await expect(
      player.retargetToPhase(phaseOf("trabajo")),
    ).resolves.toBeUndefined();

    expect(element.playCalls).toBe(1); // suena directo, sin grafo de ducking
    expect(element.loop).toBe(true);
  });
});
