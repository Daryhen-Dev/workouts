// ActiveSessionScreen (U7) — rendering del temporizador activo: etiqueta de
// fase, cuenta atrás (displaySeconds), progreso de fase, pista de siguiente y
// controles Pausar/Reanudar/Detener. El estado llega por el sessionStore real
// (relój FakeClock inyectado); la pantalla es pura presentación + acciones.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeClock, systemClock, type Clock, type FakeClock } from "@/lib/timer/clock";
import { SESSION_STATUS, type SessionConfig } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/sessionStore";

import { ActiveSessionScreen } from "./ActiveSessionScreen";

/** Clásico del spec: preparación 10, trabajo 30, descanso 15, 2 rondas → 85 s. */
const CLASICO_85: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

function asClock(fake: FakeClock): Clock {
  return () => fake.now();
}

function resetStore() {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
}

/** Arranca la sesión de 85 s con FakeClock y monta la pantalla. */
function mount(clock: FakeClock, onStopRequest = vi.fn()) {
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  render(<ActiveSessionScreen onStopRequest={onStopRequest} />);
}

beforeEach(() => {
  resetStore();
});

describe("ActiveSessionScreen — render del temporizador (spec timer-correctness)", () => {
  it("muestra la etiqueta de la fase, la cuenta atrás y el siguiente al entrar", () => {
    mount(createFakeClock(0));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Preparación");
    expect(screen.getByText("0:10")).toBeInTheDocument();
    expect(screen.getByText("Siguiente: Trabajo")).toBeInTheDocument();
  });

  it("la cuenta atrás baja al refrescar la vista (refreshView desde el store)", () => {
    const clock = createFakeClock(0);
    mount(clock);
    act(() => {
      clock.advance(7_000);
      useSessionStore.getState().refreshView();
    });
    expect(screen.getByText("0:03")).toBeInTheDocument();
  });

  it("el anillo de progreso marca avance dentro de la fase (progressbar semántico)", () => {
    const clock = createFakeClock(0);
    mount(clock);
    // Entrada de fase: 0 % recorrido.
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    act(() => {
      clock.advance(5_000);
      useSessionStore.getState().refreshView();
    });
    // 5 s de 10 s de preparación → 50 %.
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  });

  it("cambia de fase con su etiqueta y expone el kind (color por fase §9.1)", () => {
    const clock = createFakeClock(0);
    mount(clock);
    act(() => {
      clock.advance(10_000);
      useSessionStore.getState().refreshView();
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Trabajo");
    expect(screen.getByText("0:30")).toBeInTheDocument();
    expect(screen.getByText("Siguiente: Descanso")).toBeInTheDocument();
    // El kind de fase viaja como atributo semántico (trabajo → acento rosa §9.1).
    expect(document.querySelector("[data-phase-kind]")!.getAttribute("data-phase-kind")).toBe("trabajo");
  });

  it("la última fase muestra «Última fase» y no promete más fases", () => {
    const clock = createFakeClock(0);
    mount(clock);
    act(() => {
      clock.advance(55_000); // plan: prep 10 · trabajo 30 · desc 15 · trabajo final (55–85)
      useSessionStore.getState().refreshView();
    });
    expect(screen.getByText("Última fase")).toBeInTheDocument();
  });
});

describe("ActiveSessionScreen — controles (spec Session Controls)", () => {
  it("Pausar congela la cuenta; el mismo botón pasa a Reanudar", () => {
    const clock = createFakeClock(0);
    mount(clock);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));

    expect(screen.getByRole("button", { name: "Reanudar" })).toBeInTheDocument();
    // Congelada: el reloj avanza 60 s y la pantalla no cambia.
    act(() => {
      clock.advance(60_000);
      useSessionStore.getState().refreshView();
    });
    expect(screen.getByText("0:10")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Preparación");
  });

  it("Reanudar continúa la misma fase desde el restante congelado", () => {
    const clock = createFakeClock(0);
    mount(clock);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    act(() => clock.advance(4_000)); // suspendida en pausa — no consume
    fireEvent.click(screen.getByRole("button", { name: "Reanudar" }));
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();

    act(() => {
      clock.advance(10_000); // 10 s activos desde el reanudo → cruzó a trabajo
      useSessionStore.getState().refreshView();
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Trabajo");
    expect(screen.getByText("0:30")).toBeInTheDocument();
  });

  it("Detener pide confirmación al controlador (el diálogo vive en SessionController)", () => {
    const onStopRequest = vi.fn();
    mount(createFakeClock(0), onStopRequest);
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    expect(onStopRequest).toHaveBeenCalledTimes(1);
  });
});

describe("ActiveSessionScreen — estado completado (hasta que U8 navega al resumen)", () => {
  it("muestra «Sesión completada» sin controles cuando la vista es completada", () => {
    const clock = createFakeClock(0);
    mount(clock);
    act(() => {
      clock.advance(85_000);
      useSessionStore.getState().refreshView();
    });
    expect(useSessionStore.getState().view!.status).toBe(SESSION_STATUS.completed);
    expect(screen.getByText("Sesión completada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pausar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument();
  });
});
