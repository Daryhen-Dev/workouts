// SessionController (U7) — orquestación de efectos §3.5: ticker, visibilidad,
// observador de fases (flash) y observador de completado (exactamente una vez),
// guarda de ruta y flujo de descarte con confirmación.
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

// El controlador navega (guarda → inicio; descarte → inicio) — mock del router.
const mocks = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

import SesionPage from "@/app/sesion/page";
import { SessionController } from "./SessionController";

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
    refreshView: REAL_REFRESH_VIEW, // los tests de ticker espiaron la acción: restaurarla
  });
}

// Acción real capturada al importar (los tests sustituyen refreshView con espías
// vía setState, que FUSIONA — sin esto el espía se fuga a los tests siguientes).
const REAL_REFRESH_VIEW = useSessionStore.getState().refreshView;

/** Tabata del spec (U3/U4): 10/20/10, 2 rondas por tabata, 2 tabatas, descanso largo 60 → 170 s. */
const TABATA_170: SessionConfig = {
  mode: "tabata",
  values: {
    preparacionS: 10,
    trabajoS: 20,
    descansoS: 10,
    rondas: 2, // vestigial (contrato U3): la compilación usa rondasPorTabata
    rondasPorTabata: 2,
    tabatas: 2,
    descansoLargoS: 60,
  },
};

/** Simula el cambio de visibilidad del documento y dispara el evento. */
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Arranca la sesión de 85 s con FakeClock y monta el controlador completo. */
function mountRunning(clock: FakeClock) {
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  render(<SessionController />);
}

