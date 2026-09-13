// Cableado del driver Media Session (U13 C2 — diseño §8.4, spec pwa «Media
// Session Controls While Music Plays»). Metadata + play/pause/stop del OS
// SOLO mientras la sesión corre (o pausa — play del lock screen reanuda) y la
// fase vigente tiene asignación de música; stop del OS descarta DIRECTO (el
// lock screen no puede responder el diálogo); limpieza al completar, descartar
// o desmontar; sesión solo-beeps intacta sin controles del OS. Integración
// sobre el SessionController REAL + fake de navigator (patrón B1/B2).
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRAND, MODE_LABEL } from "@/components/shared/copy";
import {
  createFakeClock,
  systemClock,
  type Clock,
  type FakeClock,
} from "@/lib/timer/clock";
import { PHASE_KIND, SESSION_STATUS, type SessionConfig } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { installMediaSessionFake } from "@/test/fakes";

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

/** Metadata esperada: valores centralizados de copy, SOLO lectura (diseño §8.4). */
const METADATA_CLASICO = {
  title: `${BRAND} — ${MODE_LABEL.clasico}`,
  artist: "Entrenamiento",
};

const SIN_MUSICA = {
  preparacion: null,
  trabajo: null,
  descanso: null,
  descansoLargo: null,
  descansoGlobal: null,
};

function asClock(fake: FakeClock): Clock {
  return () => fake.now();
}

/** Monta el controlador REAL corriendo. */
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

/** Dispara una acción del OS (play/pause/stop) registrada por el driver. */
function fireOs(media: ReturnType<typeof installMediaSessionFake>, action: string) {
  const handler = media.handlers.get(action);
  expect(handler).toBeTypeOf("function");
  act(() => handler?.());
}

let media: ReturnType<typeof installMediaSessionFake>;

beforeEach(() => {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  useSettingsStore.setState({ assignments: { ...SIN_MUSICA } });
  media = installMediaSessionFake();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaSessionDriver — exposición con música activa (C2)", () => {
  it("arranque con fase con música: metadata + EXACTAMENTE play/pause/stop", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
    mountRunning(clock);

    expect(media.metadataSets).toEqual([METADATA_CLASICO]);
    expect(media.setActionHandlerCalls.map((c) => c.action)).toEqual([
      "play",
      "pause",
      "stop",
    ]);
    for (const action of ["play", "pause", "stop"]) {
      expect(typeof media.handlers.get(action)).toBe("function");
    }
  });

  it("pausa del OS: handlers preservados; play del OS reanuda (lock screen)", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
    mountRunning(clock);

    fireOs(media, "pause");
    expect(useSessionStore.getState().view!.status).toBe(SESSION_STATUS.paused);
    expect(media.setActionHandlerCalls).toHaveLength(3); // pausa NO re-registra
    expect(typeof media.handlers.get("play")).toBe("function"); // sigue expuesto

    fireOs(media, "play");
    expect(useSessionStore.getState().view!.status).toBe(SESSION_STATUS.running);
    expect(media.setActionHandlerCalls).toHaveLength(3); // reanudación sin churn
    expect(media.metadataSets).toHaveLength(1);
  });

  it("churn del ticker: refreshView repetido jamás re-registra ni limpia", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
    mountRunning(clock);

    for (let i = 0; i < 5; i += 1) useSessionStore.getState().refreshView();

    expect(media.setActionHandlerCalls).toHaveLength(3);
    expect(media.metadataSets).toHaveLength(1);
    expect(media.handlers.get("play")).not.toBeNull();
  });

  it("stop del OS: descarte DIRECTO (sin diálogo) y handlers limpiados", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
    mountRunning(clock);

    fireOs(media, "stop");

    expect(useSessionStore.getState().view).toBeNull(); // inmediato, sin confirmar
    for (const action of ["play", "pause", "stop"]) {
      expect(media.handlers.get(action)).toBeNull(); // fin de sesión limpia
    }
  });

  it("completada: handlers limpiados exactamente una vez", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
    mountRunning(clock);

    crossTo(clock, 100_000);
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );

    for (const action of ["play", "pause", "stop"]) {
      expect(media.handlers.get(action)).toBeNull();
    }
    expect(media.metadataSets).toHaveLength(1); // jamás un re-set
  });

  it("desmontaje con sesión viva: handlers limpiados", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
    const view = mountRunning(clock);
    expect(media.handlers.get("stop")).not.toBeNull();

    view.unmount();

    for (const action of ["play", "pause", "stop"]) {
      expect(media.handlers.get(action)).toBeNull();
    }
  });

  it("la fase pierde la música: handlers limpiados al cruzar a fase sin asignación", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep"); // SOLO preparación
    mountRunning(clock);
    expect(media.setActionHandlerCalls).toHaveLength(3);

    crossTo(clock, 10_000); // preparación → trabajo (sin asignación)
    expect(useSessionStore.getState().view!.phase!.kind).toBe(
      PHASE_KIND.trabajo,
    );

    for (const action of ["play", "pause", "stop"]) {
      expect(media.handlers.get(action)).toBeNull();
    }
  });

  it("transición entre dos fases con música: sin churn (ni re-set ni clear)", () => {
    const clock = createFakeClock(0);
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
    useSettingsStore.getState().setAssignment(PHASE_KIND.trabajo, "pista-work");
    mountRunning(clock);

    crossTo(clock, 10_000); // preparación → trabajo (ambas con música)
    expect(useSessionStore.getState().view!.phase!.kind).toBe(
      PHASE_KIND.trabajo,
    );

    expect(media.setActionHandlerCalls).toHaveLength(3); // MISMO registro sigue
    expect(media.metadataSets).toEqual([METADATA_CLASICO]); // ni re-set de metadata
  });
});

describe("sesión solo-beeps y degradación (C2)", () => {
  it("sin asignaciones: CERO controles del OS y la sesión completa igual", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const clock = createFakeClock(0);
    mountRunning(clock);
    expect(media.metadataSets).toEqual([]);
    // Los null-clear de limpieza son no-op inofensivos; lo que JAMÁS hay es un
    // registro real (handler no nulo) ni metadata en una sesión solo-beeps.
    const registros = media.setActionHandlerCalls.filter(
      (c) => c.handler !== null,
    );
    expect(registros).toEqual([]);

    crossTo(clock, 100_000);
    expect(useSessionStore.getState().view!.status).toBe(
      SESSION_STATUS.completed,
    );
    expect(
      media.setActionHandlerCalls.filter((c) => c.handler !== null),
    ).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("sin la API Media Session la sesión completa igualmente (no-op silencioso)", () => {
    vi.unstubAllGlobals(); // navigator jsdom real: sin mediaSession (Firefox viejo)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    useSettingsStore
      .getState()
      .setAssignment(PHASE_KIND.preparacion, "pista-prep");
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
