// Tipos del núcleo del temporizador — diseño §3.1 (add-pwa-workout-timer).
//
// Módulo PURO: sin React, sin APIs del navegador. Estas formas son el contrato
// entre el compilador de planes (plan.ts), el motor de sesiones (engine.ts, U4)
// y la capa de persistencia (U8+ serializa SessionConfig en rutinas).
//
// Nota de diseño: `TabataValues extends ClasicoValues` es reutilización de
// interfaz del propio diseño — el campo heredado `rondas` es VESTIGIAL para
// Tabata: la compilación usa exclusivamente `rondasPorTabata` (el spec define
// Tabata con seis valores; "rondas por tabata" es el conteo real).

export const PHASE_KIND = {
  preparacion: "preparacion",
  trabajo: "trabajo",
  descanso: "descanso",
  descansoLargo: "descansoLargo",
  descansoGlobal: "descansoGlobal",
} as const;
export type PhaseKind = (typeof PHASE_KIND)[keyof typeof PHASE_KIND];

export const MODE = {
  clasico: "clasico",
  tabata: "tabata",
  personalizado: "personalizado",
} as const;
export type ModeId = (typeof MODE)[keyof typeof MODE];

export interface ClasicoValues {
  preparacionS: number;
  trabajoS: number;
  descansoS: number;
  rondas: number;
}

export interface TabataValues extends ClasicoValues {
  rondasPorTabata: number;
  tabatas: number;
  descansoLargoS: number;
}

/** Bloque del constructor Personalizado (id estable para claves de React y reordenar). */
export interface BlockDef {
  id: string;
  tipo: typeof MODE.clasico | typeof MODE.tabata;
  values: ClasicoValues | TabataValues;
}

export interface ClasicoConfig {
  mode: typeof MODE.clasico;
  values: ClasicoValues;
}

export interface TabataConfig {
  mode: typeof MODE.tabata;
  values: TabataValues;
}

export interface PersonalizadoConfig {
  mode: typeof MODE.personalizado;
  descansoGlobalS: number;
  blocks: BlockDef[];
}

export type SessionConfig =
  | ClasicoConfig
  | TabataConfig
  | PersonalizadoConfig;

export interface ScheduledPhase {
  /** 0..n-1, posición en el plan compilado. */
  index: number;
  kind: PhaseKind;
  /** Duración en ms (segundos enteros × 1000). */
  durationMs: number;
  /** Offset acumulado en TIEMPO ACTIVO (excluye pausas). */
  startOffsetMs: number;
  /** Etiqueta de pantalla en español con contexto, p. ej. "Tabata 2 · Trabajo". */
  label: string;
}

export type PhasePlan = readonly ScheduledPhase[];

export const SESSION_STATUS = {
  running: "running",
  paused: "paused",
  completed: "completed",
} as const;
export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// ——— Tipos del motor (U4 es dueño de engine.ts/clock.ts; estas interfaces
// son parte del contrato §3.1 y no tienen lógica propia). ———

export interface SessionState {
  status: SessionStatus;
  plan: PhasePlan;
  /** Suma de duraciones del plan. */
  totalActiveMs: number;
  /** Ancla de reloj de pared (ms) del segmento en curso; null ⇒ pausada/completada. */
  runningSince: number | null;
  /** ms activos de segmentos completados (excluye todo tiempo de pausa). */
  accumulatedActiveMs: number;
  /** Config retenida para el resumen/conteos de esfuerzo. */
  config: SessionConfig;
}

export interface SessionView {
  status: SessionStatus;
  /** null cuando la sesión está completada. */
  phase: ScheduledPhase | null;
  nextPhase: ScheduledPhase | null;
  /** Restante dentro de la fase (congelado en pausa). */
  remainingMs: number;
  /** Activo transcurrido de la sesión (fuente del resumen). */
  elapsedActiveMs: number;
}

/** Reloj inyectable en ms; por defecto Date.now (reloj de pared, sobrevive la suspensión del dispositivo). */
export type Clock = () => number;
