// Store de sesión EFÍMERO (U7 — reemplaza el seam U5). Diseño §4.1/§3.5:
// envoltura zustand del motor U4 con la vista cacheada y el reloj inyectado.
//
// CONTRATO PÚBLICO FIJO (tasks.md U5/U7):
//   `start(config)` — las pantallas de configuración llaman exactamente así y
//   luego navegan a /sesion. Se conserva como exportación imperativa (alias del
//   store) para que U5/U6 no cambien; los tests de U5 mockean este módulo con
//   `{ start }` — el mock sigue siendo válido.
//
// Decisiones documentadas:
// - NUNCA persistido (diseño §4.1): sin zustand persist, sin localStorage; una
//   recarga descarta la sesión (frontera honesta aceptada, diseño §13).
// - Los acciones mapean 1:1 a las funciones puras del motor: el store jamás
//   hace aritmética propia; la verdad de pantalla SIEMPRE es computeView.
// - `start(config, clock?)`: el reloj inyectado queda retenido para que todas
//   las acciones posteriores usen el mismo reloj (los tests inyectan FakeClock;
//   el default es systemClock = Date.now, §3.3).
// - Seam de completado para U8: `setOnComplete(cb)` registra el callback que el
//   observador del SessionController dispara EXACTAMENTE UNA VEZ al transicionar
//   el status de la vista a completed. El callback recibe los datos del motor
//   (config + elapsedActiveMs de la vista completada + completedAt); U8 lo cablea
//   a historyStore.addEntry + navegación a /resumen. En U7 nadie lo registra por
//   defecto — la sesión completada simplemente se muestra (sin resumen aún).

import { create } from "zustand";
import { systemClock, type Clock } from "@/lib/timer/clock";
import {
  computeView,
  pauseSession,
  resumeSession,
  startSession,
} from "@/lib/timer/engine";
import type { SessionConfig, SessionState, SessionView } from "@/lib/timer/types";

/** Datos del motor que el seam entrega a U8 en la completación natural. */
export interface SessionCompletionData {
  /** Config retenida por la sesión (fuente de conteos de esfuerzo del resumen). */
  config: SessionConfig;
  /** elapsedActiveMs de la vista completada (= totalActiveMs configurado, contrato engine U4). */
  elapsedActiveMs: number;
  /** Reloj en el momento de la detección (fecha de completado). */
  completedAt: number;
}

export type SessionCompletionCallback = (data: SessionCompletionData) => void;

interface SessionStoreState {
  /** Estado del motor; null ⇒ no hay sesión (guarda de /sesion). */
  state: SessionState | null;
  /** Vista cacheada (computeView); se actualiza con refreshView. */
  view: SessionView | null;
  /** Reloj inyectado en start (default systemClock). */
  clock: Clock;
  /** Seam U8: callback de completado natural (disparado por SessionController). */
  onComplete: SessionCompletionCallback | null;
  setOnComplete: (cb: SessionCompletionCallback | null) => void;
  /** Compila el plan y arranca (reemplaza cualquier sesión en curso). */
  start: (config: SessionConfig, clock?: Clock) => void;
  /** running → paused (no-op del motor si ya está pausada/completada). */
  pause: () => void;
  /** paused → running (no-op del motor si ya está corriendo/completada). */
  resume: () => void;
  /** Descarta la sesión por completo (la UI confirma antes de llamar). */
  stop: () => void;
  /** Recomputa la vista cacheada con el reloj actual (ticker/visibility). */
  refreshView: () => void;
}

export const useSessionStore = create<SessionStoreState>()((set, get) => ({
  state: null,
  view: null,
  clock: systemClock,
  onComplete: null,
  setOnComplete: (cb) => set({ onComplete: cb }),
  start: (config, clock) => {
    const clk = clock ?? get().clock;
    const now = clk();
    const state = startSession(config, now);
    set({ clock: clk, state, view: computeView(state, now) });
  },
  pause: () => {
    const { state, clock } = get();
    if (!state) return;
    const now = clock();
    const next = pauseSession(state, now);
    set({ state: next, view: computeView(next, now) });
  },
  resume: () => {
    const { state, clock } = get();
    if (!state) return;
    const now = clock();
    const next = resumeSession(state, now);
    set({ state: next, view: computeView(next, now) });
  },
  stop: () => set({ state: null, view: null }),
  refreshView: () => {
    const { state, clock } = get();
    if (!state) return;
    set({ view: computeView(state, clock()) });
  },
}));

/**
 * Arranque imperativo — mismo contrato del seam U5 (`start(config)`) que las
 * pantallas Clásico/Tabata/Personalizado ya llaman; el reloj es opcional y solo
 * lo inyectan los tests.
 */
export function start(config: SessionConfig, clock?: Clock): void {
  useSessionStore.getState().start(config, clock);
}
