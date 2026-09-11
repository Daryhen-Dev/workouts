// Fakes de pruebas — diseño §11.1 (add-pwa-workout-timer).
//
// `stubAudioContext` (U10): AudioContext falso a mano — jsdom/Node no tienen
// Web Audio (verificado). REGISTRA cada llamada de programación (osciladores,
// ganancias, arranques/paradas) para que los tests afirmen tiempos EXACTOS en
// el reloj del contexto; no reproduce audio (no hay hilo de audio).
//
// Convención de cancelación que asumen los tests de U10: el sintetizador
// programa exactamente UNA llamada stop(t) por oscilador al crearlo; una
// cancelación añade una llamada stop PRECOZ. `blips().canceled` marca esa
// condición. U11 extiende este archivo (media element source, ganancia de
// ducking); U13 añade stubs de navigator.

/** Registro de una llamada parametrizada (valor + instante del reloj del contexto). */
export interface StubParamCall {
  value: number;
  time: number;
}

/** AudioParam falso: valor + historial de automatización. */
export interface StubAudioParam {
  value: number;
  setValueAtTimeCalls: StubParamCall[];
  linearRampToValueAtTimeCalls: StubParamCall[];
  exponentialRampToValueAtTimeCalls: StubParamCall[];
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
}

/** GainNode falso: param `gain` + conexiones/desconexiones registradas. */
export interface StubGainNode {
  gain: StubAudioParam;
  connectedTo: unknown[];
  disconnectCalls: number;
  connect(target: unknown): void;
  disconnect(): void;
}

/** OscillatorNode falso: frecuencia fija + arranques/paradas registrados. */
export interface StubOscillatorNode {
  type: OscillatorType;
  frequency: StubAudioParam;
  connectedTo: unknown[];
  onended: (() => void) | null;
  startCalls: number[];
  stopCalls: number[];
  connect(target: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
}

/** Resumen por blip para aserciones rápidas. */
export interface StubBlip {
  frequencyHz: number;
  /** Primer start() (instante del reloj del contexto). */
  startedAt: number;
  /** Última parada registrada (la programada al crear o la precoz de cancelar). */
  stopAt: number;
  /** true cuando hubo una parada EXTRA además de la programada al crear. */
  canceled: boolean;
}

export interface StubAudioContext {
  /** Reloj del contexto en SEGUNDOS — el único tiempo real de Web Audio. */
  currentTime: number;
  state: AudioContextState;
  destination: object;
  oscillators: StubOscillatorNode[];
  gains: StubGainNode[];
  resumeCalls: number;
  createOscillator(): StubOscillatorNode;
  createGain(): StubGainNode;
  resume(): Promise<void>;
  /** Avanza el reloj del contexto (los nodos NO se disparan solos). */
  advanceTime(seconds: number): void;
  /** Resumen de blips programados, en orden de creación. */
  blips(): StubBlip[];
}

function makeParam(): StubAudioParam {
  const param: StubAudioParam = {
    value: 0,
    setValueAtTimeCalls: [],
    linearRampToValueAtTimeCalls: [],
    exponentialRampToValueAtTimeCalls: [],
    setValueAtTime(value, time) {
      param.setValueAtTimeCalls.push({ value, time });
    },
    linearRampToValueAtTime(value, time) {
      param.linearRampToValueAtTimeCalls.push({ value, time });
    },
    exponentialRampToValueAtTime(value, time) {
      param.exponentialRampToValueAtTimeCalls.push({ value, time });
    },
  };
  return param;
}

/** Crea el AudioContext falso con reloj iniciado en startSeconds. */
export function stubAudioContext(startSeconds = 0): StubAudioContext {
  const oscillators: StubOscillatorNode[] = [];
  const gains: StubGainNode[] = [];
  const ctx: StubAudioContext = {
    currentTime: startSeconds,
    state: "running",
    destination: { destination: true },
    oscillators,
    gains,
    resumeCalls: 0,
    createOscillator() {
      const osc: StubOscillatorNode = {
        type: "sine",
        frequency: makeParam(),
        connectedTo: [],
        onended: null,
        startCalls: [],
        stopCalls: [],
        connect(target) {
          osc.connectedTo.push(target);
        },
        start(when = 0) {
          osc.startCalls.push(when);
        },
        stop(when = 0) {
          osc.stopCalls.push(when);
        },
      };
      oscillators.push(osc);
      return osc;
    },
    createGain() {
      const gain: StubGainNode = {
        gain: makeParam(),
        connectedTo: [],
        disconnectCalls: 0,
        connect(target) {
          gain.connectedTo.push(target);
        },
        disconnect() {
          gain.disconnectCalls += 1;
        },
      };
      gains.push(gain);
      return gain;
    },
    async resume() {
      ctx.resumeCalls += 1;
      ctx.state = "running";
    },
    advanceTime(seconds) {
      ctx.currentTime += seconds;
    },
    blips() {
      return oscillators.map((osc) => ({
        frequencyHz: osc.frequency.value,
        startedAt: osc.startCalls[0] ?? -1,
        stopAt: osc.stopCalls.at(-1) ?? -1,
        canceled: osc.stopCalls.length > 1,
      }));
    },
  };
  return ctx;
}
