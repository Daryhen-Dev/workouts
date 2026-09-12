// Cableado de música del SessionController (U11 — diseño §6.3).
//
// Dispara el orquestador REAL contra un musicPlayer ESPIADO (vi.mock del
// módulo): las aserciones cruzan el seam store/controlador → jugador. El
// contexto de audio sigue stubbeado (patrón sessionAudio.test) para que el
// duckGain REAL programe la automatización de ducking sobre el stub — el
// emparejamiento cue↔duck es estructural (mismo disparador, mismo ancla).
//
// Especificación bajo prueba (audio «Per-Phase Music Playback» +
// timer-correctness «Music follows the recomputed phase»):
// - loop: la pista sigue sonando dentro de la fase (el controlador NO re-apunta);
// - transición: el cambio de fase re-apunta (saliente para, entrante desde 0);
// - pausa/reanudación con el temporizador (posición preservada: resume, no retarget);
// - suspensión: al volver a la visibilidad se re-apunta a la fase RECOMPUTADA;
//   completada en suspensión → camino de completado (la música se detiene);
// - descarte → la música se detiene y la URL se libera;
// - los beeps de cuenta abajo bajan y restauran la ganancia de la música (duck).
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeClock,
  systemClock,
  type Clock,
  type FakeClock,
} from "@/lib/timer/clock";
import type { SessionConfig } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/sessionStore";
import { stubAudioContext, type StubAudioContext } from "@/test/fakes";

// El controlador navega (guarda → inicio) — mock del router.
const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  // Espías del jugador (módulo entero): el cableado del controlador los llama.
  retarget: vi.fn<
    (phase: { kind: string; index: number }) => Promise<void>
  >(async () => {}),
  pauseMusic: vi.fn(),
  resumeMusic: vi.fn(),
  stopMusic: vi.fn(),
  // Entorno de audio bajo control del test (duckGain/beepSynth reales).
  ctx: null as StubAudioContext | null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));
vi.mock("@/lib/audio/musicPlayer", () => ({
  retargetToPhase: mocks.retarget,
  pauseMusic: mocks.pauseMusic,
  resumeMusic: mocks.resumeMusic,
  stopMusic: mocks.stopMusic,
}));
vi.mock("@/lib/audio/context", () => ({
  getAudioContext: () => mocks.ctx,
  resumeIfSuspended: async () => {},
}));

import { SessionController } from "./SessionController";
import { resetDuckGainForTests } from "@/lib/audio/duckGain";

/** Clásico del spec: prep[0,10) t[10,40) d[40,55) t[55,85) → 85 s. */
const CLASICO_85: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

