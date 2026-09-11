// Cableado de audio del SessionController (U10 — diseño §6.3).
//
// Dispara el orquestador REAL (SessionController + beepSynth real) contra un
// AudioContext falso: solo el módulo `@/lib/audio/context` se mockea (jsdom no
// tiene Web Audio) para entregar el stub. Las aserciones cruzan el seam
// store/controlador → planificador puro → sintetizador → reloj del contexto:
// tiempos EXACTOS de blip por fase, cancelación en pausa, re-programación en
// reanudación y retorno de visibilidad (descartando el pasado), y silencio
// total al descartar la sesión.
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
const mocks = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

// Entorno de audio bajo control del test: stub o null (sin Web Audio).
// resumeIfSuspended se espiá para verificar los disparadores §6.1.
const audioHolder = vi.hoisted(() => ({
  ctx: null as StubAudioContext | null,
  resumeIfSuspended: null as null | (() => Promise<void>),
}));
vi.mock("@/lib/audio/context", () => ({
  getAudioContext: () => audioHolder.ctx,
  resumeIfSuspended: () => audioHolder.resumeIfSuspended!(),
}));

import { BEEP } from "@/lib/audio/cues";
import { cancelScheduledCues } from "@/lib/audio/beepSynth";
import { SessionController } from "./SessionController";

/** Clásico del spec: prep[0,10) t[10,40) d[40,55) t[55,85) → 85 s. */
const CLASICO_85: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

const TRANSITION_GAP_S = (BEEP.blipDurationMs + BEEP.transitionGapMs) / 1000;

function asClock(fake: FakeClock): Clock {
  return () => fake.now();
}

/** Simula el cambio de visibilidad del documento y dispara el evento. */
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Arranca la sesión con FakeClock y monta el controlador completo. */
function mountRunning(clock: FakeClock, startAt = 0) {
  clock.set(startAt);
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  render(<SessionController />);
}

function blipStarts(): number[] {
  return (audioHolder.ctx?.blips() ?? []).map((b) => b.startedAt);
}

beforeEach(() => {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  audioHolder.ctx = stubAudioContext(100); // reloj del contexto: 100 s
  audioHolder.resumeIfSuspended = vi.fn(async () => {});
  mocks.replace.mockClear();
  mocks.push.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  cancelScheduledCues(); // limpia pendientes del módulo entre tests
  audioHolder.ctx = null;
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

describe("cableado de cues — disparadores §6.3 a través del orquestador", () => {
  it("arrancar la sesión programa los cues de la primera fase en el reloj del contexto", () => {
    mountRunning(createFakeClock(0));

    // prep 10 s: countdown a 7/8/9 s + transición en 10 s (doble blip).
    expect(blipStarts()).toEqual([107, 108, 109, 110, 110 + TRANSITION_GAP_S]);
    const freqs = audioHolder.ctx!.blips().map((b) => b.frequencyHz);
    expect(freqs).toEqual([
      BEEP.countdownFrequencyHz,
      BEEP.countdownFrequencyHz,
      BEEP.countdownFrequencyHz,
      BEEP.transitionFrequencyHz,
      BEEP.transitionFrequencyHz,
    ]);
  });

  it("el arranque intenta resumeIfSuspended (§6.1: creación en ruta de gesto)", () => {
    mountRunning(createFakeClock(0));

    expect(audioHolder.resumeIfSuspended).toHaveBeenCalled();
  });

  it("pausar cancela TODOS los beeps pendientes (§6.3: no se deben beeps en pausa)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => useSessionStore.getState().pause());

    const blips = audioHolder.ctx!.blips();
    expect(blips).toHaveLength(5);
    for (const blip of blips) expect(blip.canceled).toBe(true);
    for (const gain of audioHolder.ctx!.gains) {
      expect(gain.disconnectCalls).toBe(1);
    }
  });

  it("reanudar re-programa desde el ancla recomputado (transcurrido congelado)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => {
      clock.advance(4_000);
      useSessionStore.getState().pause();
    });
    act(() => clock.advance(30_000)); // pausada: no consume
    audioHolder.ctx!.advanceTime(30); // el contexto corrió en tiempo real
    act(() => useSessionStore.getState().resume());

    // elapsed sigue en 4000 ms: cues 7/8/9/10 desde base 130 → 133/134/135/136.
    const blips = audioHolder.ctx!.blips();
    expect(blips.slice(5).map((b) => b.startedAt)).toEqual([
      133,
      134,
      135,
      136,
      136 + TRANSITION_GAP_S,
    ]);
    // los de antes de la pausa quedaron cancelados; los nuevos no.
    for (const blip of blips.slice(0, 5)) expect(blip.canceled).toBe(true);
    for (const blip of blips.slice(5)) expect(blip.canceled).toBe(false);
  });

  it("cruzar una frontera de fase programa los cues de la fase entrante", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => {
      clock.advance(10_500); // 500 ms dentro del primer trabajo (evita la frontera exacta)
      useSessionStore.getState().refreshView();
    });

    // trabajo[10,40): countdown a 37/38/39 s + transición 40 s; elapsed 10_500
    // → deltas 26.5/27.5/28.5/29.5 s desde base 100.
    const blips = audioHolder.ctx!.blips();
    expect(blips.slice(5).map((b) => b.startedAt)).toEqual([
      126.5,
      127.5,
      128.5,
      129.5,
      129.5 + TRANSITION_GAP_S,
    ]);
    for (const blip of blips.slice(0, 5)) expect(blip.canceled).toBe(true);
  });

  it("retorno de visibilidad a mitad de fase re-programa descartando lo pasado", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => setVisibility("hidden"));
    act(() => {
      clock.advance(8_000); // 8 s fuera: prep con 2 s restantes
      setVisibility("visible");
    });

    // Recomputado: elapsed 8000 → cue 7000 pasado, cue 8000 == ahora → ambos fuera.
    // Quedan 9 y 10 s → base 100 → 101/102 + transición 102(+gap).
    const blips = audioHolder.ctx!.blips();
    expect(blips.slice(5).map((b) => b.startedAt)).toEqual([
      101,
      102,
      102 + TRANSITION_GAP_S,
    ]);
    for (const blip of blips.slice(0, 5)) expect(blip.canceled).toBe(true);
  });

  it("el ticker cosmético NO re-programa: los beeps ya viven en el reloj del contexto", () => {
    vi.useFakeTimers();
    mountRunning(createFakeClock(0));

    act(() => vi.advanceTimersByTime(1_000)); // 4 ticks de 250 ms

    expect(blipStarts()).toEqual([107, 108, 109, 110, 110 + TRANSITION_GAP_S]); // exactamente la primera programación: sin cancelar ni duplicar
    expect(audioHolder.ctx!.blips().every((b) => !b.canceled)).toBe(true);
  });

  it("completar NO cancela: el cue de transición final ya programado sigue sonando", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => setVisibility("hidden"));
    act(() => {
      clock.advance(90_000); // la sesión termina mientras está suspendida
      setVisibility("visible");
    });

    // Vista completada: no se programa nada nuevo ni se corta lo pendiente.
    expect(useSessionStore.getState().view!.status).toBe("completed");
    const blips = audioHolder.ctx!.blips();
    expect(blips).toHaveLength(5); // solo la primera fase se llegó a programar
    for (const blip of blips) expect(blip.canceled).toBe(false);
  });

  it("detener confirmado silencia todo (descarte ⇒ cancelación total)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    const blips = audioHolder.ctx!.blips();
    expect(blips).toHaveLength(5);
    for (const blip of blips) expect(blip.canceled).toBe(true);
  });
});
