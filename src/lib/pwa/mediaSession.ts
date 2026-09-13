// Adaptador Media Session — U13 C1 (diseño §8.4, spec pwa «Media Session
// Controls While Music Plays»). Primitiva BEST EFFORT para un futuro driver
// (C2): metadata + handlers play/pause/stop. El driver aporta las entradas
// (título del modo desde copy, callbacks del temporizador) y decide CUÁNDO
// exponerlas (solo con música de fase activa) — este módulo NO importa copy
// ni el session store.
//
// Contrato:
// - SSR-seguro: nada se evalúa en el nivel superior del módulo; los globals
//   se tocan solo dentro de las funciones.
// - Sin navigator.mediaSession → no-op silencioso (jamás gatea la sesión;
//   sesión solo-beeps plenamente usable: spec pwa «Beep-only degradation»).
// - Registra EXACTAMENTE play, pause y stop (diseño §8.4: play→reanudar,
//   pause→pausar, stop→descartar; el mapeo lo cablea C2).
// - Fallos SÍNCRONOS tragados Y AISLADOS POR ACCIÓN: un fallo registrando o
//   limpiando una acción no impide las demás (degradación nunca rompe).
// - Metadata best effort: MediaMetadata si existe; objeto plano si no.
// - Limpieza INDIVIDUAL por acción (setActionHandler(name, null)) para el
//   fin de sesión.

/** Acciones Media Session que registra el adaptador — exactamente estas tres. */
export const MEDIA_SESSION_ACTIONS = ["play", "pause", "stop"] as const;

export type MediaSessionAction = (typeof MEDIA_SESSION_ACTIONS)[number];

/** Metadata que identifica la sesión (diseño §8.4: título + artista). */
export interface SessionMediaMetadata {
  title: string;
  artist?: string;
}

/** Callbacks del temporizador que el driver C2 cablea a las acciones. */
export interface SessionMediaHandlers {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

/** Forma estructural mínima de navigator.mediaSession (independiente de lib.dom). */
interface MediaSessionLike {
  metadata: unknown;
  setActionHandler(action: string, handler: (() => void) | null): void;
}

function getMediaSession(): MediaSessionLike | null {
  if (typeof navigator === "undefined") return null;
  const session = (navigator as { mediaSession?: MediaSessionLike }).mediaSession;
  return session && typeof session.setActionHandler === "function" ? session : null;
}

/** Metadata best effort: instancia MediaMetadata si existe; objeto plano si no. */
function buildMetadata(metadata: SessionMediaMetadata): unknown {
  const init = { title: metadata.title, artist: metadata.artist };
  const ctor = (globalThis as { MediaMetadata?: new (init: unknown) => unknown })
    .MediaMetadata;
  return typeof ctor === "function" ? new ctor(init) : init;
}

/** Expone metadata y registra EXACTAMENTE play/pause/stop. No-op sin la API. */
export function setSessionMedia(
  metadata: SessionMediaMetadata,
  handlers: SessionMediaHandlers,
): void {
  const session = getMediaSession();
  if (session === null) return; // sin API / SSR → silencio (spec pwa)
  try {
    session.metadata = buildMetadata(metadata);
  } catch {
    // La metadata es best effort; los handlers son lo esencial — se sigue.
  }
  const byAction: Record<MediaSessionAction, () => void> = {
    play: handlers.onPlay,
    pause: handlers.onPause,
    stop: handlers.onStop,
  };
  for (const action of MEDIA_SESSION_ACTIONS) {
    try {
      session.setActionHandler(action, byAction[action]);
    } catch {
      // Un fallo de UNA acción no impide el registro de las demás.
    }
  }
}

/** Limpia los handlers de sesión uno a uno (null). No-op sin la API. */
export function clearSessionMediaHandlers(): void {
  const session = getMediaSession();
  if (session === null) return;
  for (const action of MEDIA_SESSION_ACTIONS) {
    try {
      session.setActionHandler(action, null);
    } catch {
      // Limpieza individual: un fallo no bloquea las demás acciones.
    }
  }
}
