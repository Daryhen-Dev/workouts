import {
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Contrato del seam con U7 (mismo patrón que U5): "Iniciar" llama
// `sessionStore.start(config)` con la PersonalizadoConfig exacta y navega a
// /sesion. El mock codifica el contrato; U7 implementa el store real.
const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/stores/sessionStore", () => ({ start: mocks.start }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { PersonalizadoBuilder } from "./PersonalizadoBuilder";
import PersonalizadoPage from "@/app/personalizado/page";
import { compilePlan } from "@/lib/timer/plan";
import { ROUTINES_STORAGE_KEY, useRoutinesStore } from "@/stores/routinesStore";

/** Raíz de la tarjeta del bloque (article) localizada por su encabezado. */
function card(titulo: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: titulo });
  return heading.closest("article") as HTMLElement;
}

/** Cambia un campo numérico dentro de una tarjeta de bloque. */
function setBlockField(titulo: string, label: string, value: string) {
  fireEvent.change(within(card(titulo)).getByLabelText(label), {
    target: { value },
  });
}

/** Cambia el campo global del constructor (único con esa etiqueta). */
function setGlobalField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
}

function addBlock(tipo: "Clásico" | "Tabata") {
  fireEvent.click(
    screen.getByRole("button", { name: `Añadir bloque ${tipo}` }),
  );
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

describe("PersonalizadoBuilder — secuencia vacía (spec «Empty sequence is rejected»)", () => {
  it("arranca con cero bloques: muestra el estado vacío en español", () => {
    render(<PersonalizadoBuilder />);
    expect(
      screen.getByText(
        "Sin bloques todavía. Añade un bloque Clásico o Tabata para armar tu secuencia.",
      ),
    ).toBeInTheDocument();
    // El resumen no totaliza sin bloques.
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("—");
  });

  it("rechaza iniciar con cero bloques: error español visible y sin sesión", async () => {
    render(<PersonalizadoBuilder />);
    iniciar();

    await waitFor(() =>
      expect(
        screen.getByText("Añade al menos un bloque para iniciar la sesión"),
      ).toBeInTheDocument(),
    );
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe("PersonalizadoBuilder — estado y UI de bloques", () => {
  it("añade un bloque Clásico y un bloque Tabata con sus campos", () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");
    addBlock("Tabata");

    const clasico = card("Bloque 1 · Clásico");
    expect(within(clasico).getByLabelText("Preparación")).toBeInTheDocument();
    expect(within(clasico).getByLabelText("Trabajo")).toBeInTheDocument();
    expect(within(clasico).getByLabelText("Descanso")).toBeInTheDocument();
    expect(within(clasico).getByLabelText("Rondas")).toBeInTheDocument();

    const tabata = card("Bloque 2 · Tabata");
    expect(
      within(tabata).getByLabelText("Rondas por tabata"),
    ).toBeInTheDocument();
    expect(within(tabata).getByLabelText("Tabatas")).toBeInTheDocument();
    expect(within(tabata).getByLabelText("Descanso largo")).toBeInTheDocument();
  });

  it("elimina un bloque y deja los demás intactos", () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");
    addBlock("Tabata");

    fireEvent.click(screen.getByRole("button", { name: "Eliminar bloque 1" }));

    expect(
      screen.queryByRole("heading", { name: "Bloque 2 · Tabata" }),
    ).toBeNull();
    // El Tabata superviviente se renumera a la posición 1.
    expect(
      screen.getByRole("heading", { name: "Bloque 1 · Tabata" }),
    ).toBeInTheDocument();
  });

  it("reordena con «Subir»: el bloque 2 pasa a ejecutarse primero (visual)", () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");
    addBlock("Tabata");

    // Guardas de los extremos: subir bloque 1 y bajar bloque 2 deshabilitados.
    expect(
      screen.getByRole("button", { name: "Subir bloque 1" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Bajar bloque 2" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Subir bloque 2" }));

    const headings = screen.getAllByRole("heading");
    expect(headings.map((h) => h.textContent)).toEqual([
      "Bloque 1 · Tabata",
      "Bloque 2 · Clásico",
    ]);
  });
});

describe("PersonalizadoBuilder — validación (spec builder)", () => {
  it("un campo de bloque inválido burbujea con mensaje español y bloquea el inicio", async () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");
    setBlockField("Bloque 1 · Clásico", "Trabajo", "0");
    iniciar();

    await waitFor(() =>
      expect(
        screen.getByText("El trabajo debe durar al menos 1 segundo"),
      ).toBeInTheDocument(),
    );
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("el descanso global valida como toda duración y bloquea el inicio", async () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");
    setGlobalField("Descanso global", "0");
    iniciar();

    await waitFor(() =>
      expect(
        screen.getByText("El descanso global debe durar al menos 1 segundo"),
      ).toBeInTheDocument(),
    );
    expect(mocks.start).not.toHaveBeenCalled();
  });
});

describe("PersonalizadoBuilder — independencia de bloques (spec)", () => {
  it("editar el trabajo del bloque 2 no altera el del bloque 1 (ni en UI ni al iniciar)", async () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");
    addBlock("Clásico");
    setBlockField("Bloque 2 · Clásico", "Trabajo", "45");

    expect(card("Bloque 1 · Clásico")).toBeInTheDocument();
    const inputBloque1 = within(card("Bloque 1 · Clásico")).getByLabelText(
      "Trabajo",
    ) as HTMLInputElement;
    const inputBloque2 = within(card("Bloque 2 · Clásico")).getByLabelText(
      "Trabajo",
    ) as HTMLInputElement;
    expect(inputBloque1.value).toBe("30");
    expect(inputBloque2.value).toBe("45");

    iniciar();
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    const config = mocks.start.mock.calls[0][0];
    expect(config.blocks[0].values.trabajoS).toBe(30);
    expect(config.blocks[1].values.trabajoS).toBe(45);
  });
});

describe("PersonalizadoBuilder — resumen vivo vía compilePlan", () => {
  // Escenario «Mixed sequence runs block by block»: Tabata (10/20/10/2/1) +
  // Clásico (10/30/15/1) + descanso global 20 s → 60 + 20 + 40 = 120 s = 2:00.
  // El descanso global NO se añade tras el bloque final (140 s sería el error).
  function montarEscenarioMixto() {
    render(<PersonalizadoBuilder />);
    addBlock("Tabata");
    setBlockField("Bloque 1 · Tabata", "Tabatas", "1");
    addBlock("Clásico");
    setBlockField("Bloque 2 · Clásico", "Rondas", "1");
  }

  it("total 2:00 — descanso global SOLO entre bloques, nunca tras el final", () => {
    montarEscenarioMixto();
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("2:00");
  });

  it("el resumen reacciona en vivo al descanso global (20 s → 30 s ⇒ 2:10)", () => {
    montarEscenarioMixto();
    setGlobalField("Descanso global", "30");
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("2:10");
  });

  it("sin bloques no totaliza («—»)", () => {
    render(<PersonalizadoBuilder />);
    expect(screen.getByTestId("total-sesion")).toHaveTextContent("—");
  });
});

describe("PersonalizadoBuilder — inicio de sesión", () => {
  it("entrega la PersonalizadoConfig exacta a sessionStore.start y navega /sesion", async () => {
    render(<PersonalizadoBuilder />);
    addBlock("Tabata");
    setBlockField("Bloque 1 · Tabata", "Tabatas", "1");
    addBlock("Clásico");
    setBlockField("Bloque 2 · Clásico", "Rondas", "1");

    iniciar();

    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    expect(mocks.start).toHaveBeenCalledWith({
      mode: "personalizado",
      descansoGlobalS: 20,
      blocks: [
        {
          id: expect.any(String),
          tipo: "tabata",
          values: {
            preparacionS: 10,
            trabajoS: 20,
            descansoS: 10,
            rondasPorTabata: 2,
            tabatas: 1,
            descansoLargoS: 60,
            // Vestigial heredado de TabataValues (U3): se fija en rondasPorTabata.
            rondas: 2,
          },
        },
        {
          id: expect.any(String),
          tipo: "clasico",
          values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 1 },
        },
      ],
    });
    expect(mocks.push).toHaveBeenCalledWith("/sesion");
  });

  it("reordenar cambia el orden de ejecución compilado (spec «Reordering changes execution order»)", async () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico"); // A: trabajo 30
    addBlock("Clásico");
    setBlockField("Bloque 2 · Clásico", "Trabajo", "45"); // B: trabajo 45

    fireEvent.click(screen.getByRole("button", { name: "Subir bloque 2" }));
    iniciar();

    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    const config = mocks.start.mock.calls[0][0];
    const plan = compilePlan(config);
    const primerTrabajo = plan.find((fase) => fase.kind === "trabajo");
    // B (45 s) ejecuta primero; la etiqueta lleva la posición recompilada.
    expect(primerTrabajo?.durationMs).toBe(45_000);
    expect(primerTrabajo?.label).toBe("Bloque 1 · Trabajo");
  });
});

