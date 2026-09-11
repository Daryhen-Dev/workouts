import { describe, expect, it } from "vitest";
import {
  clasicoConfigSchema,
  clasicoValuesSchema,
  personalizadoConfigSchema,
  personalizadoValuesSchema,
  sessionConfigSchema,
  tabataConfigSchema,
  tabataValuesSchema,
} from "./configSchemas";
import { MODE } from "@/lib/timer/types";

// Helpers: devuelve el mensaje del primer issue de la ruta dada, o undefined.
// (zod 4 tipa `issue.path` como PropertyKey[] — se compara elemento a elemento.)
function firstMessageAt(
  result: { success: boolean; error?: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } },
  path: (string | number)[],
): string | undefined {
  const issue = result.error?.issues.find((i) =>
    i.path.length === path.length &&
    i.path.every((segment, i) => String(segment) === String(path[i])),
  );
  return issue?.message;
}

const clasicoValido = {
  preparacionS: 10,
  trabajoS: 30,
  descansoS: 15,
  rondas: 2,
};

describe("configSchemas — Clásico", () => {
  it("acepta una configuración válida y devuelve los valores exactos", () => {
    const result = clasicoValuesSchema.safeParse(clasicoValido);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(clasicoValido);
  });

  // Requirement "Clásico Mode Configuration": rechazar cero, negativos, no
  // numéricos y no enteros con mensaje visible en español.
  it.each([
    ["cero", { ...clasicoValido, trabajoS: 0 }, "trabajoS"],
    ["negativo", { ...clasicoValido, trabajoS: -5 }, "trabajoS"],
    ["no numérico", { ...clasicoValido, trabajoS: "treinta" }, "trabajoS"],
    ["no entero", { ...clasicoValido, trabajoS: 2.5 }, "trabajoS"],
  ])("rechaza trabajo %s con mensaje en español", (_caso, input, campo) => {
    const result = clasicoValuesSchema.safeParse(input);
    expect(result.success).toBe(false);
    const message = result.success ? undefined : result.error.issues[0].message;
    expect(message).toMatch(/trabajo/iu);
    expect(message).toMatch(/número|segundo|entero/u); // español, no un código zod
    void campo;
  });

  it("rechaza rondas 0 y 51 con los límites documentados", () => {
    expect(clasicoValuesSchema.safeParse({ ...clasicoValido, rondas: 0 }).success).toBe(false);
    expect(clasicoValuesSchema.safeParse({ ...clasicoValido, rondas: 51 }).success).toBe(false);
    expect(clasicoValuesSchema.safeParse({ ...clasicoValido, rondas: 50 }).success).toBe(true);
  });

  it("rechaza duraciones por encima del límite (3600 s)", () => {
    expect(
      clasicoValuesSchema.safeParse({ ...clasicoValido, descansoS: 3601 }).success,
    ).toBe(false);
    expect(
      clasicoValuesSchema.safeParse({ ...clasicoValido, descansoS: 3600 }).success,
    ).toBe(true);
  });

  it("exige campo ausente (descansoS) con mensaje en español", () => {
    const sinDescanso = { preparacionS: 10, trabajoS: 30, rondas: 2 };
    const result = clasicoValuesSchema.safeParse(sinDescanso);
    expect(result.success).toBe(false);
    const message = result.success ? undefined : result.error.issues[0].message;
    expect(message).toMatch(/descanso/iu);
  });

  it("el schema de config discrimina por mode y envuelve los values", () => {
    expect(
      clasicoConfigSchema.safeParse({ mode: MODE.clasico, values: clasicoValido }).success,
    ).toBe(true);
    expect(
      clasicoConfigSchema.safeParse({ mode: MODE.tabata, values: clasicoValido }).success,
    ).toBe(false);
  });
});

const tabataValido = {
  preparacionS: 10,
  trabajoS: 20,
  descansoS: 10,
  rondasPorTabata: 2,
  tabatas: 2,
  descansoLargoS: 60,
};

