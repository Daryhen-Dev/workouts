import { describe, expect, it } from "vitest";
import { createFakeClock } from "./clock";
import {
  computeView,
  displaySeconds,
  pauseSession,
  resumeSession,
  startSession,
} from "./engine";
import { compilePlan } from "./plan";
import {
  MODE,
  PHASE_KIND,
  SESSION_STATUS,
  type ClasicoConfig,
  type SessionState,
  type TabataConfig,
} from "./types";

// Motor de sesiones — diseño §3.3. Estas pruebas expresan las scenarios del
// spec timer-correctness LITERALMENTE con createFakeClock: la única operación
// de "suspensión" es avanzar el reloj y recomputar la vista con el now
// posterior — exactamente lo que hará el controlador real (§3.5).

const s = (sec: number): number => sec * 1000;

// Sesión Clásico del spec (preparación 10 s, trabajo 30 s, descanso 15 s,
// 2 rondas → 85 s): [0] Preparación [0,10) · [1] Trabajo [10,40) ·
// [2] Descanso [40,55) · [3] Trabajo [55,85).
const clasicoSpec: ClasicoConfig = {
  mode: MODE.clasico,
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

/** Estado corriendo posicionado en el primer trabajo con 20 s restantes (now = 20 s). */
function enPrimerTrabajoCon20s() {
  const clock = createFakeClock();
  const running = startSession(clasicoSpec, clock.now());
  clock.advance(s(20));
  return { clock, running };
}

describe("motor — ciclo básico", () => {
  it("startSession compila el plan internamente, ancla runningSince en now y retiene la config", () => {
    const clock = createFakeClock(1_000);
    const state = startSession(clasicoSpec, clock.now());

    expect(state.status).toBe(SESSION_STATUS.running);
    expect(state.plan).toEqual(compilePlan(clasicoSpec));
    expect(state.totalActiveMs).toBe(85_000);
    expect(state.runningSince).toBe(1_000);
    expect(state.accumulatedActiveMs).toBe(0);
    expect(state.config).toBe(clasicoSpec);
  });

  it("computeView al inicio muestra preparación con su valor completo y nextPhase trabajo", () => {
    const state = startSession(clasicoSpec, 0);
    const view = computeView(state, 0);

    expect(view.status).toBe(SESSION_STATUS.running);
    expect(view.phase?.kind).toBe(PHASE_KIND.preparacion);
    expect(view.remainingMs).toBe(10_000);
    expect(view.elapsedActiveMs).toBe(0);
    expect(view.nextPhase?.kind).toBe(PHASE_KIND.trabajo);
  });

  // Scenario "Pause freezes the countdown".
  it("pausar congela fase y restante aunque el reloj siga avanzando", () => {
    const { clock, running } = enPrimerTrabajoCon20s();
    const paused = pauseSession(running, clock.now());

    const frozen = computeView(paused, clock.now());
    expect(frozen.status).toBe(SESSION_STATUS.paused);
    expect(frozen.phase?.kind).toBe(PHASE_KIND.trabajo);
    expect(frozen.remainingMs).toBe(20_000);

    clock.advance(s(35)); // el reloj avanza 35 s — nada cambia mientras pausada
    expect(computeView(paused, clock.now())).toEqual(frozen);
  });

  // Scenario "Resume continues the same phase": trabajo continúa y completa
  // exactamente 20 s después en términos de reloj de pared.
  it("reanudar continúa la misma fase hasta completarla exactamente 20 s después (reloj de pared)", () => {
    const { clock, running } = enPrimerTrabajoCon20s();
    const paused = pauseSession(running, clock.now());

    clock.advance(s(5)); // pausada 5 s (no consume)
    const resumed = resumeSession(paused, clock.now()); // ancla en now = 25 s
    expect(resumed.status).toBe(SESSION_STATUS.running);
    expect(resumed.runningSince).toBe(s(25));

    // El trabajo termina en elapsed 40 s = now 45 s (25 s + 20 s de pared).
    const antesDelFin = computeView(resumed, s(45) - 1);
    expect(antesDelFin.phase?.kind).toBe(PHASE_KIND.trabajo);
    expect(antesDelFin.remainingMs).toBe(1);

    const enLaFrontera = computeView(resumed, s(45));
    expect(enLaFrontera.phase?.kind).toBe(PHASE_KIND.descanso);
    expect(enLaFrontera.remainingMs).toBe(s(15));
  });
});

// Sesión Tabata del scenario "Sleep/resume across multiple boundaries" con
// rondasPorTabata 2, tabatas 2, descansoLargo 30 s (total 180 s):
// [0] Prep [0,10) · [1] T1·Trabajo [10,40) · [2] Descanso [40,50) ·
// [3] T1·Trabajo [50,80) · [4] Largo [80,110) · [5] T2·Trabajo [110,140) ·
// [6] Descanso [140,150) · [7] T2·Trabajo [150,180).
// (`rondas` heredado es vestigial en Tabata — decisión U3.)
const tabataSleepSpec: TabataConfig = {
  mode: MODE.tabata,
  values: {
    preparacionS: 10,
    trabajoS: 30,
    descansoS: 10,
    rondas: 2,
    rondasPorTabata: 2,
    tabatas: 2,
    descansoLargoS: 30,
  },
};

describe("HARD GATE — verdad de reloj de pared tras suspensión", () => {
  // Scenario "Return from background mid-phase". El ±1 s del spec es
  // tolerancia de PANTALLA; el motor es exacto — se afirman valores exactos.
  it("background 5 s a mitad del primer trabajo → trabajo con exactamente 15 s restantes", () => {
    const { clock, running } = enPrimerTrabajoCon20s();
    clock.advance(s(5)); // suspendida 5 s (background)

    const view = computeView(running, clock.now());
    expect(view.status).toBe(SESSION_STATUS.running);
    expect(view.phase?.index).toBe(1);
    expect(view.phase?.kind).toBe(PHASE_KIND.trabajo);
    expect(view.remainingMs).toBe(15_000);
    expect(view.elapsedActiveMs).toBe(25_000);
  });

  // Scenario "Return from tab switch across a phase boundary": 50 s consumen
  // el resto del trabajo (20 s) + descanso (15 s) + 15 s del trabajo final.
  it("cambio de pestaña 50 s cruza frontera → trabajo FINAL con exactamente 15 s", () => {
    const { clock, running } = enPrimerTrabajoCon20s();
    clock.advance(s(50)); // otra pestaña 50 s

    const view = computeView(running, clock.now());
    expect(view.phase?.index).toBe(3);
    expect(view.phase?.kind).toBe(PHASE_KIND.trabajo);
    expect(view.phase?.label).toBe("Trabajo");
    expect(view.remainingMs).toBe(15_000);
    expect(view.elapsedActiveMs).toBe(70_000);
    expect(view.nextPhase).toBeNull(); // última fase del plan
  });

  // Scenario "Sleep/resume across multiple boundaries": duerme en el primer
  // trabajo del tabata 1 con 5 s restantes (elapsed 35 s); 120 s de sleep →
  // elapsed 155 s = fase final [150,180) con 25 s restantes — posición exacta
  // del calendario, cruzando SEIS fronteras de fase.
  it("sleep 120 s cruza múltiples fronteras → posición exacta del calendario", () => {
    const clock = createFakeClock();
    const running = startSession(tabataSleepSpec, clock.now());
    clock.advance(s(35)); // tabata 1 · trabajo 1, 5 s restantes
    expect(computeView(running, clock.now()).phase?.index).toBe(1);
    expect(computeView(running, clock.now()).remainingMs).toBe(5_000);

    clock.advance(s(120)); // el dispositivo duerme 120 s
    const view = computeView(running, clock.now());
    expect(view.phase?.index).toBe(7);
    expect(view.phase?.kind).toBe(PHASE_KIND.trabajo);
    expect(view.phase?.label).toBe("Tabata 2 · Trabajo");
    expect(view.remainingMs).toBe(25_000);
    expect(view.elapsedActiveMs).toBe(155_000);
  });

  // Scenario "Session completes while suspended": quedan 60 s configurados
  // (elapsed 25 s de 85 s) y la app queda suspendida 5 min. La entrada de
  // historial "exactamente una" es del controlador (U8); aquí se fija la
  // vista del motor: completada con los TOTALES CONFIGURADOS, idempotente.
  it("suspensión más allá del fin → completada con phase null, idempotente para cualquier now posterior", () => {
    const clock = createFakeClock();
    const running = startSession(clasicoSpec, clock.now());
    clock.advance(s(25)); // restan 60 s configurados
    clock.advance(s(300)); // suspendida 5 min

    const view = computeView(running, clock.now());
    expect(view.status).toBe(SESSION_STATUS.completed);
    expect(view.phase).toBeNull();
    expect(view.nextPhase).toBeNull();
    expect(view.remainingMs).toBe(0);
    expect(view.elapsedActiveMs).toBe(85_000); // totales CONFIGURADOS, no el sobrepaso

    expect(computeView(running, 400_000)).toEqual(view); // idempotente
    expect(computeView(running, 604_800_000)).toEqual(view);
  });

  // Scenario "Paused sessions do not consume time while suspended":
  // runningSince null ⇒ el tiempo de suspensión JAMÁS entra en la aritmética
  // — estructural, no un caso especial.
  it("pausada 2 min suspendida → sigue pausada con exactamente 20 s", () => {
    const { clock, running } = enPrimerTrabajoCon20s();
    const paused = pauseSession(running, clock.now());
    clock.advance(s(120)); // backgrounded 2 min estando pausada

    const view = computeView(paused, clock.now());
    expect(view.status).toBe(SESSION_STATUS.paused);
    expect(view.phase?.kind).toBe(PHASE_KIND.trabajo);
    expect(view.remainingMs).toBe(20_000);
    expect(view.elapsedActiveMs).toBe(20_000);
  });

  // Borde documentado del contrato: una pausa que llega cuando el reloj de
  // pared YA pasó el fin no puede congelar una sesión completada.
  it("pausa tardía (now pasado el fin) → la vista sigue siendo completada", () => {
    const running = startSession(clasicoSpec, 0);
    const latePaused = pauseSession(running, s(100)); // 15 s después del fin
    expect(latePaused.status).toBe(SESSION_STATUS.paused);

    const view = computeView(latePaused, s(100));
    expect(view.status).toBe(SESSION_STATUS.completed);
    expect(view.phase).toBeNull();
    expect(view.remainingMs).toBe(0);
    expect(view.elapsedActiveMs).toBe(85_000);
  });
});

// Scenario "Full-session drift is imperceptible": 85 s sin interrupciones
// muestreados cada 100 ms. Sin acumulación de ticks, las transiciones son
// comparaciones de frontera exactas — se observan EXACTAMENTE en su tiempo
// programado (la tolerancia del spec es ±1 s; aquí se afirma lo exacto).
describe("deriva imperceptible — 85 s muestreados cada 100 ms", () => {
  it("cada transición se observa exactamente en su frontera programada", () => {
    const clock = createFakeClock();
    const state = startSession(clasicoSpec, clock.now());
    const scheduledBoundaries = [10_000, 40_000, 55_000, 85_000];
    const observed: number[] = [];
    let lastIndex = -1; // -2 ⇒ ya completada

    for (let t = 0; t <= 85_000; t += 100) {
      clock.set(t);
      const view = computeView(state, clock.now());
      const currentIndex = view.phase ? view.phase.index : -2;
      if (currentIndex !== lastIndex) {
        if (lastIndex !== -1) observed.push(t); // primera muestra de la fase nueva
        lastIndex = currentIndex;
      }
    }

    expect(observed).toEqual(scheduledBoundaries);
  });

  it("elapsedActiveMs al completar es EXACTAMENTE totalActiveMs (85.000 ms)", () => {
    const state = startSession(clasicoSpec, 0);
    const view = computeView(state, 85_000);

    expect(view.status).toBe(SESSION_STATUS.completed);
    expect(view.elapsedActiveMs).toBe(85_000);
    expect(view.elapsedActiveMs).toBe(state.totalActiveMs);
  });

  it("la vista completada es idempotente para cualquier now posterior", () => {
    const state = startSession(clasicoSpec, 0);
    const atBoundary = computeView(state, 85_000);

    expect(computeView(state, 85_100)).toEqual(atBoundary);
    expect(computeView(state, 123_456_789)).toEqual(atBoundary);
  });
});

describe("displaySeconds — redondeo de pantalla (§3.4)", () => {
  it("ceil(remaining/1000): valor completo a la entrada, 0 exactamente en la frontera", () => {
    expect(displaySeconds(30_000)).toBe(30); // entrada de un trabajo de 30 s
    expect(displaySeconds(29_999)).toBe(30); // sigue “30” hasta la frontera
    expect(displaySeconds(25_000)).toBe(25);
    expect(displaySeconds(1_000)).toBe(1);
    expect(displaySeconds(999)).toBe(1);
    expect(displaySeconds(1)).toBe(1);
    expect(displaySeconds(0)).toBe(0); // 0 exactamente en la frontera
  });

  it("en la sesión de 85 s: entrada de fase muestra el valor completo; frontera pasa a la fase siguiente", () => {
    const state = startSession(clasicoSpec, 0);

    const atWorkEntry = computeView(state, 10_000); // entrada del trabajo 1
    expect(atWorkEntry.phase?.kind).toBe(PHASE_KIND.trabajo);
    expect(displaySeconds(atWorkEntry.remainingMs)).toBe(30);

    const beforeBoundary = computeView(state, 39_900); // última muestra de 100 ms
    expect(displaySeconds(beforeBoundary.remainingMs)).toBe(1);

    // Exactamente en la frontera: descanso ya entrado con SU valor completo.
    const atBoundary = computeView(state, 40_000);
    expect(atBoundary.phase?.kind).toBe(PHASE_KIND.descanso);
    expect(displaySeconds(atBoundary.remainingMs)).toBe(15);
  });
});

describe("guardas de transición de estado (contrato documentado)", () => {
  it("pause sobre una sesión ya pausada es no-op: MISMA referencia", () => {
    const { clock, running } = enPrimerTrabajoCon20s();
    const paused = pauseSession(running, clock.now());

    expect(pauseSession(paused, s(30))).toBe(paused);
  });

  it("resume sobre una sesión corriendo es no-op: MISMA referencia", () => {
    const running = startSession(clasicoSpec, 0);

    expect(resumeSession(running, 5_000)).toBe(running);
  });

  it("pause/resume sobre una sesión completada son no-op y la vista sigue completada", () => {
    // El motor no produce SessionState completada por sí mismo (la finaliza el
    // controlador en la transición, §3.5); se construye directamente porque el
    // contrato debe sostenerse ante cualquier estado válido.
    const completed: SessionState = {
      status: SESSION_STATUS.completed,
      plan: compilePlan(clasicoSpec),
      totalActiveMs: 85_000,
      runningSince: null,
      accumulatedActiveMs: 85_000,
      config: clasicoSpec,
    };

    expect(pauseSession(completed, 999_999)).toBe(completed);
    expect(resumeSession(completed, 999_999)).toBe(completed);
    expect(computeView(completed, 999_999).status).toBe(SESSION_STATUS.completed);
  });

  it("pausar en el instante exacto del anclaje no añade deriva (acumulado +0)", () => {
    const running = startSession(clasicoSpec, 1_000);
    const paused = pauseSession(running, 1_000);

    expect(paused.accumulatedActiveMs).toBe(0);
    const view = computeView(paused, 60_000); // 59 s suspendida pausada
    expect(view.status).toBe(SESSION_STATUS.paused);
    expect(view.phase?.kind).toBe(PHASE_KIND.preparacion);
    expect(view.remainingMs).toBe(10_000);
  });
});