function asClock(fake: FakeClock): Clock {
  return () => fake.now();
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function mountRunning(clock: FakeClock, startAt = 0) {
  clock.set(startAt);
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  render(<SessionController />);
}

/** Llamadas a retarget como pares kind/index — legibles en los fallos. */
function retargetTargets(): Array<[string, number]> {
  return mocks.retarget.mock.calls.map(
    (call: [{ kind: string; index: number }]) => [call[0].kind, call[0].index],
  );
}

beforeEach(() => {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  mocks.ctx = stubAudioContext(100);
  resetDuckGainForTests(); // el singleton de duck queda ligado al ctx de ESTE test
  mocks.retarget.mockClear();
  mocks.pauseMusic.mockClear();
  mocks.resumeMusic.mockClear();
  mocks.stopMusic.mockClear();
  mocks.replace.mockClear();
  mocks.push.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
  mocks.ctx = null;
});

describe("música por fase — cableado del orquestador (§6.3)", () => {
  it("arrancar la sesión re-apunta a la fase actual (pista de su clase)", () => {
    mountRunning(createFakeClock(0));

    expect(mocks.retarget).toHaveBeenCalledTimes(1);
    expect(mocks.retarget.mock.calls[0][0]).toMatchObject({
      kind: "preparacion",
      index: 0,
    });
  });

  it("loop: dentro de la fase NO se re-apunta (la pista sigue sonando)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => {
      clock.advance(4_000); // 4 s dentro de la preparación (sin frontera)
      useSessionStore.getState().refreshView();
    });

    expect(mocks.retarget).toHaveBeenCalledTimes(1); // solo el arranque
  });

  it("cruzar una frontera de fase re-apunta a la entrante (la saliente para)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => {
      clock.advance(10_500); // dentro del primer trabajo
      useSessionStore.getState().refreshView();
    });

    expect(retargetTargets()).toEqual([
      ["preparacion", 0],
      ["trabajo", 1],
    ]);
  });

  it("pausar pausa la música; reanudar la REANUDA sin re-apuntar (posición)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => {
      clock.advance(5_000);
      useSessionStore.getState().pause();
    });
    act(() => useSessionStore.getState().resume());

    expect(mocks.pauseMusic).toHaveBeenCalledTimes(1);
    expect(mocks.resumeMusic).toHaveBeenCalledTimes(1);
    expect(mocks.retarget).toHaveBeenCalledTimes(1); // sin swap: posición intacta
  });

  it("retorno de visibilidad a mitad de fase re-apunta (la música sigue a la fase)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => setVisibility("hidden"));
    act(() => {
      clock.advance(8_000); // 8 s fuera: sigue en preparación
      setVisibility("visible");
    });

    expect(mocks.retarget).toHaveBeenCalledTimes(2);
    expect(mocks.retarget.mock.calls[1][0]).toMatchObject({
      kind: "preparacion",
      index: 0,
    });
  });

  it("suspensión que cruza fronteras: se re-apunta a la fase RECOMPUTADA", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => setVisibility("hidden"));
    act(() => {
      clock.advance(56_000); // 56 s: trabajo FINAL [55,85), index 3
      setVisibility("visible");
    });

    const ultimas = retargetTargets();
    expect(ultimas.at(-1)).toEqual(["trabajo", 3]); // fase recomputada, no la vieja
  });

  it("completada en suspensión → camino de completado: la música se detiene", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => setVisibility("hidden"));
    act(() => {
      clock.advance(90_000); // la sesión termina mientras está suspendida
      setVisibility("visible");
    });

    expect(useSessionStore.getState().view!.status).toBe("completed");
    expect(mocks.stopMusic).toHaveBeenCalled(); // URL liberada, silencio final
    expect(retargetTargets()).toEqual([["preparacion", 0]]); // nunca re-apuntó a nada tras completar
  });

  it("detener confirmado detiene la música (descarte ⇒ silencio total)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(mocks.stopMusic).toHaveBeenCalledTimes(1);
  });
});

describe("ducking — los beeps bajan y restauran la música (mismo disparador)", () => {
  it("el arranque programa la automatización del duck junto a los cues de la fase", () => {
    mountRunning(createFakeClock(0));

    const ctx = mocks.ctx!;
    // La ganancia de duck es la ÚNICA con automatización al nivel de duck (0.25)
    // — los envolventes de los beeps nunca toman ese valor.
    const duckGain = ctx.gains.find((g) =>
      g.gain.setValueAtTimeCalls.some((c) => c.value === 0.25),
    );
    expect(duckGain, "la ganancia de duck existe").toBeDefined();
    // prep 10 s desde elapsed 0, base ctx 100: baseline + ducks 0.25 y ramps 1.
    expect(duckGain!.gain.setValueAtTimeCalls).toEqual([
      { value: 1, time: 100 },
      { value: 0.25, time: 106.85 },
      { value: 0.25, time: 107.85 },
      { value: 0.25, time: 108.85 },
      { value: 0.25, time: 109.85 },
    ]);
    expect(duckGain!.gain.linearRampToValueAtTimeCalls).toEqual([
      { value: 1, time: 107.23 },
      { value: 1, time: 108.23 },
      { value: 1, time: 109.23 },
      { value: 1, time: 110.4 },
    ]);
    // Emparejamiento: los beeps de la MISMA fase existen (5 blips de prep).
    expect(ctx.blips()).toHaveLength(5);
  });
});
