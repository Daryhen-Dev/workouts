// musicPlayer (U11 — diseño §6.3) — jugador de música por fase.
//
// UN elemento <audio> oculto de larga vida (nunca se monta en el DOM), cableado
// UNA sola vez vía createMediaElementSource → duckGain → destino cuando existe
// Web Audio; sin Web Audio el elemento suena directo (sin ducking — música aún
// funcional, degradación honesta). El grafo de ducking lo comparte con los beeps.
//
// Ciclo de vida de URLs (contrato REFACTOR U11): el jugador posee EXACTAMENTE
// UNA URL de objeto activa. Cada swap revoca la URL saliente TRAS instalar la
// entrante; stop/retarget-sin-asignación revoca la activa. Nunca hay fugas ni
// dobles activas.
//
// Carreras: cada retarget toma un número de secuencia; una resolución tardía
// (el usuario cambió de fase mientras se buscaba el blob) se descarta y SU URL
// se revoca — el vigente siempre es el último retarget.
//
// Degradación: sin <audio> (SSR/entornos raros) todo es no-op; IndexedDB caído
// o pista huérfana → silencio sin crash (la sesión nunca se ve afectada).
//
// Ducking: NO vive aquí — la automatización de duckGain se empareja con los
// cues de beeps en useCueScheduler (mismo ancla, mismo tick del orquestador).

import type { PhaseKind, ScheduledPhase } from "@/lib/timer/types";
import type { TrackId } from "@/lib/storage/musicStore";
import { getAudioContext } from "./context";
import { getDuckGain } from "./duckGain";
import { musicStore, type MusicStore } from "@/lib/storage/musicStore";
import { useSettingsStore } from "@/stores/settingsStore";

/** Lo que el jugador necesita del elemento — mínimo estructural (stub testeable). */
export interface PlayerAudioElement {
  src: string;
  loop: boolean;
  currentTime: number;
  play(): Promise<void> | void;
  pause(): void;
  removeAttribute(name: "src"): void;
}

/** Dependencias inyectables — los tests aportan elemento/store/revocación falsos. */
export interface MusicPlayerDeps {
  /** Elemento de larga vida; null si el entorno no tiene <audio>. */
  createElement?: () => PlayerAudioElement | null;
  /** Cableado al grafo de Web Audio; por defecto createMediaElementSource → duckGain. */
  wireElement?: (element: PlayerAudioElement) => void;
  /** Acceso a blobs — IndexedDB queda detrás de la interfaz MusicStore. */
  store?: Pick<MusicStore, "getObjectUrl">;
  /** Asignación vigente por clase de fase; por defecto, settingsStore. */
  getAssignment?: (kind: PhaseKind) => TrackId | null;
  /** Revocación de URLs de objeto; por defecto URL.revokeObjectURL. */
  revokeUrl?: (url: string) => void;
}

export interface MusicPlayer {
  /** Re-apunta la música a `phase`: saliente para, entrante desde 0 (con loop). */
  retargetToPhase(phase: ScheduledPhase): Promise<void>;
  /** Pausa el elemento — posición preservada nativamente (spec audio). */
  pauseMusic(): void;
  /** Reanuda el elemento SIN reiniciar (posición preservada). */
  resumeMusic(): void;
  /** Detiene y libera la URL activa; seguro llamarlo cualquier número de veces. */
  stopMusic(): void;
}

function defaultCreateElement(): PlayerAudioElement | null {
  if (typeof Audio === "undefined") return null;
  // SAFETY: HTMLAudioElement satisface PlayerAudioElement por estructura (src,
  // loop, currentTime, play, pause, removeAttribute); el cast solo estrecha el
  // tipo al subconjunto que el jugador consume.
  return new Audio() as unknown as PlayerAudioElement;
}

function defaultWireElement(element: PlayerAudioElement): void {
  const ctx = getAudioContext();
  const gain = getDuckGain();
  if (!ctx || !gain) return; // sin Web Audio: el elemento suena directo
  // SAFETY: en la ruta por defecto el elemento SIEMPRE es un Audio() real
  // (defaultCreateElement); los elementos inyectados por tests son stubs y
  // nunca llegan aquí porque sus tests inyectan wireElement propio.
  ctx
    .createMediaElementSource(element as unknown as HTMLAudioElement)
    .connect(gain);
}

