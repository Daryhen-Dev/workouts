import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoreHydrationGate } from "./StoreHydrationGate";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("StoreHydrationGate — hidratación de stores persistidos (§2.3)", () => {
  it("muestra un skeleton hasta que el store persistido reporta hidratación", async () => {
    const pending = deferred();
    const rehydrate = vi.fn(() => pending.promise);

    render(
      <StoreHydrationGate rehydrators={[rehydrate]}>
        <p>Contenido hidratado</p>
      </StoreHydrationGate>,
    );

    expect(rehydrate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Contenido hidratado")).toBeNull();

    pending.resolve();
    await waitFor(() =>
      expect(screen.getByText("Contenido hidratado")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("espera a TODOS los rehydrators antes de renderizar los hijos", async () => {
    const first = deferred();
    const second = deferred();

    render(
      <StoreHydrationGate
        rehydrators={[() => first.promise, () => second.promise]}
      >
        <p>Hijos</p>
      </StoreHydrationGate>,
    );

    first.resolve();
    await act(async () => {}); // vacía microtareas: solo el primer store hidrató
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Hijos")).toBeNull();

    second.resolve();
    await waitFor(() => expect(screen.getByText("Hijos")).toBeInTheDocument());
  });

  it("sin rehydrators registrados, hidrata en el primer efecto", async () => {
    render(<StoreHydrationGate>Todo listo</StoreHydrationGate>);
    await waitFor(() =>
      expect(screen.getByText("Todo listo")).toBeInTheDocument(),
    );
  });

  it("un rehydrator que falla no bloquea la app (fail-open)", async () => {
    const failing = vi.fn(() => Promise.reject(new Error("storage corrupto")));
    render(
      <StoreHydrationGate rehydrators={[failing]}>
        <p>Estado por defecto</p>
      </StoreHydrationGate>,
    );
    await waitFor(() =>
      expect(screen.getByText("Estado por defecto")).toBeInTheDocument(),
    );
  });
});
