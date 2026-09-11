import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// HomeScreen navega con router.push a la pantalla de configuración de cada
// modo (spec timer-modes «All modes reachable» — la ruta de Personalizado la
// completa U6; la tarjeta ya existe y navega).
const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

import { HomeScreen } from "./HomeScreen";

beforeEach(() => {
  mocks.push.mockClear();
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
