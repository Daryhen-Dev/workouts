// Cableado de badging del ciclo de sesión (U13 B2 — diseño §8.4, spec pwa
// «Badge lifecycle on Chromium» / «No badge elsewhere»). UN badge mientras la
// sesión vive (running Y paused — el MAY de distinguir la pausa NO se usa);
// completada o descartada → cleared; desmontaje sin badge huérfano. Sin
// Badging API la sesión es idéntica (skip silently). Integración sobre el
// SessionController REAL + fake de navigator compartido (patrón B1).
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeClock,
  systemClock,
  type Clock,
  type FakeClock,
} from "@/lib/timer/clock";
import { SESSION_STATUS, type SessionConfig } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/sessionStore";
import { installBadgingFake } from "@/test/fakes";

// El controlador navega (completado → /resumen; descarte → inicio) — mock del router.
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

/** Monta el controlador REAL corriendo (sin badging fake no habría badge). */
function mountRunning(clock: FakeClock) {
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  return render(<SessionController />);
}

/** Cruza una frontera de fase: avanza el reloj y refresca la vista. */
function crossTo(clock: FakeClock, ms: number) {
  act(() => {
    clock.set(ms);
    useSessionStore.getState().refreshView();
  });
}

let badging: ReturnType<typeof installBadgingFake>;

beforeEach(() => {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  badging = installBadgingFake();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useBadgingDriver — ciclo de vida de la sesión (B2)", () => {
  it("arranque: UN badge por defecto (sin argumento — sin marcador de pausa)", () => {
    mountRunning(createFakeClock(0));

    expect(badging.setCalls).toEqual([undefined]);
    expect(badging.clearCalls).toBe(0);
  });

  it("pausa/reanudación y churn del ticker: el badge SIGUE sin churn (ni re-set ni clear)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => useSessionStore.getState().pause());
    for (let i = 0; i < 3; i += 1) useSessionStore.getState().refreshView();
    expect(useSessionStore.getState().view!.status).toBe(SESSION_STATUS.paused);
    expect(badging.setCalls).toEqual([undefined]); // el MISMO badge sigue
    expect(badging.clearCalls).toBe(0); // la pausa NO limpia
    act(() => useSessionStore.getState().resume());
    for (let i = 0; i < 3; i += 1) useSessionStore.getState().refreshView();

    expect(badging.setCalls).toEqual([undefined]); // sin re-set
    expect(badging.clearCalls).toBe(0);
  });

  it("completada: el badge se limpia exactamente una vez", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    crossTo(clock, 100_000); // suspendida más allá del fin → completada
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );

    expect(badging.setCalls).toEqual([undefined]);
    expect(badging.clearCalls).toBe(1);
  });

  it("descarte confirmado: el badge se limpia", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    crossTo(clock, 10_000); // frontera real: el badge sigue

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(useSessionStore.getState().view).toBeNull();

    expect(badging.setCalls).toEqual([undefined]);
    expect(badging.clearCalls).toBe(1);
  });

  it("desmontaje con sesión viva: el badge se limpia (sin badge huérfano)", () => {
    const clock = createFakeClock(0);
    const view = mountRunning(clock);
    expect(badging.clearCalls).toBe(0);

    view.unmount();

    expect(badging.clearCalls).toBe(1);
    expect(badging.setCalls).toEqual([undefined]); // jamás un re-set
  });

  it("sin Badging API la sesión completa igualmente (no badge elsewhere)", () => {
    vi.unstubAllGlobals(); // navigator jsdom real: sin Badging (Firefox/Safari)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const clock = createFakeClock(0);
    mountRunning(clock);

    crossTo(clock, 100_000);
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
