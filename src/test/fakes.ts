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
// ducking); U13 añade stubs de navigator (wakeLock A2a, vibration B1).
import { vi } from "vitest";

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
  /** Instantes con los que se llamó cancelScheduledValues (ducking U11). */
  cancelScheduledValuesCalls: number[];
  setValueAtTime(value: number, time: number): void;
  linearRampToValueAtTime(value: number, time: number): void;
  exponentialRampToValueAtTime(value: number, time: number): void;
  cancelScheduledValues(cancelTime: number): void;
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

/** MediaElementSource falso (U11): el elemento queda ligado al grafo vía connect. */
export interface StubMediaElementSource {
  element: unknown;
  connectedTo: unknown[];
  connect(target: unknown): void;
}

/** Elemento <audio> falso (U11): registra TODO lo que el jugador le hace. */
export interface StubAudioElement {
  /** Último src asignado ("" tras removeAttribute). */
  src: string;
  loop: boolean;
  currentTime: number;
  playCalls: number;
  pauseCalls: number;
  /** Historial de asignaciones de src (para asertar swaps en orden). */
  srcSets: string[];
  /** Atributos eliminados (el jugador libera el recurso con removeAttribute). */
  removedAttributes: string[];
  play(): Promise<void>;
  pause(): void;
  removeAttribute(name: string): void;
}

/** Crea el elemento audio falso — nunca reproduce nada, solo registra. */
export function stubAudioElement(): StubAudioElement {
  const srcSets: string[] = [];
  const removedAttributes: string[] = [];
  let src = "";
  const el: StubAudioElement = {
    // Setter: cada asignación de src queda registrada (historial de swaps).
    get src() {
      return src;
    },
    set src(value: string) {
      src = value;
      srcSets.push(value);
    },
    loop: false,
    currentTime: 0,
    playCalls: 0,
    pauseCalls: 0,
    srcSets,
    removedAttributes,
    play() {
      el.playCalls += 1;
      return Promise.resolve();
    },
    pause() {
      el.pauseCalls += 1;
    },
    removeAttribute(name) {
      removedAttributes.push(name);
      if (name === "src") src = "";
    },
  };
  return el;
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
  /** Sources de media elements creados (U11: musicPlayer → duckGain). */
  mediaElementSources: StubMediaElementSource[];
  resumeCalls: number;
  createOscillator(): StubOscillatorNode;
  createGain(): StubGainNode;
  createMediaElementSource(element: unknown): StubMediaElementSource;
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
    cancelScheduledValuesCalls: [],
    setValueAtTime(value, time) {
      param.setValueAtTimeCalls.push({ value, time });
    },
    linearRampToValueAtTime(value, time) {
      param.linearRampToValueAtTimeCalls.push({ value, time });
    },
    exponentialRampToValueAtTime(value, time) {
      param.exponentialRampToValueAtTimeCalls.push({ value, time });
    },
    cancelScheduledValues(cancelTime) {
      param.cancelScheduledValuesCalls.push(cancelTime);
    },
  };
  return param;
}

/** Crea el AudioContext falso con reloj iniciado en startSeconds. */
export function stubAudioContext(startSeconds = 0): StubAudioContext {
  const oscillators: StubOscillatorNode[] = [];
  const gains: StubGainNode[] = [];
  const mediaElementSources: StubMediaElementSource[] = [];
  const ctx: StubAudioContext = {
    currentTime: startSeconds,
    state: "running",
    destination: { destination: true },
    oscillators,
    gains,
    mediaElementSources,
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
    createMediaElementSource(element) {
      const source: StubMediaElementSource = {
        element,
        connectedTo: [],
        connect(target) {
          source.connectedTo.push(target);
        },
      };
      mediaElementSources.push(source);
      return source;
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

// Screen Wake Lock (U13 A2a): fake de plataforma extraído del test A1
// (src/lib/pwa/wakeLock.test.ts) para reutilizarlo en A2b.

/** Sentinel falso: cuenta releases y guarda listeners del evento `release`. */
export class StubWakeLockSentinel {
  releaseCalls = 0;
  releaseListeners: Array<() => void> = [];

  release(): Promise<void> {
    this.releaseCalls += 1;
    return Promise.resolve();
  }

  addEventListener(_type: "release", listener: () => void): void {
    this.releaseListeners.push(listener);
  }

  /** El SISTEMA OPERATIVO libera el lock (dispara el evento `release`). */
  dispatchOsRelease(): void {
    for (const listener of [...this.releaseListeners]) listener();
  }
}

/** Petición de wake lock registrada (type + sentinel + resolutores). */
export interface WakeLockRequestRecord {
  type: string;
  sentinel: StubWakeLockSentinel;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

/**
 * Instala `navigator.wakeLock` con peticiones de resolución DIFERIDA: el
 * test decide cuándo responde `request()` — así se ejercitan las carreras
 * de peticiones en vuelo (deduplicación + token de generación, la carrera
 * del verificador). El stub es un PROXY del navigator real que solo
 * intercepta `wakeLock`: un `{ ...navigator }` pierde los getters (viven en
 * `Navigator.prototype`) y `Object.create(navigator)` rompe el brand-check
 * IDL de jsdom («not a valid instance of Navigator») — ambos hallados por
 * el RED del contrato A2a. A2b monta React sobre este stub. Restaurar con
 * `vi.unstubAllGlobals()` en el afterEach del test consumidor.
 */
export function installWakeLockFake(): { requests: WakeLockRequestRecord[] } {
  const requests: WakeLockRequestRecord[] = [];
  const wakeLock = {
    request(type: string): Promise<StubWakeLockSentinel> {
      const sentinel = new StubWakeLockSentinel();
      return new Promise<StubWakeLockSentinel>((resolve, reject) => {
        requests.push({
          type,
          sentinel,
          resolve: () => resolve(sentinel),
          reject,
        });
      });
    },
  };
  const stubbed =
    typeof navigator === "undefined"
      ? { wakeLock }
      : (new Proxy(navigator, {
          get(target, prop) {
            if (prop === "wakeLock") return wakeLock;
            // Receiver = target: los getters IDL de jsdom exigen un
            // `this` que sea instancia Navigator legítima.
            return Reflect.get(target, prop);
          },
          has(target, prop) {
            // Detección de features por `in` («wakeLock» in navigator).
            return prop === "wakeLock" || Reflect.has(target, prop);
          },
        }) as Navigator & { wakeLock: typeof wakeLock });
  vi.stubGlobal("navigator", stubbed);
  return { requests };
}

/**
 * Fake de Vibration API (U13 B1): GRABA cada patrón solicitado para que los
 * tests afirmen contra la constante nombrada. Mismo patrón Proxy que el fake
 * Wake Lock (A2a): preserva los getters IDL del navigator jsdom y la detección
 * por `in` ("vibrate" in navigator). Restaurar con `vi.unstubAllGlobals()` en
 * el afterEach del test consumidor.
 */
export function installVibrationFake(): {
  patterns: Array<number | number[]>;
} {
  const patterns: Array<number | number[]> = [];
  const vibrate = (pattern: number | number[]): boolean => {
    patterns.push(pattern);
    return true;
  };
  const stubbed =
    typeof navigator === "undefined"
      ? { vibrate }
      : (new Proxy(navigator, {
          get(target, prop) {
            if (prop === "vibrate") return vibrate;
            return Reflect.get(target, prop);
          },
          has(target, prop) {
            return prop === "vibrate" || Reflect.has(target, prop);
          },
        }) as Navigator & { vibrate: typeof vibrate });
  vi.stubGlobal("navigator", stubbed);
  return { patterns };
}
