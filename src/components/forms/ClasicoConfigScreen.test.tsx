import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Contrato del seam con U7 (tasks.md U5 GREEN): "Iniciar" llama
// `sessionStore.start(config)` — el mock codifica ese contrato; U7 implementa
// el store real. La navegación a /sesion la dispara la pantalla.
const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/stores/sessionStore", () => ({ start: mocks.start }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { ClasicoConfigScreen } from "./ClasicoConfigScreen";

/** Cambia un campo numérico etiquetado (el input es controlado por RHF). */
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
});

describe("ClasicoConfigScreen — validación bloquea el inicio (spec timer-modes)", () => {
  it.each([
    ["0", "El trabajo debe durar al menos 1 segundo"],
    ["-5", "El trabajo debe durar al menos 1 segundo"],
    ["abc", "El trabajo debe ser un número"],
    ["3.5", "El trabajo debe ser un número entero de segundos"],
  ])(
    "trabajo = %s muestra el mensaje español «%s» y no inicia",
    async (valor, mensaje) => {
      render(<ClasicoConfigScreen />);
      setField("Trabajo", valor);
      iniciar();

      // La validación con resolver es asíncrona en RHF: espera el mensaje.
      await waitFor(() =>
        expect(screen.getByText(mensaje)).toBeInTheDocument(),
      );
      expect(mocks.start).not.toHaveBeenCalled();
      expect(mocks.push).not.toHaveBeenCalled();
    },
  );

  it("valores válidos inician la sesión con la configuración exacta y navegan a /sesion", async () => {
    render(<ClasicoConfigScreen />);
    setField("Preparación", "5");
    setField("Trabajo", "25");
    setField("Descanso", "10");
    setField("Rondas", "3");
    iniciar();

    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    expect(mocks.start).toHaveBeenCalledWith({
      mode: "clasico",
      values: { preparacionS: 5, trabajoS: 25, descansoS: 10, rondas: 3 },
    });
    expect(mocks.push).toHaveBeenCalledWith("/sesion");
  });
});

describe("ClasicoConfigScreen — resumen de duración total (compilePlan)", () => {
  it("muestra el total del plan compilado con los valores por defecto (85 s → 1:25)", () => {
    render(<ClasicoConfigScreen />);
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("1:25");
  });

  it("el resumen reacciona en vivo: 1 ronda elimina el descanso final (40 s → 0:40)", () => {
    render(<ClasicoConfigScreen />);
    setField("Rondas", "1");
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("0:40");
  });

  it("con valores inválidos el resumen no muestra un total", () => {
    render(<ClasicoConfigScreen />);
    setField("Trabajo", "abc");
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("—");
  });
});
