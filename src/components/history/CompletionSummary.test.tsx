// CompletionSummary (U8) — /resumen: renderiza la entrada MÁS NUEVA del
// historial (spec workout-completion: modo, conteo completado, duración activa
// TOTAL con pausas excluidas) con acciones Volver al inicio / Ver historial.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "@/lib/history/types";
import { HISTORY_STORAGE_KEY, useHistoryStore } from "@/stores/historyStore";

// La pantalla navega desde sus acciones — mock del router.
const mocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

import { CompletionSummary } from "./CompletionSummary";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "e-1",
    mode: "clasico",
    completedAt: 1_700_000_000_000,
    activeDurationMs: 85_000,
    rounds: 2,
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  useHistoryStore.setState({ entries: [] });
  mocks.push.mockClear();
});

describe("CompletionSummary — entrada más reciente (spec workout-completion)", () => {
  it("muestra modo Clásico, «2 rondas», duración 01:25 y la fecha es-ES", () => {
    useHistoryStore.setState({ entries: [entry()] });

    render(<CompletionSummary />);

    expect(screen.getByText("Clásico")).toBeInTheDocument();
    expect(screen.getByText("2 rondas")).toBeInTheDocument();
    expect(screen.getByText("01:25")).toBeInTheDocument(); // 85 s en mm:ss
    expect(
      screen.getByText(new Intl.DateTimeFormat("es").format(1_700_000_000_000)),
    ).toBeInTheDocument();
    expect(screen.getByText("Tiempo activo")).toBeInTheDocument();
  });

  it("la duración es el tiempo ACTIVO: 85 s con pausa de 30 s → 01:25, no 01:55", () => {
    // La entrada registra activeDurationMs medido (85 s); el muro fue 115 s.
    useHistoryStore.setState({
      entries: [entry({ activeDurationMs: 85_000 })],
    });
    render(<CompletionSummary />);
    expect(screen.getByText("01:25")).toBeInTheDocument();
    expect(screen.queryByText("01:55")).not.toBeInTheDocument();
  });

  it("Tabata muestra «4 rondas · 2 tabatas» y Personalizado «3 bloques» (cadenas del spec)", () => {
    useHistoryStore.setState({
      entries: [
        entry({
          mode: "tabata",
          rounds: 4,
          tabatas: 2,
          activeDurationMs: 170_000,
        }),
      ],
    });
    const { rerender } = render(<CompletionSummary />);
    expect(screen.getByText("Tabata")).toBeInTheDocument();
    expect(screen.getByText("4 rondas · 2 tabatas")).toBeInTheDocument();
    expect(screen.getByText("02:50")).toBeInTheDocument(); // 170 s

    useHistoryStore.setState({
      entries: [
        entry({
          mode: "personalizado",
          rounds: undefined,
          bloques: 3,
          activeDurationMs: 115_000,
        }),
      ],
    });
    rerender(<CompletionSummary />);
    expect(screen.getByText("Personalizado")).toBeInTheDocument();
    expect(screen.getByText("3 bloques")).toBeInTheDocument();
    expect(screen.getByText("01:55")).toBeInTheDocument(); // 115 s
  });

  it("con varias entradas renderiza SOLO la más reciente", () => {
    useHistoryStore.setState({
      entries: [
        entry({
          id: "a",
          completedAt: 1_700_000_000_000,
          activeDurationMs: 85_000,
        }),
        entry({
          id: "b",
          completedAt: 1_700_000_090_000,
          activeDurationMs: 170_000,
        }),
      ],
    });
    render(<CompletionSummary />);
    expect(screen.getByText("02:50")).toBeInTheDocument();
    expect(screen.queryByText("01:25")).not.toBeInTheDocument();
  });

  it("acciones: «Volver al inicio» → / y «Ver historial» → /historial", () => {
    useHistoryStore.setState({ entries: [entry()] });
    render(<CompletionSummary />);

    fireEvent.click(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(mocks.push).toHaveBeenCalledWith("/");
    fireEvent.click(screen.getByRole("button", { name: "Ver historial" }));
    expect(mocks.push).toHaveBeenCalledWith("/historial");
  });

  it("historial vacío: estado vacío en español con las mismas acciones", () => {
    render(<CompletionSummary />);
    expect(
      screen.getByText("Todavía no hay ninguna sesión completada."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Volver al inicio" }),
    ).toBeInTheDocument();
  });
});
