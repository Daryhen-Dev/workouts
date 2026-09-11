import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { DurationField } from "./DurationField";

/** Arnés controlado: refleja el patrón Controller de RHF que usan las pantallas. */
function Harness(props: { initial?: number; max?: number; min?: number }) {
  const [value, setValue] = useState(props.initial ?? 10);
  return (
    <DurationField
      id="trabajo"
      label="Trabajo"
      value={value}
      onChange={setValue}
      min={props.min}
      max={props.max}
    />
  );
}

function menos() {
  return screen.getByRole("button", { name: "Disminuir Trabajo" });
}
function mas() {
  return screen.getByRole("button", { name: "Aumentar Trabajo" });
}

describe("DurationField — stepper de segundos enteros", () => {
  it("renderiza etiqueta, valor y sufijo de segundos", () => {
    render(<Harness initial={30} />);
    expect(screen.getByLabelText("Trabajo")).toHaveValue("30");
    expect(screen.getByText("s")).toBeInTheDocument();
  });

  it("+ y − ajustan un segundo por pulsación", () => {
    render(<Harness initial={10} />);
    fireEvent.click(mas());
    expect(screen.getByLabelText("Trabajo")).toHaveValue("11");
    fireEvent.click(menos());
    fireEvent.click(menos());
    expect(screen.getByLabelText("Trabajo")).toHaveValue("9");
  });

  it("respeta el mínimo: − deshabilitado en 1 y el valor no baja", () => {
    render(<Harness initial={1} />);
    expect(menos()).toBeDisabled();
    expect(mas()).toBeEnabled();
    expect(screen.getByLabelText("Trabajo")).toHaveValue("1");
  });

  it("respeta el máximo: + deshabilitado en el tope y el valor no sube", () => {
    render(<Harness initial={5} max={5} />);
    expect(mas()).toBeDisabled();
    expect(menos()).toBeEnabled();
    expect(screen.getByLabelText("Trabajo")).toHaveValue("5");
  });

  it("desde un valor no numérico, el stepper recupera el mínimo (1)", () => {
    render(<Harness initial={1} />);
    fireEvent.change(screen.getByLabelText("Trabajo"), {
      target: { value: "abc" },
    });
    fireEvent.click(mas());
    expect(screen.getByLabelText("Trabajo")).toHaveValue("1");
  });

  it("el texto tecleado pasa al formulario sin clamp: zod reporta los límites", () => {
    const onChange = vi.fn();
    render(
      <DurationField id="t" label="Trabajo" value={10} onChange={onChange} />,
    );
    const input = screen.getByLabelText("Trabajo");

    fireEvent.change(input, { target: { value: "9999" } });
    expect(onChange).toHaveBeenLastCalledWith(9999);

    fireEvent.change(input, { target: { value: "3.5" } });
    expect(onChange).toHaveBeenLastCalledWith(3.5);

    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(Number.NaN);
  });

  it("muestra el error de validación en español con role=alert", () => {
    render(
      <DurationField
        id="t"
        label="Trabajo"
        value={0}
        onChange={vi.fn()}
        error="El trabajo debe durar al menos 1 segundo"
      />,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent(
      "El trabajo debe durar al menos 1 segundo",
    );
    expect(alerta).toBeInTheDocument();
  });
});