function defaultRevokeUrl(url: string): void {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

/** play() best-effort: la promesa puede rechazarse por políticas de autoplay. */
function safePlay(element: PlayerAudioElement): void {
  void Promise.resolve(element.play()).catch(() => {});
}

export function createMusicPlayer(deps: MusicPlayerDeps = {}): MusicPlayer {
  const createElement = deps.createElement ?? defaultCreateElement;
  const wireElement = deps.wireElement ?? defaultWireElement;
  const store = deps.store ?? musicStore;
  const getAssignment =
    deps.getAssignment ??
    ((kind: PhaseKind) => useSettingsStore.getState().assignments[kind]);
  const revokeUrl = deps.revokeUrl ?? defaultRevokeUrl;

  let element: PlayerAudioElement | null = null;
  let wired = false;
  let activeUrl: string | null = null;
  let activeTrackId: TrackId | null = null;
  let retargetSeq = 0;

  /** Asegura el elemento de larga vida (creado + cableado UNA vez). */
  function ensureElement(): PlayerAudioElement | null {
    if (element === null) {
      element = createElement();
      if (element !== null) element.loop = true;
    }
    if (element !== null && !wired) {
      wireElement(element);
      wired = true;
    }
    return element;
  }

  /** Silencio + liberación de la URL activa — idempotente. */
  function stopInternal(): void {
    if (element !== null) {
      element.pause();
      element.removeAttribute("src"); // libera el recurso del elemento
    }
    if (activeUrl !== null) {
      revokeUrl(activeUrl);
      activeUrl = null;
    }
    activeTrackId = null;
  }

  return {
    async retargetToPhase(phase) {
      const el = ensureElement();
      if (el === null) return; // sin <audio>: no-op total

      const trackId = getAssignment(phase.kind);
      if (trackId === null) {
        stopInternal(); // fase sin asignación: silencio salvo beeps
        return;
      }
      if (trackId === activeTrackId && activeUrl !== null) {
        // Misma pista (p. ej. re-apuntado tras suspensión): desde 0, sin churn.
        el.currentTime = 0;
        el.loop = true;
        safePlay(el);
        return;
      }

      const seq = ++retargetSeq;
      let url: string;
      try {
        url = await store.getObjectUrl(trackId);
      } catch {
        stopInternal(); // huérfana/IDB caído: silencio, la sesión sigue
        return;
      }
      if (seq !== retargetSeq) {
        revokeUrl(url); // llegó tarde: pierde contra un retarget más nuevo
        return;
      }

      const oldUrl = activeUrl;
      if (oldUrl !== null) el.pause(); // la saliente se detiene en el swap
      el.src = url;
      el.loop = true;
      el.currentTime = 0; // la entrante arranca desde 0 (spec)
      activeUrl = url;
      activeTrackId = trackId;
      safePlay(el);
      if (oldUrl !== null) revokeUrl(oldUrl); // TRAS el swap: nunca queda doble
    },

    pauseMusic() {
      element?.pause();
    },

    resumeMusic() {
      if (element === null || activeUrl === null) return;
      safePlay(element); // reanudación nativa: posición preservada
    },

    stopMusic() {
      stopInternal();
    },
  };
}

/** Instancia por defecto de la app (elemento real + musicStore + settingsStore). */
export const musicPlayer: MusicPlayer = createMusicPlayer();

// Funciones sueltas (contrato del cableado del controlador — patrón musicStore).
export function retargetToPhase(phase: ScheduledPhase): Promise<void> {
  return musicPlayer.retargetToPhase(phase);
}
export function pauseMusic(): void {
  musicPlayer.pauseMusic();
}
export function resumeMusic(): void {
  musicPlayer.resumeMusic();
}
export function stopMusic(): void {
  musicPlayer.stopMusic();
}