describe("configSchemas — Tabata", () => {
  it("acepta los seis valores del spec sin exigir rondas heredado", () => {
    const result = tabataValuesSchema.safeParse(tabataValido);
    expect(result.success).toBe(true);
  });

  // Requirement "Tabata Mode Configuration": la validación coincide con Clásico.
  it.each([
    ["cero", { ...tabataValido, descansoLargoS: 0 }],
    ["negativo", { ...tabataValido, tabatas: -1 }],
    ["no numérico", { ...tabataValido, trabajoS: "20" }],
    ["no entero", { ...tabataValido, rondasPorTabata: 1.5 }],
  ])("rechaza %s bajo las mismas reglas", (_caso, input) => {
    const result = tabataValuesSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("el schema de config discrimina mode tabata", () => {
    expect(
      tabataConfigSchema.safeParse({ mode: MODE.tabata, values: tabataValido }).success,
    ).toBe(true);
    expect(
      tabataConfigSchema.safeParse({ mode: MODE.clasico, values: tabataValido }).success,
    ).toBe(false);
  });
});

const bloqueClasico = {
  id: "b1",
  tipo: MODE.clasico,
  values: { preparacionS: 5, trabajoS: 30, descansoS: 15, rondas: 1 },
};

describe("configSchemas — Personalizado", () => {
  // Scenario "Empty sequence is rejected" (a nivel de schema).
  it("rechaza cero bloques con mensaje en español", () => {
    const result = personalizadoValuesSchema.safeParse({
      descansoGlobalS: 20,
      blocks: [],
    });
    expect(result.success).toBe(false);
    const message = result.success ? undefined : result.error.issues[0].message;
    expect(message).toMatch(/bloque/u);
  });

  it("el descanso global sigue las mismas reglas de duración", () => {
    for (const invalido of [0, -20, "20", 2.5]) {
      expect(
        personalizadoValuesSchema.safeParse({
          descansoGlobalS: invalido,
          blocks: [bloqueClasico],
        }).success,
      ).toBe(false);
    }
    expect(
      personalizadoValuesSchema.safeParse({
        descansoGlobalS: 20,
        blocks: [bloqueClasico],
      }).success,
    ).toBe(true);
  });

  it("rechaza un bloque con values inválidos con la ruta del issue", () => {
    const result = personalizadoValuesSchema.safeParse({
      descansoGlobalS: 20,
      blocks: [{ ...bloqueClasico, values: { ...bloqueClasico.values, trabajoS: 0 } }],
    });
    expect(result.success).toBe(false);
    expect(firstMessageAt(result, ["blocks", 0, "values", "trabajoS"])).toMatch(/trabajo/iu);
  });

  it("el schema de config discrimina mode personalizado", () => {
    const config = {
      mode: MODE.personalizado,
      descansoGlobalS: 20,
      blocks: [bloqueClasico],
    };
    expect(personalizadoConfigSchema.safeParse(config).success).toBe(true);
    expect(sessionConfigSchema.safeParse(config).success).toBe(true);
  });
});

describe("configSchemas — union de sesión", () => {
  it("acepta las tres configs válidas bajo sessionConfigSchema", () => {
    expect(
      sessionConfigSchema.safeParse({ mode: MODE.clasico, values: clasicoValido }).success,
    ).toBe(true);
    expect(
      sessionConfigSchema.safeParse({ mode: MODE.tabata, values: tabataValido }).success,
    ).toBe(true);
    expect(
      sessionConfigSchema.safeParse({
        mode: MODE.personalizado,
        descansoGlobalS: 20,
        blocks: [bloqueClasico],
      }).success,
    ).toBe(true);
  });

  it("rechaza un mode desconocido", () => {
    expect(
      sessionConfigSchema.safeParse({ mode: "hiit", values: clasicoValido }).success,
    ).toBe(false);
  });
});
