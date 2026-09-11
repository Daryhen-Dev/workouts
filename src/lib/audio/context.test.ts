// Ciclo de vida del AudioContext (U10 — diseño §6.1, spec audio «No Web
// Audio, no failure»).
//
// Contrato del singleton: creación PEREZOSA (nada en el nivel superior del
// módulo — SSR seguro), `null` cuando el global AudioContext no existe, un
// solo contexto por vida de la app (nunca recreado, nunca cerrado) y
// `resumeIfSuspended()` best-effort (try/catch, jamás lanza).
//
// Ni Node ni jsdom definen AudioContext (verificado): el caso «sin Web
// Audio» es el estado NATURAL del entorno de pruebas. Para el singleton se
// inyecta una clase falsa en el global y se recarga el módulo
// (vi.resetModules + import dinámico) para aislar su estado por test.
import { afterEach, describe, expect, it, vi } from "vitest";

/** Mínimo AudioContext falso: constructor espiado + resume programable. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = "running";
  resumeCalls = 0;
  rejectResume = false;
  currentTime = 0;

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;
    if (this.rejectResume) return Promise.reject(new Error("interrumpido"));
    this.state = "running";
    return Promise.resolve();
  }
}

type CtxModule = typeof import("./context");

/** Recarga el módulo con estado fresco (el singleton vive en el ámbito del módulo). */
async function freshContextModule(): Promise<CtxModule> {
  vi.resetModules();
  return await import("./context");
}

function defineGlobalAudioContext(ctor: unknown): void {
  (globalThis as { AudioContext?: unknown }).AudioContext =
    ctor as typeof AudioContext;
}

function deleteGlobalAudioContext(): void {
  delete (globalThis as { AudioContext?: unknown }).AudioContext;
}

afterEach(() => {
  deleteGlobalAudioContext();
  FakeAudioContext.instances = [];
});

describe("getAudioContext — singleton perezoso (§6.1)", () => {
  it("sin Web Audio (global ausente): null, sin lanzar — la sesión sigue (spec)", async () => {
    deleteGlobalAudioContext();
    const { getAudioContext } = await freshContextModule();

    expect(getAudioContext()).toBeNull();
  });

  it("crea perezosamente en la primera llamada y devuelve SIEMPRE la misma instancia", async () => {
    const { getAudioContext } = await freshContextModule();
    defineGlobalAudioContext(FakeAudioContext);

    // Antes de la primera llamada no hay construcción alguna.
    expect(FakeAudioContext.instances).toHaveLength(0);
    const first = getAudioContext();
    expect(first).toBeInstanceOf(FakeAudioContext);

    const second = getAudioContext();
    const third = getAudioContext();
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(FakeAudioContext.instances).toHaveLength(1); // una por vida de la app
  });

  it("nunca construye si nadie llama (evaluación perezosa, no en la carga del módulo)", async () => {
    defineGlobalAudioContext(FakeAudioContext);
    await freshContextModule(); // solo importar NO construye

    expect(FakeAudioContext.instances).toHaveLength(0);
  });
});

describe("resumeIfSuspended — recuperación iOS, best-effort (§6.1)", () => {
  it("contexto suspendido → intenta resume exactamente una vez", async () => {
    const { getAudioContext, resumeIfSuspended } = await freshContextModule();
    defineGlobalAudioContext(FakeAudioContext);
    const ctx = getAudioContext() as unknown as FakeAudioContext;
    ctx.state = "suspended";

    await resumeIfSuspended();
    expect(ctx.resumeCalls).toBe(1);
  });

  it("contexto corriendo → no toca resume", async () => {
    const { getAudioContext, resumeIfSuspended } = await freshContextModule();
    defineGlobalAudioContext(FakeAudioContext);
    const ctx = getAudioContext() as unknown as FakeAudioContext;
    ctx.state = "running";

    await resumeIfSuspended();
    expect(ctx.resumeCalls).toBe(0);
  });

  it("resume que rechaza NO lanza (try/catch best-effort)", async () => {
    const { getAudioContext, resumeIfSuspended } = await freshContextModule();
    defineGlobalAudioContext(FakeAudioContext);
    const ctx = getAudioContext() as unknown as FakeAudioContext;
    ctx.state = "suspended";
    ctx.rejectResume = true;

    await expect(resumeIfSuspended()).resolves.toBeUndefined();
  });

  it("sin Web Audio: no-op silencioso, sin lanzar", async () => {
    deleteGlobalAudioContext();
    const { resumeIfSuspended } = await freshContextModule();

    await expect(resumeIfSuspended()).resolves.toBeUndefined();
  });
});
