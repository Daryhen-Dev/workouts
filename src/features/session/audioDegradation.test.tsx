// Degradación e2e (U10 — spec audio: «No Web Audio, no failure»).
//
// SIN MOCKS de audio: el entorno jsdom/Node no define AudioContext (verificado)
// y el test lo borra explícitamente por si una dependencia futura lo define.
// Una sesión Clásico COMPLETA corre con el cableado de audio real del
// SessionController: pausa (cancela), reanudación (re-programa), visibilidad y
// completado — todo debe ser no-op silencioso y la sesión termina con resumen
// y exactamente UNA entrada de historial. Sin crash.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeClock,
  systemClock,
  type Clock,
  type FakeClock,
} from "@/lib/timer/clock";
import { SESSION_STATUS, type SessionConfig } from "@/lib/timer/types";
import { HISTORY_STORAGE_KEY, useHistoryStore } from "@/stores/historyStore";
import { useSessionStore } from "@/stores/sessionStore";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

import { SessionController } from "./SessionController";

/** Clásico del spec: prep 10, trabajo 30, descanso 15, 2 rondas → 85 s. */
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

beforeEach(() => {
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  useHistoryStore.setState({ entries: [] });
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  // Estado del spec: Web Audio NO disponible en el dispositivo.
  delete (globalThis as { AudioContext?: unknown }).AudioContext;
  mocks.replace.mockClear();
  mocks.push.mockClear();
});

afterEach(() => {
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

describe("sin Web Audio: la sesión completa no depende del audio (spec audio)", () => {
  it("85 s con pausa, retorno de visibilidad y descarte-cancelación: completada, UNA entrada, /resumen, sin crash", () => {
    const clock = createFakeClock(0);
    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    render(<SessionController />);

    // Corre la preparación y parte del trabajo…
    act(() => clock.advance(20_000));
    // …pausa y reanuda (cancelación + re-programación de cues sobre contexto null)
    act(() => {
      useSessionStore.getState().pause();
    });
    act(() => clock.advance(30_000)); // pausada: no consume
    act(() => {
      useSessionStore.getState().resume();
    });
    // Fondo + retorno (re-anclaje de cues + resume sobre contexto null)
    act(() => setVisibility("hidden"));
    act(() => {
      clock.advance(65_000); // 20 + 65 = 85 s activos → completada en suspensión
      setVisibility("visible");
    });

    // Completada naturalmente: sin crash, con resumen y EXACTAMENTE una entrada.
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );
    const entries = useHistoryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].mode).toBe("clasico");
    expect(entries[0].rounds).toBe(2);
    expect(entries[0].activeDurationMs).toBe(85_000); // la pausa de 30 s queda fuera
    expect(mocks.replace).toHaveBeenCalledWith("/resumen");

    // La pantalla de sesión completada sigue renderizando (controles fuera).
    expect(screen.getByText("Sesión completada")).toBeInTheDocument();
  });

  it("detener a mitad de sesión sin audio: descarte limpio, sin entrada, sin crash", () => {
    const clock = createFakeClock(0);
    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    render(<SessionController />);

    act(() => clock.advance(15_000));
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(useSessionStore.getState().state).toBeNull();
    expect(useHistoryStore.getState().entries).toHaveLength(0);
    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(mocks.replace).not.toHaveBeenCalledWith("/resumen");
  });
});
