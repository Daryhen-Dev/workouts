// HistoryScreen (U8) — /historial: lista (más reciente primero), filtros que
// COMPONEN (período × tipo) y estadísticas sobre el conjunto FILTRADO que
// siguen al filtro (spec history). Fixtures relativas a Date.now() real: la
// pantalla inyecta `now` en cada render vía query pura.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { HistoryEntry } from "@/lib/history/types";
import { HISTORY_STORAGE_KEY, useHistoryStore } from "@/stores/historyStore";

import { HistoryScreen } from "./HistoryScreen";

const DAY = 86_400_000;
const NOW = Date.now();

function entry(
  overrides: Partial<HistoryEntry> & { id: string },
): HistoryEntry {
  return {
    mode: "clasico",
    completedAt: NOW - 2 * DAY,
    activeDurationMs: 100_000,
    rounds: 2,
    ...overrides,
  };
}

/** Cuatro entradas del spec: 2 Clásico recientes, 1 Tabata reciente, 1 Clásico de hace un mes. */
function fixtures(): HistoryEntry[] {
  return [
    entry({
      id: "c-vieja",
      completedAt: NOW - 31 * DAY,
      activeDurationMs: 300_000,
    }),
    // t1 una hora más reciente que c1: sin empates, el orden es determinista.
    entry({
      id: "t1",
      mode: "tabata",
      rounds: 4,
      tabatas: 2,
      completedAt: NOW - 2 * DAY + 3_600_000,
      activeDurationMs: 170_000,
    }),
    entry({ id: "c2", completedAt: NOW - 3 * DAY, activeDurationMs: 200_000 }),
    entry({ id: "c1", completedAt: NOW - 2 * DAY, activeDurationMs: 100_000 }),
  ];
}

/** Fila de entrada por id estable (data-entry-id). */
function row(id: string): HTMLElement {
  const el = document.querySelector(`[data-entry-id="${id}"]`);
  if (!el) throw new Error(`fila ${id} no encontrada`);
  return el as HTMLElement;
}

beforeEach(() => {
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  useHistoryStore.setState({ entries: [] });
});

function selectPeriod(label: string) {
  fireEvent.change(screen.getByLabelText("Período"), {
    target: { value: label },
  });
}

function selectType(label: string) {
  fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: label } });
}

describe("HistoryScreen — lista y formato", () => {
  it("muestra las entradas más recientes primero con duración mm:ss y fecha es-ES", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-entry-id"))).toEqual([
      "t1",
      "c1",
      "c2",
      "c-vieja",
    ]);

    // Fila c1: modo, esfuerzo, duración 100 s → 01:40, fecha es-ES.
    const c1 = within(row("c1"));
    expect(c1.getByText("Clásico")).toBeInTheDocument();
    expect(c1.getByText("2 rondas")).toBeInTheDocument();
    expect(c1.getByText("01:40")).toBeInTheDocument();
    expect(
      c1.getByText(new Intl.DateTimeFormat("es").format(NOW - 2 * DAY)),
    ).toBeInTheDocument();

    // Tabata lleva su esfuerzo compuesto.
    const t1 = within(row("t1"));
    expect(t1.getByText("4 rondas · 2 tabatas")).toBeInTheDocument();
    expect(t1.getByText("02:50")).toBeInTheDocument();
  });

  it("filtrado a vacío muestra el estado vacío en español", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);
    selectType("tabata");
    selectPeriod("dias30");
    expect(within(row("t1")).getByText("Tabata")).toBeInTheDocument(); // queda la Tabata

    selectType("personalizado"); // no hay Personalizado → vacío
    expect(
      screen.getByText("No hay sesiones con estos filtros."),
    ).toBeInTheDocument();
  });

  it("historial sin entradas muestra su estado vacío en español", () => {
    render(<HistoryScreen />);
    expect(
      screen.getByText("Todavía no hay sesiones completadas."),
    ).toBeInTheDocument();
  });
});

describe("HistoryScreen — filtros (spec history: componen)", () => {
  it("la barra ofrece los labels en español de período y tipo", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    const period = screen.getByLabelText("Período") as HTMLSelectElement;
    expect(
      within(period)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Últimos 7 días", "Últimos 30 días", "Toda la historia"]);

    const type = screen.getByLabelText("Tipo") as HTMLSelectElement;
    expect(
      within(type)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Todas", "Clásico", "Tabata", "Personalizado"]);
  });

  it("período «Últimos 7 días» excluye la entrada de hace un mes", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    selectPeriod("dias7");
    expect(screen.queryByText("05:00")).not.toBeInTheDocument(); // 300 s de c-vieja fuera
    expect(screen.getAllByRole("listitem")).toHaveLength(3);

    // «Toda la historia» vuelve a mostrar TODO (spec: all-time option).
    selectPeriod("todo");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("tipo «Tabata» deja solo la entrada Tabata", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    selectType("tabata");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("4 rondas · 2 tabatas")).toBeInTheDocument();
  });

  it("COMponen: Clásico + últimos 7 días excluye la Tabata y el Clásico viejo", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    selectPeriod("dias7");
    selectType("clasico");
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-entry-id"))).toEqual([
      "c1",
      "c2",
    ]);
  });
});

describe("HistoryScreen — estadísticas sobre el conjunto FILTRADO (spec history)", () => {
  it("por defecto (toda la historia · todas): 4 sesiones, total y media correctos", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    // Totales: 100 + 200 + 170 + 300 s = 770 s → 12:50; media = 192,5 s → redondeo
    // en ms (192 500) y floor al pintar → 03:12.
    expect(screen.getByText("4 sesiones")).toBeInTheDocument();
    expect(screen.getByText("12:50")).toBeInTheDocument();
    expect(screen.getByText("03:12")).toBeInTheDocument();
    expect(screen.getByText("Tiempo total")).toBeInTheDocument();
    expect(screen.getByText("Duración media")).toBeInTheDocument();
  });

  it("las stats siguen al filtro: 7 días + Todas → 3 sesiones con nuevo total/media", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    selectPeriod("dias7");
    // 100 + 200 + 170 = 470 s → 07:50; media 156 667 ms → floor 156 s → 02:36.
    expect(screen.getByText("3 sesiones")).toBeInTheDocument();
    expect(screen.getByText("07:50")).toBeInTheDocument();
    expect(screen.getByText("02:36")).toBeInTheDocument();
  });

  it("filtro a un único 100 s → «1 sesión» (singular), total y media 01:40", () => {
    useHistoryStore.setState({ entries: fixtures() });
    render(<HistoryScreen />);

    selectPeriod("dias7");
    selectType("clasico");
    // Quedan c1 (100 s) y c2 (200 s): 2 sesiones… ahora estrechamos a 7 días + Clásico = 2.
    expect(screen.getByText("2 sesiones")).toBeInTheDocument();
    expect(screen.getByText("05:00")).toBeInTheDocument(); // total 300 s
    expect(screen.getByText("02:30")).toBeInTheDocument(); // media 150 s
  });
});
