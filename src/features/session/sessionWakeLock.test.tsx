// Cableado Wake Lock del ciclo de sesión (U13 A2b — diseño §8.4, spec pwa
// «Wake Lock During Active Workout»). Traducción de estado de sesión →
// adaptador A1 REAL + fake de plataforma compartido (A2a): running/paused
// adquiere, retorno visible re-adquiere vía la señal de re-programación
// existente, completado/descarte/desmontaje sueltan. Sin Wake Lock la sesión
// sigue completa (skip silently). Las carreras de plataforma son de A1: aquí
// SOLO la traducción del ciclo de vida.
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
import { installWakeLockFake } from "@/test/fakes";

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

/** Simula el cambio de visibilidad del documento y dispara el evento. */
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Espera a que corran las microtareas (resolución del adaptador A1). */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Monta el controlador REAL corriendo y resuelve la petición inicial. */
async function mountHolding(clock: FakeClock) {
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  render(<SessionController />);
  const { requests } = wake;
  await act(async () => {
    requests[0].resolve();
    await flush();
  });
  return requests;
}

let wake: ReturnType<typeof installWakeLockFake>;

beforeEach(() => {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  setVisibility("visible");
  wake = installWakeLockFake();
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

describe("useWakeLockDriver — ciclo de vida de la sesión (A2b)", () => {
  it("sesión corriendo en primer plano: adquiere el lock al montar", async () => {
    const requests = await mountHolding(createFakeClock(0));

    expect(requests).toHaveLength(1);
    expect(requests[0].type).toBe("screen");
    expect(requests[0].sentinel.releaseCalls).toBe(0); // retenido
  });

  it("pausa retiene el lock y reanudar no genera peticiones nuevas", async () => {
    const clock = createFakeClock(0);
    const requests = await mountHolding(clock);

    act(() => useSessionStore.getState().pause());
    expect(requests).toHaveLength(1);
    expect(requests[0].sentinel.releaseCalls).toBe(0); // pausada ∈ sesión: retiene

    act(() => useSessionStore.getState().resume());
    expect(requests).toHaveLength(1); // sin churn: ya retenido
    expect(requests[0].sentinel.releaseCalls).toBe(0);
  });

  it("retorno visible tras soltar el SO: re-adquiere con la señal existente", async () => {
    const clock = createFakeClock(0);
    const requests = await mountHolding(clock);

    act(() => setVisibility("hidden"));
    act(() => requests[0].sentinel.dispatchOsRelease()); // oculto → A1 difiere
    expect(requests).toHaveLength(1);

    act(() => setVisibility("visible")); // señal de re-programación 0→1
    expect(requests).toHaveLength(2);
    await act(async () => {
      requests[1].resolve();
      await flush();
    });
    expect(requests[1].sentinel).not.toBe(requests[0].sentinel);
    expect(requests[1].sentinel.releaseCalls).toBe(0); // nuevo lock retenido
  });

  it("completada: suelta el lock retenido", async () => {
    const clock = createFakeClock(0);
    const requests = await mountHolding(clock);

    act(() => {
      clock.advance(100_000);
      useSessionStore.getState().refreshView();
    });
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].sentinel.releaseCalls).toBe(1); // soltado UNA vez
  });

  it("descarte confirmado: suelta el lock retenido", async () => {
    const clock = createFakeClock(0);
    const requests = await mountHolding(clock);

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(useSessionStore.getState().view).toBeNull();
    expect(requests).toHaveLength(1);
    expect(requests[0].sentinel.releaseCalls).toBe(1);
  });

  it("desmontaje suelta; un remontaje fresco puede adquirir de nuevo", async () => {
    const clock = createFakeClock(0);
    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    const { unmount } = render(<SessionController />);
    const { requests } = wake;
    await act(async () => {
      requests[0].resolve();
      await flush();
    });

    unmount(); // dispose(): suelta y desactiva ese controlador
    expect(requests[0].sentinel.releaseCalls).toBe(1);

    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    render(<SessionController />);
    expect(requests).toHaveLength(2); // controlador FRESCO: acquire de nuevo
    await act(async () => {
      requests[1].resolve();
      await flush();
    });
    expect(requests[1].sentinel.releaseCalls).toBe(0);
  });

  it("sin navigator.wakeLock la sesión completa igualmente (skip silently)", () => {
    vi.unstubAllGlobals(); // navigator jsdom real: sin wakeLock
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const clock = createFakeClock(0);
    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    render(<SessionController />);

    act(() => {
      clock.advance(100_000);
      useSessionStore.getState().refreshView();
    });
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
