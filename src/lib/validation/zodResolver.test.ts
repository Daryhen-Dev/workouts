import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MODE } from "@/lib/timer/types";
import { personalizadoValuesSchema } from "./configSchemas";
import { zodResolver } from "./zodResolver";

// Adaptador local mínimo zod → react-hook-form (rol de @hookform/resolvers):
// plano para U5 y con soporte de rutas anidadas (blocks.0.values.x) para U6.

describe("zodResolver — caso válido", () => {
  it("devuelve los datos parseados y sin errores", () => {
    const schema = z.object({ rondas: z.number().int().min(1) });
    const resolver = zodResolver(schema);
    const result = resolver({ rondas: 3 });

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ rondas: 3 });
  });
});

describe("zodResolver — rutas planas (U5)", () => {
  it("mapea el issue de zod a errors.<campo> con mensaje en español", () => {
    const schema = z.object({
      trabajoS: z
        .number({ error: "El trabajo debe ser un número" })
        .min(1, { error: "El trabajo debe durar al menos 1 segundo" }),
    });
    const resolver = zodResolver(schema);

    const invalid = resolver({ trabajoS: 0 });
    expect(invalid.values).toEqual({});
    expect(invalid.errors.trabajoS?.message).toBe(
      "El trabajo debe durar al menos 1 segundo",
    );

    const nan = resolver({ trabajoS: Number.NaN });
    expect(nan.errors.trabajoS?.message).toBe("El trabajo debe ser un número");
  });
});

describe("zodResolver — rutas anidadas (contrato para U6)", () => {
  it("anida errors.blocks[0].values.trabajoS con el mensaje español", () => {
    const resolver = zodResolver(personalizadoValuesSchema);
    const result = resolver({
      descansoGlobalS: 20,
      blocks: [
        {
          id: "b1",
          tipo: MODE.clasico,
          values: { preparacionS: 5, trabajoS: 0, descansoS: 10, rondas: 2 },
        },
      ],
    });

    expect(result.values).toEqual({});
    const blockErrors = result.errors.blocks?.[0];
    expect(blockErrors?.values?.trabajoS?.message).toBe(
      "El trabajo debe durar al menos 1 segundo",
    );
  });
});
