// RoutinesScreen (U9) — /rutinas: lista con nombre y modo, Iniciar directo
// (sessionStore.start(routine.config) + /sesion), renombrar/eliminar con
// diálogos (spec routines). El store y los diálogos son reales; solo se
// mockean el seam de sesión y la navegación (patrón de las pantallas U5/U6).
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODE } from "@/lib/timer/types";
import type {
  ClasicoConfig,
  PersonalizadoConfig,
  SessionConfig,
} from "@/lib/timer/types";
import type { HistoryEntry } from "@/lib/history/types";
import { useHistoryStore } from "@/stores/historyStore";
import {
  ROUTINES_STORAGE_KEY,
  useRoutinesStore,
  type RoutineRecord,
} from "@/stores/routinesStore";

const mocks = vi.hoisted(() => ({ start: vi.fn(), push: vi.fn() }));
vi.mock("@/stores/sessionStore", () => ({ start: mocks.start }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { RoutinesScreen } from "./RoutinesScreen";

const clasicoConfig: ClasicoConfig = {
  mode: MODE.clasico,
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

const otroClasico: ClasicoConfig = {
  mode: MODE.clasico,
  values: { ...clasicoConfig.values, trabajoS: 45 },
};

const personalizadoConfig: PersonalizadoConfig = {
  mode: MODE.personalizado,
  descansoGlobalS: 20,
  blocks: [
    {
      id: "b1",
      tipo: MODE.tabata,
      values: {
        preparacionS: 10,
        trabajoS: 20,
        descansoS: 10,
        rondasPorTabata: 2,
        tabatas: 2,
        descansoLargoS: 60,
        rondas: 2,
      },
    },
    {
      id: "b2",
      tipo: MODE.clasico,
      values: { preparacionS: 5, trabajoS: 40, descansoS: 20, rondas: 3 },
    },
  ],
};

/** Guarda por el store real (ejercita el camino de producción). */
function seedRoutine(name: string, config: SessionConfig = clasicoConfig): RoutineRecord {
  const result = useRoutinesStore.getState().save(config, name);
  if (result.status !== "saved") throw new Error(`fixture save ${name}`);
  return result.record;
}

function entry(id: string): HistoryEntry {
  return {
    id,
    mode: "clasico",
    completedAt: 1_700_000_000_000,
    activeDurationMs: 85_000,
    rounds: 2,
  };
}

/** Fila por id estable (data-routine-id). */
function row(id: string): HTMLElement {
  const el = document.querySelector(`[data-routine-id="${id}"]`);
  if (!el) throw new Error(`rutina ${id} no listada`);
  return el as HTMLElement;
}

beforeEach(() => {
  window.localStorage.removeItem(ROUTINES_STORAGE_KEY);
  useRoutinesStore.setState({ routines: [] });
  useHistoryStore.setState({ entries: [] });
  mocks.start.mockClear();
  mocks.push.mockClear();
});

describe("RoutinesScreen — lista (spec: name and mode)", () => {
  it("muestra cada rutina con su nombre, etiqueta de modo y fecha actualizada", () => {
    const piernas = seedRoutine("Piernas");
    seedRoutine("Brazos", otroClasico);
    render(<RoutinesScreen />);

    const fila = within(row(piernas.id));
    expect(fila.getByText("Piernas")).toBeInTheDocument();
    expect(fila.getByText("Clásico")).toBeInTheDocument();
    expect(
      fila.getByText(new Intl.DateTimeFormat("es").format(piernas.updatedAt)),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("sin rutinas muestra el estado vacío en español", () => {
    render(<RoutinesScreen />);
    expect(
      screen.getByText("Todavía no has guardado ninguna rutina."),
    ).toBeInTheDocument();
  });
});

describe("RoutinesScreen — Iniciar directo (spec: Start directly from the list)", () => {
  it("Iniciar arranca la sesión con la config exacta y navega a /sesion", () => {
    const piernas = seedRoutine("Piernas");
    render(<RoutinesScreen />);

    fireEvent.click(within(row(piernas.id)).getByRole("button", { name: "Iniciar" }));

    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.start.mock.calls[0][0]).toEqual(clasicoConfig);
    expect(mocks.push).toHaveBeenCalledWith("/sesion");
  });

  it("una rutina Personalizado arranca con la secuencia completa (bloques + descanso global)", () => {
    const mixta = seedRoutine("Mixta", personalizadoConfig);
    render(<RoutinesScreen />);

    fireEvent.click(within(row(mixta.id)).getByRole("button", { name: "Iniciar" }));

    expect(mocks.start.mock.calls[0][0]).toEqual(personalizadoConfig);
  });
});

describe("RoutinesScreen — renombrar (spec: Rename preserves configuration)", () => {
  it("renombrar cambia el nombre visible y conserva la config original", async () => {
    const piernas = seedRoutine("Piernas");
    render(<RoutinesScreen />);
    fireEvent.click(
      within(row(piernas.id)).getByRole("button", { name: "Renombrar" }),
    );

    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByLabelText(
      "Nombre de la rutina",
    ) as HTMLInputElement;
    expect(input.value).toBe("Piernas"); // precargado

    fireEvent.change(input, { target: { value: "Piernas martes" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Renombrar" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Piernas martes")).toBeInTheDocument();

    // La config quedó intacta: iniciar entrega la original (escenario del spec).
    const record = useRoutinesStore
      .getState()
      .routines.find((r) => r.id === piernas.id);
    expect(record?.config).toEqual(clasicoConfig);
    fireEvent.click(
      within(row(piernas.id)).getByRole("button", { name: "Iniciar" }),
    );
    expect(mocks.start.mock.calls[0][0]).toEqual(clasicoConfig);
  });

  it("vacío y duplicado se rechazan con mensaje español en línea", async () => {
    const piernas = seedRoutine("Piernas");
    seedRoutine("Brazos", otroClasico);
    render(<RoutinesScreen />);
    fireEvent.click(
      within(row(piernas.id)).getByRole("button", { name: "Renombrar" }),
    );

    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByLabelText("Nombre de la rutina");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Renombrar" }));
    expect(
      await within(dialog).findByText("El nombre de la rutina no puede estar vacío"),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Brazos" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Renombrar" }));
    expect(
      await within(dialog).findByText("Ya existe una rutina con ese nombre"),
    ).toBeInTheDocument();
    expect(screen.getByText("Piernas")).toBeInTheDocument(); // sin cambios
  });
});

describe("RoutinesScreen — eliminar (spec: Delete removes only the routine)", () => {
  it("pide confirmación; cancelar conserva, confirmar elimina SOLO esa rutina", async () => {
    const piernas = seedRoutine("Piernas");
    const brazos = seedRoutine("Brazos", otroClasico);
    useHistoryStore.setState({ entries: [entry("h-1")] });
    render(<RoutinesScreen />);

    fireEvent.click(
      within(row(piernas.id)).getByRole("button", { name: "Eliminar" }),
    );
    const confirm = screen.getByRole("alertdialog");
    expect(screen.getByText("¿Eliminar la rutina?")).toBeInTheDocument();

    // Cancelar: nada cambia.
    fireEvent.click(within(confirm).getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Piernas")).toBeInTheDocument();

    // Confirmar: solo Piernas desaparece; Brazos y el historial intactos.
    fireEvent.click(
      within(row(piernas.id)).getByRole("button", { name: "Eliminar" }),
    );
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Eliminar",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText("Piernas")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Brazos")).toBeInTheDocument();
    expect(
      useRoutinesStore.getState().routines.map((r) => r.id),
    ).toEqual([brazos.id]);
    expect(useHistoryStore.getState().entries.map((e) => e.id)).toEqual([
      "h-1",
    ]);
  });
});
