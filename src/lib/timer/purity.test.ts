import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Diseño §2.1: `src/lib/timer/` es el motor PURO — sin React, sin APIs del
// navegador (tampoco en configSchemas, que solo importa zod + tipos). Este
// guardián captura ese contrato para que ninguna unidad posterior lo rompa
// silenciosamente (mismo enfoque de lectura de disco que globals.test.ts).
// U4 añade engine.ts/clock.ts: Date.now es ECMAScript estándar, no una API
// de navegador — permitido por diseño §3.3. U10 añade audio/cues.ts: el
// planificador de cues es la capa PURA del audio (diseño §6.2); las capas
// impuras (context.ts, beepSynth.ts) NO están aquí — les corresponde tocar
// Web Audio.
const PURE_MODULES: string[] = [
  "src/lib/timer/types.ts",
  "src/lib/timer/plan.ts",
  "src/lib/timer/engine.ts",
  "src/lib/timer/clock.ts",
  "src/lib/validation/configSchemas.ts",
  "src/lib/audio/cues.ts",
];

const FORBIDDEN_IMPORTS: RegExp[] = [
  /from\s+["']react/iu,
  /from\s+["']next\//iu,
  /from\s+["']@testing-library/iu,
];

const FORBIDDEN_BROWSER_GLOBALS: RegExp[] = [
  /\bwindow\b/u,
  /\bdocument\b/u,
  /\bnavigator\b/u,
];

describe("pureza del núcleo del temporizador (diseño §2.1/§3)", () => {
  it.each(PURE_MODULES)("%s no importa React/frameworks", (modulePath) => {
    const source = readFileSync(join(process.cwd(), modulePath), "utf8");
    for (const pattern of FORBIDDEN_IMPORTS) {
      expect(
        source.match(pattern),
        `${modulePath} no debe contener ${pattern}`,
      ).toBeNull();
    }
  });

  it.each(PURE_MODULES)("%s no toca APIs del navegador", (modulePath) => {
    const source = readFileSync(join(process.cwd(), modulePath), "utf8");
    for (const pattern of FORBIDDEN_BROWSER_GLOBALS) {
      expect(
        source.match(pattern),
        `${modulePath} no debe contener ${pattern}`,
      ).toBeNull();
    }
  });
});
