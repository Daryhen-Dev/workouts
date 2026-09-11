import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mismo seam que Clásico: el mock de `sessionStore.start` codifica el contrato
// que U7 implementa; la pantalla navega a /sesion tras iniciar.
const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/stores/sessionStore", () => ({ start: mocks.start }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { TabataConfigScreen } from "./TabataConfigScreen";
import {
  ROUTINES_STORAGE_KEY,
  useRoutinesStore,
} from "@/stores/routinesStore";

function setField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
}

function iniciar() {
  fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
}

beforeEach(() => {
  mocks.start.mockClear();
  mocks.push.mockClear();
  window.localStorage.removeItem(ROUTINES_STORAGE_KEY);
  useRoutinesStore.setState({ routines: [] });
});

describe("TabataConfigScreen — los seis campos validan igual que Clásico (spec timer-modes)", () => {
  it.each([
    ["Preparación", "0", "La preparación debe durar al menos 1 segundo"],
    ["Trabajo", "0", "El trabajo debe durar al menos 1 segundo"],
    ["Descanso", "0", "El descanso debe durar al menos 1 segundo"],
    [
      "Rondas por tabata",
      "0",
      "El número de rondas por tabata debe ser al menos 1",
    ],
    ["Tabatas", "0", "El número de tabatas debe ser al menos 1"],
    ["Descanso largo", "0", "El descanso largo debe durar al menos 1 segundo"],
  ])(
    "%s = 0 muestra el mensaje español y no inicia",
    async (label, valor, mensaje) => {
      render(<TabataConfigScreen />);
      setField(label, valor);
      iniciar();

      // La validación con resolver es asíncrona en RHF: espera el mensaje.
      await waitFor(() =>
        expect(screen.getByText(mensaje)).toBeInTheDocument(),
      );
      expect(mocks.start).not.toHaveBeenCalled();
      expect(mocks.push).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["Descanso largo", "x", "El descanso largo debe ser un número"],
    [
      "Rondas por tabata",
      "2.5",
      "El número de rondas por tabata debe ser un número entero",
    ],
    ["Tabatas", "-3", "El número de tabatas debe ser al menos 1"],
  ])(
    "%s = %s (clase inválida distinta de cero) muestra el mensaje español y no inicia",
    async (label, valor, mensaje) => {
      render(<TabataConfigScreen />);
      setField(label, valor);
      iniciar();

      await waitFor(() =>
        expect(screen.getByText(mensaje)).toBeInTheDocument(),
      );
      expect(mocks.start).not.toHaveBeenCalled();
      expect(mocks.push).not.toHaveBeenCalled();
    },
  );

  it("valores válidos inician la sesión con la configuración exacta y navegan a /sesion", async () => {
    render(<TabataConfigScreen />);
    setField("Trabajo", "22");
    setField("Tabatas", "3");
    setField("Descanso largo", "45");
    iniciar();

    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    // `rondas` es el campo vestigial heredado (flag de U3): la pantalla lo
    // fija en `rondasPorTabata` para satisfacer el tipo TabataValues.
    expect(mocks.start).toHaveBeenCalledWith({
      mode: "tabata",
      values: {
        preparacionS: 10,
        trabajoS: 22,
        descansoS: 10,
        rondasPorTabata: 2,
        tabatas: 3,
        descansoLargoS: 45,
        rondas: 2,
      },
    });
    expect(mocks.push).toHaveBeenCalledWith("/sesion");
  });
});

describe("TabataConfigScreen — resumen de duración total (compilePlan)", () => {
  it("muestra el total del plan compilado por defecto (170 s → 2:50)", () => {
    render(<TabataConfigScreen />);
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("2:50");
  });

      it("el resumen reacciona en vivo: 1 tabata elimina el descanso largo (60 s → 1:00)", () => {
        render(<TabataConfigScreen />);
        setField("Tabatas", "1");
        expect(screen.getByTestId("total-sesion")).toHaveTextContent("1:00");
      });
    });

describe("TabataConfigScreen — Guardar rutina (spec routines, U9)", () => {
  it("guarda la config actual con el `rondas` vestigial fijado", async () => {
    render(<TabataConfigScreen />);
    setField("Trabajo", "22");

    fireEvent.click(screen.getByRole("button", { name: "Guardar rutina" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nombre de la rutina"), {
      target: { value: "Sprint" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const [record] = useRoutinesStore.getState().routines;
    expect(record.name).toBe("Sprint");
    expect(record.mode).toBe("tabata");
    expect(record.config).toEqual({
      mode: "tabata",
      values: {
        preparacionS: 10,
        trabajoS: 22,
        descansoS: 10,
        rondasPorTabata: 2,
        tabatas: 2,
        descansoLargoS: 60,
        rondas: 2, // vestigial (flag U3): fijado como al iniciar
      },
    });
  });
});
