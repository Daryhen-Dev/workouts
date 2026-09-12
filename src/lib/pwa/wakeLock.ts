// Adaptador Screen Wake Lock — U13 A1 (diseño §8.4, spec pwa «Wake Lock
// During Active Workout»). Esta unidad entrega SOLO el adaptador correcto a
// nivel de plataforma; el cableo con el ciclo de vida de la sesión (running/
// paused, retorno visible, fin, desmontaje) es A2.
//
// Contrato:
// - SSR-seguro: NADA se evalúa en el nivel superior del módulo; los globals
//   se tocan solo dentro de las funciones. Sin Wake Lock (o sin navegador)
//   todo es no-op silencioso — el lock es una mejora progresiva, jamás una
//   dependencia de la sesión (spec pwa «Unsupported platforms skip silently»).
// - Política de plataforma: JAMÁS se pide con la página oculta (la petición
//   abortaría); onVisibleReturn() re-pide si el lock sigue querido.
// - Carreras (la del verificador): toda petición en vuelo está DEDUPLICADA
//   (una sola petición concurrente) y sellada con un TOKEN DE GENERACIÓN;
//   un resultado tardío o invalidado NUNCA sobreescribe un sentinel vigente
//   ni queda huérfano — se suelta en el acto.
// - Soltado inesperado EN PRIMER PLANO (evento `release` del sentinel):
//   re-petición INMEDIATA.
// - release()/dispose() son idempotentes y jamás lanzan.

/** Mínima forma estructural del sentinel que este adaptador consume. */
export interface WakeLockSentinelLike {
 release(): Promise<void>;
 addEventListener(type: "release", listener: () => void): void;
}

interface WakeLockApiLike {
 request(type: "screen"): Promise<WakeLockSentinelLike>;
}

export interface WakeLockController {
 /** El llamador quiere el lock (sesión running o paused). Difiere si está oculto. */
 acquire(): void;
 /** Gancho para visibilitychange→visible: re-pide si el lock sigue querido. */
 onVisibleReturn(): void;
 /** Fin de sesión / descarte: el llamador ya no quiere el lock. Idempotente. */
 release(): void;
 /** Desmontaje: suelta y desactiva el adaptador permanentemente. Idempotente. */
 dispose(): void;
}

/** Soft-typing estructural: independiente de la versión de lib.dom. */
function getWakeLockApi(): WakeLockApiLike | null {
 if (typeof navigator === "undefined") return null;
 const api = (navigator as { wakeLock?: WakeLockApiLike }).wakeLock;
 return api ?? null;
}

function isPageVisible(): boolean {
 return (
  typeof document !== "undefined" && document.visibilityState === "visible"
 );
}

/** release() de plataforma puede rechazar; el lock jamás rompe la sesión. */
function safelyRelease(sentinel: WakeLockSentinelLike): void {
 sentinel.release().catch(() => {});
}

export function createWakeLockController(): WakeLockController {
 let sentinel: WakeLockSentinelLike | null = null;
 let wanted = false;
 let disposed = false;
 // Token de generación: release()/dispose() lo incrementan y con ello
 // invalidan toda petición en vuelo — su resultado tardío se suelta, nunca se
 // activa (guarda contra el sentinel huérfano hallado por el verificador).
 let generation = 0;
 // Guardia de petición en vuelo (deduplicación): { gen } de la petición activa.
 let inFlight: { gen: number } | null = null;

 function requestLock(): void {
  const api = getWakeLockApi();
  if (api === null) return; // sin Wake Lock → no-op silencioso (spec pwa)
  if (!isPageVisible()) return; // jamás pedir oculto
  if (sentinel !== null) return; // ya retenido → idempotente
  if (inFlight !== null && inFlight.gen === generation) return; // ya pedida

  const gen = generation;
  inFlight = { gen };
  api.request("screen").then(
   (resolved) => {
    if (inFlight !== null && inFlight.gen === gen) inFlight = null;
    onResolved(resolved, gen);
   },
   () => {
    if (inFlight !== null && inFlight.gen === gen) inFlight = null;
    // Rechazo silencioso (AbortError/NotAllowedError/…): sin bucles de
    // reintento; el próximo acquire/retorno visible vuelve a intentarlo.
   },
  );
 }

 function onResolved(resolved: WakeLockSentinelLike, gen: number): void {
  if (gen !== generation || !wanted) {
   // Resultado TARDÍO/invalidado (release|dispose durante el vuelo): el
   // sentinel NO puede activarse — se suelta en el acto (cero huérfanos).
   safelyRelease(resolved);
   return;
  }
  if (sentinel !== null) {
   // Defensa del invariante: jamás sobreescribir un sentinel sin soltar.
   safelyRelease(resolved);
   return;
  }
  sentinel = resolved;
  resolved.addEventListener("release", () => onSentinelReleased(resolved));
 }

 function onSentinelReleased(released: WakeLockSentinelLike): void {
  // Evento `release` de plataforma (el SO soltó el lock). Nuestro propio
  // release() anula `sentinel` ANTES de soltar, así que llegar aquí con el
  // sentinel vigente significa soltado INESPERADO.
  if (sentinel !== released) return;
  sentinel = null;
  if (wanted && !disposed && isPageVisible()) {
   requestLock(); // primer plano: re-petición inmediata
  }
 }

 function dropSentinel(): void {
  const held = sentinel;
  sentinel = null; // antes de release(): el evento `release` no debe re-pedir
  if (held !== null) safelyRelease(held);
 }

 return {
  acquire() {
   if (disposed) return;
   wanted = true;
   requestLock();
  },
  onVisibleReturn() {
   if (disposed || !wanted) return;
   requestLock();
  },
  release() {
   wanted = false;
   generation += 1; // invalida la petición en vuelo (token guard)
   dropSentinel();
  },
  dispose() {
   if (disposed) return;
   disposed = true;
   this.release(); // wanted=false + invalida el vuelo + suelta el sentinel
  },
 };
}
