"use client";

// SettingsScreen — única entrada cliente de /ajustes (§2.3, U11). Posee la
// biblioteca de música (importar/listar/quitar), la asignación por clase de
// fase y los toasts de error de importación (spec audio «Visible Import
// Failures»). La importación vive SOLO aquí: nunca toca el reproductor ni el
// estado de sesión — las sesiones en curso quedan intactas por construcción.
// U13 añade las tarjetas de notificaciones e instalación sobre esta pantalla.
import { useEffect, useRef, useState } from "react";
import { AJUSTES_COPY } from "@/components/shared/copy";
import {
  ToastStack,
  TOAST_DURATION_MS,
  type ToastItem,
} from "@/components/ui/toast";
import {
  isMusicImportError,
  musicStore,
  type TrackMeta,
} from "@/lib/storage/musicStore";
import { MusicLibrary } from "./MusicLibrary";
import { TrackAssigner } from "./TrackAssigner";

/** Mapa código → texto español del spec (cuota / indescodificable / resto). */
function toastMessageFor(error: unknown): string {
  if (isMusicImportError(error)) {
    return error.code === "quota"
      ? AJUSTES_COPY.errores.quota
      : AJUSTES_COPY.errores.undecodable;
  }
  return AJUSTES_COPY.errores.inesperado;
}

export function SettingsScreen() {
  const [tracks, setTracks] = useState<TrackMeta[] | null>(null); // null = cargando
  const [reloadSignal, setReloadSignal] = useState(0);
  const [importing, setImporting] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    musicStore
      .list()
      .then((list) => {
        if (!cancelled) setTracks(list);
      })
      .catch(() => {
        if (!cancelled) setTracks([]); // sin IDB: biblioteca vacía, sin crash
      });
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);

  function pushToast(message: string): void {
    const id = ++toastSeq.current;
    setToasts((ts) => [...ts, { id, message }]);
    setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }

  async function handleImport(file: File): Promise<void> {
    setImporting(true);
    try {
      await musicStore.importTrack(file);
      setReloadSignal((n) => n + 1); // refresca la lista tras el alta
    } catch (error) {
      // Fallo VISIBLE en español; la biblioteca queda intacta (sin alta parcial).
      pushToast(toastMessageFor(error));
    } finally {
      setImporting(false);
    }
  }

  async function handleRemove(id: string): Promise<void> {
    try {
      await musicStore.removeTrack(id);
    } catch {
      pushToast(AJUSTES_COPY.errores.inesperado);
      return;
    }
    setReloadSignal((n) => n + 1);
  }

  return (
    <div className="space-y-8">
      <MusicLibrary
        tracks={tracks}
        importing={importing}
        onImport={(file) => void handleImport(file)}
        onRemove={(id) => void handleRemove(id)}
      />
      <TrackAssigner tracks={tracks ?? []} />
      <ToastStack toasts={toasts} />
    </div>
  );
}
