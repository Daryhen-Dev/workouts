// Store de sesión (U7, tasks.md) — reemplaza el seam U5 por el store zustand
// real: envoltura del motor U4 con vista cacheada y reloj inyectado. Los tests
// afirman el mapeo 1:1 con las funciones del motor y que NO hay persistencia
// (diseño §4.1: sessionStore es efímero).
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeClock,
  systemClock,
  type Clock,
  type FakeClock,
} from "@/lib/timer/clock";
import {
  computeView,
  pauseSession,
  resumeSession,
  startSession,
} from "@/lib/timer/engine";
import { SESSION_STATUS, type SessionConfig } from "@/lib/timer/types";

import { useSessionStore, type SessionCompletionData } from "./sessionStore";

/** FakeClock es un objeto con now/advance/set; el store pide `Clock` (función). */
function asClock(fake: FakeClock): Clock {
  return () => fake.now();
}

/** Clásico del spec: preparación 10, trabajo 30, descanso 15, 2 rondas → 85 s. */
const CLASICO_85: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

/** Resetea el store al estado inicial (efímero: sin sesión, sin seam). */
function resetStore() {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
}

beforeEach(() => {
  resetStore();
});

describe("sessionStore — start mapea 1:1 al motor con reloj inyectado", () => {
  it("start(config, clock) produce exactamente startSession + computeView con ese reloj", () => {
    const clock = createFakeClock(1_000);
    useSessionStore.getState().start(CLASICO_85, asClock(clock));

    const { state, view } = useSessionStore.getState();
    expect(state).toEqual(startSession(CLASICO_85, 1_000));
    expect(view).toEqual(computeView(state!, 1_000));
    expect(state!.status).toBe(SESSION_STATUS.running);
    expect(view!.phase?.kind).toBe("preparacion");
    expect(view!.remainingMs).toBe(10_000);
  });

  it("start sin reloj usa systemClock (Date.now)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(123_456);
    try {
      useSessionStore.getState().start(CLASICO_85);
      const { state, view } = useSessionStore.getState();
      expect(state!.runningSince).toBe(123_456);
      expect(view!.phase?.kind).toBe("preparacion");
    } finally {
      vi.useRealTimers();
    }
  });

  it("start con una sesión en curso la reemplaza (reinicio)", () => {
    const clock = createFakeClock(0);
    useSessionStore.getState().start(CLASICO_85, asClock(clock));
    clock.advance(5_000);
    useSessionStore
      .getState()
      .start(
        {
          mode: "clasico",
          values: { preparacionS: 5, trabajoS: 20, descansoS: 10, rondas: 1 },
        },
        asClock(clock),
      );
    const { state } = useSessionStore.getState();
    expect(state!.totalActiveMs).toBe(25_000); // 5+20 — plan nuevo, no el anterior
  });
});

describe("sessionStore — pause/resume mapean 1:1 al motor", () => {
  it("pause pliega now − runningSince (identidad con pauseSession) y congela la vista", () => {
    const clock = createFakeClock(0);
    useSessionStore.getState().start(CLASICO_85, asClock(clock));
    clock.advance(15_000);

    const before = useSessionStore.getState().state!;
    useSessionStore.getState().pause();
    const expected = pauseSession(before, 15_000);

    const { state, view } = useSessionStore.getState();
    expect(state).toEqual(expected);
    expect(state!.status).toBe(SESSION_STATUS.paused);
    expect(view!.status).toBe(SESSION_STATUS.paused);

    // Congelada: el reloj avanza 60 s y la vista no cambia.
    clock.advance(60_000);
    useSessionStore.getState().refreshView();
    const frozen = useSessionStore.getState().view!;
    expect(frozen.remainingMs).toBe(view!.remainingMs);
    expect(frozen.status).toBe(SESSION_STATUS.paused);
  });

  it("resume re-ancla runningSince (identidad con resumeSession)", () => {
    const clock = createFakeClock(0);
    useSessionStore.getState().start(CLASICO_85, asClock(clock));
    clock.advance(15_000);
    useSessionStore.getState().pause();
    clock.advance(45_000);

    const before = useSessionStore.getState().state!;
    useSessionStore.getState().resume();
    const { state, view } = useSessionStore.getState();
    expect(state).toEqual(resumeSession(before, 60_000));
    expect(state!.status).toBe(SESSION_STATUS.running);
    // El tiempo de pausa no cuenta: 15 s activos → 5 s de preparación restantes…
    // no: 15 s activos ya está en trabajo (10 s de preparación consumidos) → 25 s restantes.
    expect(view!.phase?.kind).toBe("trabajo");
    expect(view!.remainingMs).toBe(25_000);
  });

  it("las no-ops del motor se preservan: pausar dos veces no acumula", () => {
    const clock = createFakeClock(0);
    useSessionStore.getState().start(CLASICO_85, asClock(clock));
    clock.advance(5_000);
    useSessionStore.getState().pause();
    const afterFirst = useSessionStore.getState().state;
    clock.advance(30_000);
    useSessionStore.getState().pause(); // no-op del motor
    expect(useSessionStore.getState().state).toBe(afterFirst);
  });
});

describe("sessionStore — refreshView y stop", () => {
  it("refreshView recompute la vista cacheada con el reloj actual", () => {
    const clock = createFakeClock(0);
    useSessionStore.getState().start(CLASICO_85, asClock(clock));
    expect(useSessionStore.getState().view!.remainingMs).toBe(10_000);

    clock.advance(7_000);
    // Sin refresh la vista cacheada sigue vieja…
    expect(useSessionStore.getState().view!.remainingMs).toBe(10_000);
    useSessionStore.getState().refreshView();

    const { state, view } = useSessionStore.getState();
    expect(view).toEqual(computeView(state!, 7_000));
    expect(view!.remainingMs).toBe(3_000);
  });

  it("refreshView sin sesión es un no-op (nunca lanza)", () => {
    expect(() => useSessionStore.getState().refreshView()).not.toThrow();
    expect(useSessionStore.getState().view).toBeNull();
  });

  it("stop descarta la sesión: estado y vista a null", () => {
    const clock = createFakeClock(0);
    useSessionStore.getState().start(CLASICO_85, asClock(clock));
    clock.advance(3_000);
    useSessionStore.getState().pause();

    useSessionStore.getState().stop();
    const { state, view } = useSessionStore.getState();
    expect(state).toBeNull();
    expect(view).toBeNull();
  });
});

describe("sessionStore — efímero (diseño §4.1: NUNCA persistido)", () => {
  it("ninguna acción escribe en localStorage", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const store = useSessionStore.getState();
    const clock = createFakeClock(0);
    store.start(CLASICO_85, asClock(clock));
    clock.advance(1_000);
    store.pause();
    store.resume();
    store.refreshView();
    store.stop();

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    setItem.mockRestore();
  });
});

describe("sessionStore — seam de completado para U8", () => {
  it("setOnComplete registra el callback que el controlador disparará", () => {
    const seen: SessionCompletionData[] = [];
    useSessionStore.getState().setOnComplete((data) => seen.push(data));
    expect(useSessionStore.getState().onComplete).toBeTypeOf("function");
    // La ejecución real (exactly-once) es del observador del controlador (U7 tests de componente).
  });
});
