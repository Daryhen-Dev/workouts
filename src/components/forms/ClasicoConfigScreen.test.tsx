import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
import { ROUTINES_STORAGE_KEY, useRoutinesStore } from "@/stores/routinesStore";

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
  window.localStorage.removeItem(ROUTINES_STORAGE_KEY);
  useRoutinesStore.setState({ routines: [] });
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

describe("ClasicoConfigScreen — Guardar rutina (spec routines)", () => {
  /** Abre el diálogo con los valores actuales del formulario. */
  function abrirDialogo(): HTMLElement {
    fireEvent.click(screen.getByRole("button", { name: "Guardar rutina" }));
    return screen.getByRole("dialog");
  }

  function guardarComo(dialog: HTMLElement, nombre: string) {
    fireEvent.change(within(dialog).getByLabelText("Nombre de la rutina"), {
      target: { value: nombre },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
  }

  it("guarda la configuración actual con los valores exactos del formulario", async () => {
    render(<ClasicoConfigScreen />);
    setField("Trabajo", "45");

    const dialog = abrirDialogo();
    guardarComo(dialog, "Piernas");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const [record] = useRoutinesStore.getState().routines;
    expect(record.name).toBe("Piernas");
    expect(record.mode).toBe("clasico");
    expect(record.config).toEqual({
      mode: "clasico",
      values: { preparacionS: 10, trabajoS: 45, descansoS: 15, rondas: 2 },
    });
  });

  it("nombre vacío: error en línea y ninguna rutina creada", async () => {
    render(<ClasicoConfigScreen />);
    const dialog = abrirDialogo();

    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(
      await within(dialog).findByText(
        "El nombre de la rutina no puede estar vacío",
      ),
    ).toBeInTheDocument();
    expect(useRoutinesStore.getState().routines).toEqual([]);
  });

  it("duplicado: confirmación EXPLÍCITA antes de sobrescribir (spec: never silently)", async () => {
    render(<ClasicoConfigScreen />);
    const dialog1 = abrirDialogo();
    guardarComo(dialog1, "Piernas");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    /** Estrecha la unión: esta pantalla solo guarda configs Clásico. */
    const trabajoGuardado = (): number => {
      const config = useRoutinesStore.getState().routines[0].config;
      if (config.mode !== "clasico") throw new Error("fixture: no es Clásico");
      return config.values.trabajoS;
    };

    // Misma rutina, trabajo distinto → la UI pide confirmación.
    setField("Trabajo", "45");
    const dialog2 = abrirDialogo();
    guardarComo(dialog2, "Piernas");

    expect(
      await within(dialog2).findByText("¿Sobrescribir rutina?"),
    ).toBeInTheDocument();
    // Mientras no se confirme, la original queda intacta.
    expect(trabajoGuardado()).toBe(30);

    fireEvent.click(
      within(dialog2).getByRole("button", { name: "Sobrescribir" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const rutinas = useRoutinesStore.getState().routines;
    expect(rutinas).toHaveLength(1);
    expect(trabajoGuardado()).toBe(45);
  });
});
