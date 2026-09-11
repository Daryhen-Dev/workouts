import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// HomeScreen navega con router.push a la pantalla de configuración de cada
// modo (spec timer-modes «All modes reachable» — la ruta de Personalizado la
// completa U6; la tarjeta ya existe y navega). U9 añade el seam de arranque
// directo del slot de rutinas rápidas (mismo contrato que las pantallas U5).
const mocks = vi.hoisted(() => ({ push: vi.fn(), start: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/stores/sessionStore", () => ({ start: mocks.start }));

import { HomeScreen } from "./HomeScreen";
import { MODE } from "@/lib/timer/types";
import type {
  ClasicoConfig,
  PersonalizadoConfig,
  SessionConfig,
} from "@/lib/timer/types";
import {
  ROUTINES_STORAGE_KEY,
  useRoutinesStore,
  type RoutineRecord,
} from "@/stores/routinesStore";

const clasicoConfig: ClasicoConfig = {
  mode: MODE.clasico,
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
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
  ],
};

/** Guarda por el store real (ejercita el camino de producción). */
function seedRoutine(
  name: string,
  config: SessionConfig = clasicoConfig,
): RoutineRecord {
  const result = useRoutinesStore.getState().save(config, name);
  if (result.status !== "saved") throw new Error(`fixture save ${name}`);
  return result.record;
}

beforeEach(() => {
  mocks.push.mockClear();
  mocks.start.mockClear();
  window.localStorage.removeItem(ROUTINES_STORAGE_KEY);
  useRoutinesStore.setState({ routines: [] });
});

describe("HomeScreen — selección de modo (spec timer-modes)", () => {
  it("renderiza las tres tarjetas con los nombres verbatim", () => {
    render(<HomeScreen />);
    expect(screen.getByRole("button", { name: /Clásico/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tabata/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Personalizado/ }),
    ).toBeInTheDocument();
  });

  it.each([
    ["Clásico", "/clasico"],
    ["Tabata", "/tabata"],
    ["Personalizado", "/personalizado"],
  ])("la tarjeta %s navega a %s", (nombre, ruta) => {
    render(<HomeScreen />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(nombre) }));
    expect(mocks.push).toHaveBeenCalledWith(ruta);
  });
});

describe("HomeScreen — slot de rutinas rápidas (spec routines, U9)", () => {
  it("lista las rutinas guardadas y arranca directamente con la config exacta", () => {
    seedRoutine("Piernas");
    seedRoutine("Mixta", personalizadoConfig);
    render(<HomeScreen />);

    expect(screen.getByText("Rutinas guardadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Piernas/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mixta/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Piernas/ }));
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.start.mock.calls[0][0]).toEqual(clasicoConfig);
    expect(mocks.push).toHaveBeenCalledWith("/sesion");
  });

  it("sin rutinas guardadas el slot no aparece", () => {
    render(<HomeScreen />);
    expect(screen.queryByText("Rutinas guardadas")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Piernas/ })).not.toBeInTheDocument();
  });
});