describe("PersonalizadoBuilder — shell de la ruta", () => {
  it("/personalizado renderiza el encabezado en español y el constructor", () => {
    render(<PersonalizadoPage />);
    expect(
      screen.getByRole("heading", { name: "Personalizado", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Añadir bloque Clásico" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Descanso global")).toBeInTheDocument();
  });
});

describe("PersonalizadoBuilder — Guardar rutina (spec routines, U9)", () => {
  it("un Enter durante composición IME no guarda ni cierra el diálogo", () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");

    fireEvent.click(screen.getByRole("button", { name: "Guardar rutina" }));
    const dialog = screen.getByRole("dialog");
    const nameInput = within(dialog).getByLabelText("Nombre de la rutina");
    fireEvent.change(nameInput, { target: { value: "En composición" } });
    const composingEnter = createEvent.keyDown(nameInput, {
      key: "Enter",
      code: "Enter",
      isComposing: true,
    });
    fireEvent(nameInput, composingEnter);

    expect(composingEnter.defaultPrevented).toBe(false);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(useRoutinesStore.getState().routines).toHaveLength(0);
  });

  it("el diálogo de guardado no anida un form y sus acciones no envían el builder", async () => {
    render(<PersonalizadoBuilder />);
    addBlock("Clásico");

    fireEvent.click(screen.getByRole("button", { name: "Guardar rutina" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("form")).toBeNull();

    fireEvent.change(within(dialog).getByLabelText("Nombre de la rutina"), {
      target: { value: "Con clic" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mocks.start).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Guardar rutina" }));
    const reopenedDialog = screen.getByRole("dialog");
    const nameInput = within(reopenedDialog).getByLabelText("Nombre de la rutina");
    fireEvent.change(nameInput, { target: { value: "Con Enter" } });
    const enterEvent = createEvent.keyDown(nameInput, {
      key: "Enter",
      code: "Enter",
    });
    fireEvent(nameInput, enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mocks.start).not.toHaveBeenCalled();
    expect(useRoutinesStore.getState().routines.map((routine) => routine.name)).toEqual([
      "Con clic",
      "Con Enter",
    ]);
  });

  it("guarda la secuencia completa; el plan conserva el descanso global", async () => {
    render(<PersonalizadoBuilder />);
    addBlock("Tabata");
    setBlockField("Bloque 1 · Tabata", "Tabatas", "1");
    addBlock("Clásico");
    setBlockField("Bloque 2 · Clásico", "Rondas", "1");

    fireEvent.click(screen.getByRole("button", { name: "Guardar rutina" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nombre de la rutina"), {
      target: { value: "Mixta" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const [record] = useRoutinesStore.getState().routines;
    expect(record.name).toBe("Mixta");
    expect(record.mode).toBe("personalizado");
    if (record.config.mode !== "personalizado") {
      throw new Error("fixture: no es Personalizado");
    }
    expect(record.config.descansoGlobalS).toBe(20);
    expect(record.config.blocks.map((b) => b.tipo)).toEqual([
      "tabata",
      "clasico",
    ]);

    // Fidelidad de secuencia (spec: keeps the full sequence): el descanso
    // global de 20 s está ENTRE los bloques, no tras el final.
    const globals = compilePlan(record.config).filter(
      (fase) => fase.kind === "descansoGlobal",
    );
    expect(globals).toHaveLength(1);
    expect(globals[0].durationMs).toBe(20_000);
  });
});
