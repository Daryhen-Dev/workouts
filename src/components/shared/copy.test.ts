import { describe, expect, it } from "vitest";
import * as copyModule from "./copy";
import { MODE_LABEL } from "./copy";

// Recorre en profundidad todos los valores string exportados del módulo de
// copy — el "copy audit" del spec ui-design revisa exactamente esto.
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectStrings((value as Record<string, unknown>)[key], out);
    }
  }
  return out;
}

// Allowlist de promesas prohibidas: ninguna cadena de copy de la app puede
// prometer ejecución en segundo plano (spec timer-correctness). Las unidades
// posteriores (U7–U13) extienden esta lista a medida que añaden copy.
const BACKGROUND_PROMISE_PATTERNS: RegExp[] = [
  /en (el )?segundo plano/i,
  /second (plane|background)/i,
  /seguir(á|á corriendo|á funcionando|á sonando|á sonarán)/i,
  /sigue (corriendo|funcionando|sonando)/i,
  /aunque (cierres|salgas|bloquees|apagues|minimices)/i,
  /continuar(á|á sonando)/i,
  /no se (detiene|detendrá|para)/i,
  /seguirán/i,
];

describe("copy — nombres de modo verbatim (§9.2, ui-design)", () => {
  it("mapea los ids de modo a sus nombres españoles verbatim", () => {
    expect(MODE_LABEL.clasico).toBe("Clásico");
    expect(MODE_LABEL.tabata).toBe("Tabata");
    expect(MODE_LABEL.personalizado).toBe("Personalizado");
  });

  it("conserva la tilde de «Clásico»", () => {
    expect(Object.values(MODE_LABEL)).toContain("Clásico");
  });
});

describe("copy — auditoría de promesas en segundo plano", () => {
  it("ninguna cadena de copy promete ejecución en segundo plano", () => {
    const strings = collectStrings(copyModule);
    expect(strings.length).toBeGreaterThan(0);
    for (const text of strings) {
      for (const pattern of BACKGROUND_PROMISE_PATTERNS) {
        expect(
          text,
          `copy prohibido («${text}» no debe prometer ejecución en segundo plano)`,
        ).not.toMatch(pattern);
      }
    }
  });

  it("incluye la marca y las etiquetas de navegación centralizadas", () => {
    expect(copyModule.BRAND).toBe("Tip Tap Workout");
    expect(copyModule.NAV_LABELS.inicio).toBe("Inicio");
    expect(copyModule.NAV_LABELS.rutinas).toBe("Rutinas");
    expect(copyModule.NAV_LABELS.historial).toBe("Historial");
    expect(copyModule.NAV_LABELS.ajustes).toBe("Ajustes");
  });
});
