import { describe, expect, it } from "vitest";
import { compilePlan } from "./plan";
import { MODE, type ClasicoConfig } from "./types";
import { formatDurationMs, totalPlanMs } from "./duration";

const clasico: ClasicoConfig = {
  mode: MODE.clasico,
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

describe("formatDurationMs — formato m:ss / h:mm:ss (español, historia U8)", () => {
  it.each([
    [0, "0:00"],
    [85_000, "1:25"],
    [170_000, "2:50"],
    [40_000, "0:40"],
    [3_600_000, "1:00:00"],
    [3_723_000, "1:02:03"],
  ])("%d ms → %s", (ms, esperado) => {
    expect(formatDurationMs(ms)).toBe(esperado);
  });
});

describe("totalPlanMs — total activo del plan compilado", () => {
  it("suma las duraciones del plan de Clásico (2 rondas → 85 s)", () => {
    expect(totalPlanMs(compilePlan(clasico))).toBe(85_000);
  });

  it("1 ronda → 40 s (sin descanso final)", () => {
    const unaRonda: ClasicoConfig = {
      ...clasico,
      values: { ...clasico.values, rondas: 1 },
    };
    expect(totalPlanMs(compilePlan(unaRonda))).toBe(40_000);
  });
});
