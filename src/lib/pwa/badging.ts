// Adaptador App Badging — U13 B2 (diseño §8.4, spec pwa «App Badging»). Un
// badge de sesión activa mientras la sesión vive; se limpia al terminar
// (completada o descartada). Chromium expone setAppBadge/clearAppBadge;
// Firefox/Safari sin la API → no-op silencioso. Distinguir la pausa es MAY
// del spec y NO se usa: un solo badge de sesión, sin marcador (el placeholder
// "II" del diseño no es válido para la API numérica).
//
// Contrato:
// - SSR-seguro: nada se evalúa en el nivel superior del módulo; los globals
//   se tocan solo dentro de las funciones.
// - Sin Badging API → no-op silencioso (jamás gatea la sesión).
// - Fallos SÍNCRONOS de la API y promesas rechazadas tragados — la sesión
//   jamás se rompe por un badge (spec pwa: degradation never breaks).

/** Forma estructural mínima de setAppBadge/clearAppBadge (independiente de lib.dom). */
type BadgingApiLike = (contents?: number) => Promise<void>;

function getBadgingApis(): { set: BadgingApiLike | null; clear: BadgingApiLike | null } {
  if (typeof navigator === "undefined") return { set: null, clear: null };
  const nav = navigator as {
    setAppBadge?: BadgingApiLike;
    clearAppBadge?: BadgingApiLike;
  };
  return {
    set: typeof nav.setAppBadge === "function" ? nav.setAppBadge : null,
    clear: typeof nav.clearAppBadge === "function" ? nav.clearAppBadge : null,
  };
}

/** Mejor esfuerzo: el rechazo (NotAllowedError, etc.) y los fallos síncronos se tragan. */
function safelyInvoke(api: BadgingApiLike, receiver: Navigator): void {
  try {
    void Promise.resolve(api.call(receiver)).catch(() => {});
  } catch {
    // El badge jamás rompe la sesión (spec pwa: degradation never breaks).
  }
}

/** Muestra el badge de sesión activa (badge por defecto, SIN marcador de pausa). */
export function setSessionBadge(): void {
  const { set } = getBadgingApis();
  if (set === null) return; // Firefox/Safari/SSR → silencio (spec pwa)
  safelyInvoke(set, navigator);
}

/** Limpia el badge de sesión (idempotente en plataforma). No-op sin Badging API. */
export function clearSessionBadge(): void {
  const { clear } = getBadgingApis();
  if (clear === null) return;
  safelyInvoke(clear, navigator);
}