beforeEach(() => {
  resetStore();
  mocks.replace.mockClear();
  mocks.push.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  // Restaura la visibilidad por defecto (algunos tests la definen como hidden).
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

describe("SessionController — guarda de ruta (sin sesión no hay /sesion)", () => {
  it("sin sesión muestra el estado vacío en español y redirige al inicio", () => {
    render(<SessionController />);
    expect(
      screen.getByText("No hay ninguna sesión en curso. Volviendo al inicio…"),
    ).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });
});

describe("SessionController — ticker (§3.5: 250 ms solo corriendo y visible)", () => {
  it("despacha refreshView con cada tick del intervalo", () => {
    vi.useFakeTimers();
    mountRunning(createFakeClock(0));

    const refreshSpy = vi.fn();
    act(() => useSessionStore.setState({ refreshView: refreshSpy }));
    refreshSpy.mockClear();

    vi.advanceTimersByTime(250);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(refreshSpy).toHaveBeenCalledTimes(5); // 4 ticks más de 250 ms
  });

  it("pausada: el ticker no corre", () => {
    vi.useFakeTimers();
    mountRunning(createFakeClock(0));

    const refreshSpy = vi.fn();
    act(() => {
      useSessionStore.setState({ refreshView: refreshSpy });
      useSessionStore.getState().pause();
    });
    refreshSpy.mockClear();

    vi.advanceTimersByTime(2_000);
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it("pestaña oculta: el ticker no corre", () => {
    vi.useFakeTimers();
    mountRunning(createFakeClock(0));

    const refreshSpy = vi.fn();
    act(() => useSessionStore.setState({ refreshView: refreshSpy }));
    refreshSpy.mockClear();

    act(() => setVisibility("hidden")); // refresh inmediato del handler…
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2_000); // …pero ningún tick mientras oculta
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});

describe("SessionController — visibilitychange → refreshView inmediato", () => {
  it("dispara la recomputación al volver a visible (HARD GATE al retorno)", () => {
    mountRunning(createFakeClock(0));

    const refreshSpy = vi.fn();
    act(() => useSessionStore.setState({ refreshView: refreshSpy }));
    refreshSpy.mockClear();

    act(() => setVisibility("hidden"));
    act(() => setVisibility("visible"));
    expect(refreshSpy).toHaveBeenCalledTimes(2); // uno por evento: recomputar es barato
  });
});

describe("SessionController — observador de fases (flash visual de transición)", () => {
  it("aplica el estado de flash al cambiar el índice de fase", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    expect(
      document.querySelector("section")!.getAttribute("data-flashing"),
    ).toBe("false");

    act(() => {
      clock.advance(10_000); // cruza a trabajo
      useSessionStore.getState().refreshView();
    });
    expect(
      document.querySelector("section")!.getAttribute("data-flashing"),
    ).toBe("true");
  });

  it("el flash es transitorio: se apaga pasado el tiempo del destello", () => {
    vi.useFakeTimers();
    const clock = createFakeClock(0);
    mountRunning(clock);

    act(() => {
      clock.advance(10_000);
      useSessionStore.getState().refreshView();
    });
    expect(
      document.querySelector("section")!.getAttribute("data-flashing"),
    ).toBe("true");

    act(() => vi.advanceTimersByTime(700));
    expect(
      document.querySelector("section")!.getAttribute("data-flashing"),
    ).toBe("false");
  });
});

describe("SessionController — observador de completado (exactamente una vez)", () => {
  it("dispara el seam onComplete UNA sola vez con los datos del motor", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    const onComplete = vi.fn();
    act(() => useSessionStore.getState().setOnComplete(onComplete));

    // La sesión termina naturalmente (suspensión que cruza el final).
    act(() => {
      clock.advance(100_000);
      setVisibility("visible");
    });
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      config: CLASICO_85,
      elapsedActiveMs: 85_000, // vista completada = total configurado (contrato engine)
      completedAt: 100_000,
    });

    // Re-renders y refreshes posteriores NO re-disparan (across re-renders).
    act(() => {
      clock.advance(30_000);
      useSessionStore.getState().refreshView();
    });
    act(() => setVisibility("hidden"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("una sesión nueva tras otra completada re-arma el observador", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    const onComplete = vi.fn();
    act(() => useSessionStore.getState().setOnComplete(onComplete));

    act(() => {
      clock.advance(90_000);
      useSessionStore.getState().refreshView();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Nueva sesión (reinicio): el observador debe volver a poder disparar.
    clock.set(0);
    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    act(() => {
      clock.advance(90_000);
      useSessionStore.getState().refreshView();
    });
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});

describe("SessionController — Detener con confirmación (spec workout-completion)", () => {
  it("Detener abre el diálogo «¿Descartar la sesión?» sin descartar aún", () => {
    mountRunning(createFakeClock(0));
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("¿Descartar la sesión?")).toBeInTheDocument();
    // Aún no descartada: la sesión sigue viva.
    expect(useSessionStore.getState().state).not.toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("confirmar descarta: store a cero, vuelta al inicio, sin resumen ni entrada", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    const onComplete = vi.fn();
    act(() => useSessionStore.getState().setOnComplete(onComplete));

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(useSessionStore.getState().state).toBeNull();
    expect(useSessionStore.getState().view).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(onComplete).not.toHaveBeenCalled(); // descarte ≠ completado: sin entrada
  });

  it("cancelar cierra el diálogo y la sesión continúa", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(useSessionStore.getState().state).not.toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Preparación",
    );
  });

  it("detener en pausa sigue el mismo camino de descarte (spec: stop while paused)", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    const onComplete = vi.fn();
    act(() => {
      useSessionStore.getState().setOnComplete(onComplete);
      useSessionStore.getState().pause();
    });

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(useSessionStore.getState().state).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe("SessionController — HARD GATE en nivel de componente (relój FakeClock por el store + visibilitychange)", () => {
  // Espejo literal de los cuatro scenarios de suspensión del spec timer-correctness,
  // ahora a través de la UI completa (spec: "the display shows…").

  it("vuelta de segundo plano a mitad de fase: 5 s fuera → trabajo con 15 s", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    act(() => {
      clock.advance(20_000); // primer trabajo, 20 s restantes (posiciones del spec)
      setVisibility("hidden");
    });

    act(() => {
      clock.advance(5_000); // 5 s en segundo plano
      setVisibility("visible");
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Trabajo",
    );
    expect(screen.getByText("0:15")).toBeInTheDocument();
  });

  it("cambio de pestaña 50 s cruzando fronteras → trabajo FINAL con 15 s", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    act(() => {
      clock.advance(20_000); // primer trabajo, 20 s restantes
      setVisibility("hidden");
    });

    act(() => {
      clock.advance(50_000); // consume trabajo (20) + descanso (15) + 15 del final
      setVisibility("visible");
    });

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Trabajo");
    expect(screen.getByText("0:15")).toBeInTheDocument();
    expect(screen.getByText("Última fase")).toBeInTheDocument(); // es el trabajo final (índice 3)
  });

  it("sleep 120 s → posición exacta del horario (Tabata, no la pre-sleep)", () => {
    const clock = createFakeClock(0);
    act(() => useSessionStore.getState().start(TABATA_170, asClock(clock)));
    render(<SessionController />);

    act(() => {
      clock.advance(25_000); // tabata 1, primer trabajo: 5 s restantes (posiciones del spec)
      setVisibility("hidden");
    });
    act(() => {
      clock.advance(120_000); // sleep del dispositivo
      setVisibility("visible");
    });

    // Horario: prep[0,10) t1[10,30) d[30,40) t2[40,60) largo[60,120) t3[120,140) d[140,150) t4[150,170)
    // 145 s activos → descanso (índice 6) con 5 s restantes.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Descanso",
    );
    expect(screen.getByText("0:05")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument(); // sigue corriendo
  });

  it("pausada 2 min en suspensión → sigue pausada con 20 s", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    act(() => {
      clock.advance(20_000); // trabajo, 20 s restantes
      useSessionStore.getState().pause();
    });
    expect(
      screen.getByRole("button", { name: "Reanudar" }),
    ).toBeInTheDocument();

    act(() => {
      clock.advance(120_000); // suspendida EN PAUSA — no consume
      setVisibility("visible");
    });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Trabajo",
    );
    expect(screen.getByText("0:20")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reanudar" }),
    ).toBeInTheDocument(); // aún pausada
  });
});

describe("/sesion — shell chrome-minimal y copy honesto", () => {
  it("el shell de la ruta renderiza el controlador (única entrada cliente, §2.3)", () => {
    const clock = createFakeClock(0);
    act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
    render(<SesionPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Preparación",
    );
    expect(screen.getByRole("button", { name: "Detener" })).toBeInTheDocument();
    // chrome-minimal §2.4: sin barra de navegación — el ocultado de NavBar para
    // /sesion está garantizado por showNavFor (testado en AppShell.test.tsx U2).
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("ningún texto del temporizador promete ejecución en segundo plano", () => {
    const clock = createFakeClock(0);
    mountRunning(clock);
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));

    const texto = document.body.textContent ?? "";
    for (const patron of [
      /segundo plano/i,
      /seguir(á|á corriendo|á sonando)/i,
      /aunque (cierres|salgas|bloquees)/i,
      /sigue (corriendo|sonando|contando)/i,
    ]) {
      expect(texto, `copy prohibido en pantalla: «${texto}»`).not.toMatch(
        patron,
      );
    }
  });
});
