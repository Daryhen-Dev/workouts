// Cableado de vibración del ciclo de sesión (U13 B1 — diseño §8.4, spec pwa
// «Vibration on Phase Transitions»). La vibración se dispara UNA vez por
// transición REAL del índice de fase — jamás al montar, en pausa/reanudación,
// en churn del ticker, al completar (null) ni al descartar — y va EMPAREJADA
// al destello visual de transición (mismo tick del orquestador). Sin
// Vibration API la sesión sigue completa (skip silently). Integración sobre
// el SessionController REAL + fake de navigator compartido (B1).
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRANSITION_PATTERN } from "@/lib/pwa/vibration";
import {
  createFakeClock,
  systemClock,
  type Clock,
  type FakeClock,
} from "@/lib/timer/clock";
import { SESSION_STATUS, type SessionConfig } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/sessionStore";
import { installVibrationFake } from "@/test/fakes";

// El controlador navega (guarda → inicio; descarte → inicio) — mock del router.
const mocks = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

import { SessionController } from "./SessionController";

/** Clásico del spec: preparación 10, trabajo 30, descanso 15, 2 rondas → 85 s. */
const CLASICO_85: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

function asClock(fake: FakeClock): Clock {
  return () => fake.now();
}

/** Monta el controlador REAL corriendo (sin wakeLock fake: no-op silencioso). */
function mountRunning(clock: FakeClock) {
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  render(<SessionController />);
}

/** Cruza una frontera de fase: avanza el reloj y refresca la vista. */
function crossTo(clock: FakeClock, ms: number) {
  act(() => {
    clock.set(ms);
    useSessionStore.getState().refreshView();
  });
}

let vibration: ReturnType<typeof installVibrationFake>;

beforeEach(() => {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  vibration = installVibrationFake();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useVibrationDriver — ciclo de vida de la sesión (B1)", () => {
  it("primer montaje con sesión en fase 0: NINGUNA vibración", () => {
    mountRunning(createFakeClock(0));

    expect(vibration.patterns).toEqual([]);
  });

  it("una frontera de fase: EXACTAMENTE una vibración, emparejada al destello visual", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    crossTo(clock, 10_000); // preparación → trabajo

    expect(vibration.patterns).toEqual([TRANSITION_PATTERN]);
    expect(document.querySelector('section[data-flashing="true"]')).not.toBeNull();
  });

  it("fronteras sucesivas: una vibración POR transición (10→40→55 s)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    crossTo(clock, 10_000);
    expect(vibration.patterns).toHaveLength(1);
    crossTo(clock, 40_000);
    expect(vibration.patterns).toHaveLength(2);
    crossTo(clock, 55_000);
    expect(vibration.patterns).toHaveLength(3);
    expect(vibration.patterns).toEqual([
      TRANSITION_PATTERN,
      TRANSITION_PATTERN,
      TRANSITION_PATTERN,
    ]);
  });

  it("pausa/reanudación y churn del ticker NO vibran; la frontera tras reanudar sí", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => useSessionStore.getState().pause());
    for (let i = 0; i < 3; i += 1) useSessionStore.getState().refreshView();
    act(() => {
      clock.set(25_000);
      useSessionStore.getState().refreshView();
    }); // tiempo pausado: ni consume ni vibra
    act(() => useSessionStore.getState().resume());
    for (let i = 0; i < 3; i += 1) useSessionStore.getState().refreshView();

    expect(vibration.patterns).toEqual([]); // pausa/reanudación/churn: silencio

    crossTo(clock, 40_000); // la frontera real, tras reanudar
    expect(vibration.patterns).toEqual([TRANSITION_PATTERN]);
  });

  it("completada (phase null): ninguna vibración extra", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    crossTo(clock, 100_000); // suspendida más allá del fin → completada
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );
    expect(vibration.patterns).toEqual([]); // null NO es transición
  });

  it("descarte confirmado: ninguna vibración extra", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    crossTo(clock, 10_000); // transición real: UNA vibración
    expect(vibration.patterns).toEqual([TRANSITION_PATTERN]);
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(useSessionStore.getState().view).toBeNull();
    expect(vibration.patterns).toEqual([TRANSITION_PATTERN]); // sin extra
  });

  it("sin navigator.vibrate la sesión completa igualmente (skip silently)", () => {
    vi.unstubAllGlobals(); // navigator jsdom real: sin vibrate (iOS)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const clock = createFakeClock(0);
    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    render(<SessionController />);

    crossTo(clock, 10_000);
    crossTo(clock, 100_000);
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
