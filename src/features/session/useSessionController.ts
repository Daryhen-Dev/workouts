"use client";

// Orquestación de efectos de la sesión (diseño §3.5) — U7.
//
// Cada observador vive como hook pequeño y reutilizable (requisito REFACTOR de
// tasks.md U7): U8 cablea el seam de completado, U10/U13 se cuelgan del flash de
// transición de fase (mismo tick del orquestador), U11 re-apunta música al
// retorno de visibilidad. El controlador SIEMPRE es delgado: toda la aritmética
// está en el motor; aquí solo hay suscripciones y efectos secundarios.

import { useEffect, useRef, useState } from "react";
import { buildHistoryEntry } from "@/lib/history/entry";
import type { HistoryEntry } from "@/lib/history/types";
import { SESSION_STATUS } from "@/lib/timer/types";
import { addHistoryEntry } from "@/stores/historyStore";
import {
  useSessionStore,
  type SessionCompletionData,
} from "@/stores/sessionStore";

/** Cadencia del ticker cosmético (§3.5). Nunca autoritativo: la verdad es computeView. */
export const TICKER_INTERVAL_MS = 250;

/** Duración del destello visual de transición de fase. */
export const FLASH_DURATION_MS = 600;

/**
 * Ticker — intervalo de 250 ms SOLO mientras `active` (corriendo y visible).
 * El intervalo se re-ancla en cada render (el propio tick provoca el render vía
 * refreshView): deriva ≈ latencia de render por tick, aceptable para un driver
 * cosmético que jamás acumula tiempo.
 */
export function useIntervalDriver(active: boolean, tick: () => void): void {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(tick, TICKER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, tick]);
}

/**
 * visibilitychange → recomputación inmediata (HARD GATE al retorno). Se refresca
 * en ambas direcciones: recomputar es barato y correcto en cualquier estado.
 */
export function useVisibilityChange(handler: (visible: boolean) => void): void {
  useEffect(() => {
    const onVisibility = () => handler(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [handler]);
}

/**
 * Flash visual de transición de fase — observador del índice de fase (§3.5).
 * El gancho observable es `data-flashing` + clase `phase-flash` en la pantalla;
 * U10 (cue de transición) y U13 (vibración) se emparejan en este mismo tick.
 */
export function usePhaseFlash(
  phaseIndex: number | null,
  durationMs: number = FLASH_DURATION_MS,
): boolean {
  const [flashing, setFlashing] = useState(false);
  const prevIndex = useRef<number | null>(phaseIndex);
  useEffect(() => {
    // null (completada/primera vista) no es transición: no destella.
    if (phaseIndex === null || phaseIndex === prevIndex.current) return;
    prevIndex.current = phaseIndex;
    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), durationMs);
    return () => clearTimeout(timer);
  }, [phaseIndex, durationMs]);
  return flashing;
}

/**
 * Observador de completado — dispara el seam EXACTAMENTE UNA vez por sesión,
 * sobre la TRANSICIÓN de status a completed (a través de re-renders y refreshes
 * posteriores). U8 lo cablea a historyStore.addEntry + /resumen vía
 * useCompletionWiring; los datos son del motor: config + elapsedActiveMs de la
 * vista completada (= totalActiveMs configurado, contrato engine U4).
 */
export function useCompletionObserver(): void {
  const view = useSessionStore((s) => s.view);
  const config = useSessionStore((s) => s.state?.config ?? null);
  const clock = useSessionStore((s) => s.clock);
  const onComplete = useSessionStore((s) => s.onComplete);
  const fired = useRef(false);

  useEffect(() => {
    if (view?.status !== SESSION_STATUS.completed) {
      fired.current = false; // re-arma para la próxima sesión
      return;
    }
    if (fired.current || config === null) return;
    fired.current = true;
    onComplete?.({
      config,
      elapsedActiveMs: view.elapsedActiveMs,
      completedAt: clock(),
    });
  }, [view, config, clock, onComplete]);
}

export interface SessionControllerApi {
  /** true mientras dura el destello de transición de fase. */
  flash: boolean;
}

/**
 * Cableado de completado (U8): registra en el seam U7 el callback real —
 * construye la HistoryEntry desde los datos del motor (conteos de esfuerzo
 * por modo), la añade al historial y navega a /resumen. El handler se registra
 * UNA vez con identidad estable (latest-ref para la navegación): re-registrar
 * en cada render provocaría un bucle set→render→efecto sobre el store.
 */
export function useCompletionWiring(
  navigateOnComplete: (to: "/resumen") => void,
): void {
  const setOnComplete = useSessionStore((s) => s.setOnComplete);
  const navigateRef = useRef(navigateOnComplete);

  useEffect(() => {
    navigateRef.current = navigateOnComplete;
  });

  useEffect(() => {
    const onComplete = (data: SessionCompletionData): void => {
      const entry: HistoryEntry = buildHistoryEntry(data);
      addHistoryEntry(entry);
      navigateRef.current("/resumen");
    };
    setOnComplete(onComplete);
    return () => setOnComplete(null);
  }, [setOnComplete]);
}

/** Composición de todos los observadores de la sesión activa (§3.5). */
export function useSessionController(): SessionControllerApi {
  const status = useSessionStore((s) => s.view?.status ?? null);
  const phaseIndex = useSessionStore((s) => s.view?.phase?.index ?? null);
  const refreshView = useSessionStore((s) => s.refreshView);
  const [visible, setVisible] = useState(
    () =>
      typeof document === "undefined" || document.visibilityState === "visible",
  );

  useVisibilityChange((nowVisible) => {
    setVisible(nowVisible);
    refreshView();
  });
  useIntervalDriver(status === SESSION_STATUS.running && visible, refreshView);
  const flash = usePhaseFlash(phaseIndex);
  useCompletionObserver();
  return { flash };
}
