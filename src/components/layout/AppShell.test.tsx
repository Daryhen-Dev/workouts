import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import { isActivePath, showNavFor } from "./nav";

// Skin única: se lee el CSS real servido por la app (vitest no procesa CSS
// por defecto, así que se lee el archivo directamente del disco).
const globalsCss = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

// Mutable pathname so tests can exercise both normal routes and the
// chrome-minimal `/sesion` opt-out without a real App Router context.
const mockPathname = { value: "/" };

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.value,
}));

describe("AppShell — marca y pestañas (ui-design)", () => {
  it('muestra la marca "Tip Tap Workout"', () => {
    render(<AppShell>{null}</AppShell>);
    expect(screen.getAllByText("Tip Tap Workout").length).toBeGreaterThan(0);
  });

  it("renderiza las pestañas Inicio/Rutinas/Historial/Ajustes con sus rutas", () => {
    render(<AppShell>{null}</AppShell>);
    const expected: Array<[label: string, href: string]> = [
      ["Inicio", "/"],
      ["Rutinas", "/rutinas"],
      ["Historial", "/historial"],
      ["Ajustes", "/ajustes"],
    ];
    for (const [label, href] of expected) {
      const links = screen.getAllByRole("link", { name: label });
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute("href", href);
      }
    }
  });

  it('resalta la ruta activa ("Inicio" activo en "/", "Rutinas" no)', () => {
    mockPathname.value = "/";
    render(<AppShell>{null}</AppShell>);
    const inicio = screen.getAllByRole("link", { name: "Inicio" })[0];
    const rutinas = screen.getAllByRole("link", { name: "Rutinas" })[0];
    expect(inicio).toHaveAttribute("aria-current", "page");
    expect(rutinas).not.toHaveAttribute("aria-current");
  });

  it("declara color-scheme: dark (skin única, oscura)", () => {
    expect(globalsCss).toMatch(/:root\s*\{[^}]*color-scheme:\s*dark/);
  });

  it("no contiene ningún control de tema o skin en ninguna parte", () => {
    render(<AppShell>{null}</AppShell>);
    const switcherPattern =
      /tema|theme|skin|apariencia|modo claro|modo oscuro/i;
    const controls = [
      ...screen.queryAllByRole("button"),
      ...screen.queryAllByRole("combobox"),
      ...screen.queryAllByRole("switch"),
      ...screen.queryAllByRole("radiogroup"),
      ...screen.queryAllByRole("listbox"),
    ];
    for (const control of controls) {
      const name =
        control.getAttribute("aria-label") ?? control.textContent ?? "";
      expect(name).not.toMatch(switcherPattern);
    }
  });

  it("oculta toda la navegación en /sesion (chrome-minimal)", () => {
    mockPathname.value = "/sesion";
    render(<AppShell>{null}</AppShell>);
    expect(screen.queryByRole("link", { name: "Inicio" })).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    mockPathname.value = "/";
  });
});

describe("showNavFor — opt-out de /sesion (§2.4)", () => {
  it("muestra la navegación en las rutas normales", () => {
    expect(showNavFor("/")).toBe(true);
    expect(showNavFor("/rutinas")).toBe(true);
    expect(showNavFor("/historial/filtros")).toBe(true);
    expect(showNavFor("/ajustes")).toBe(true);
  });

  it("oculta la navegación en /sesion y sus subrutas", () => {
    expect(showNavFor("/sesion")).toBe(false);
    expect(showNavFor("/sesion/")).toBe(false);
    expect(showNavFor("/sesion/cualquier-cosa")).toBe(false);
  });
});

describe("isActivePath — resaltado de ruta activa", () => {
  it("«/» solo está activo en la ruta exacta", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/rutinas", "/")).toBe(false);
  });

  it("las demás rutas activan por prefijo de segmento", () => {
    expect(isActivePath("/rutinas", "/rutinas")).toBe(true);
    expect(isActivePath("/rutinas/abc", "/rutinas")).toBe(true);
    expect(isActivePath("/rutinas-extra", "/rutinas")).toBe(false);
    expect(isActivePath("/ajustes", "/rutinas")).toBe(false);
  });
});
