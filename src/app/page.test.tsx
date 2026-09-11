import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

// U1 runner smoke test: proves `pnpm test` executes vitest run with the
// jsdom + RTL + jest-dom chain wired end to end.
describe("plantilla base (U1 smoke)", () => {
  it("renderiza el título de la app", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Tip Tap Workout" })
    ).toBeInTheDocument();
  });
});
