"use client";

// Pantalla del temporizador activo (U7) — modo-agnóstica: el plan ya está
// compilado en el store. Render puro del SessionView + acciones del store.
// El flujo de efectos (ticker, visibilidad, flash, completado, descarte) vive en
// SessionController (features/session); esta pantalla solo presenta y dispara.
import { SESSION_COPY } from "@/components/shared/copy";
import { SESSION_STATUS } from "@/lib/timer/types";
import { useSessionStore } from "@/stores/sessionStore";
import { cn } from "@/lib/utils";
import { Controls } from "./Controls";
import { NextPhaseHint } from "./NextPhaseHint";
import { PhaseRing } from "./PhaseRing";
import { TimeDisplay } from "./TimeDisplay";

export interface ActiveSessionScreenProps {
  /** true mientras dura el flash visual de transición de fase (observador del controlador). */
  flash?: boolean;
  /** Pide abrir el diálogo de confirmación «¿Descartar la sesión?» (el flujo vive en SessionController). */
  onStopRequest: () => void;
}

export function ActiveSessionScreen({
  flash = false,
  onStopRequest,
}: ActiveSessionScreenProps) {
  const view = useSessionStore((s) => s.view);
  const pause = useSessionStore((s) => s.pause);
  const resume = useSessionStore((s) => s.resume);

  // Defensivo: el controlador guarda la ruta (sin sesión → redirige); si la
  // pantalla se monta sin vista no hay nada que renderizar.
  if (view === null || view.phase === null) {
    if (view?.status === SESSION_STATUS.completed) {
      return (
        <section
          data-phase-kind="completada"
          className="flex flex-1 flex-col items-center justify-center gap-6 py-10"
        >
          <p className="text-lg font-semibold text-accent">
            {SESSION_COPY.completada}
          </p>
          <p className="font-mono text-7xl font-bold leading-none tabular-nums text-accent">
            0:00
          </p>
        </section>
      );
    }
    return null;
  }

  const phase = view.phase;
  // Progreso dentro de la fase (0 % al entrar, 100 % en la frontera).
  const percent = Math.round(
    ((phase.durationMs - view.remainingMs) / phase.durationMs) * 100,
  );

  return (
    <section
      data-phase-kind={phase.kind}
      data-flashing={flash ? "true" : "false"}
      className="flex flex-1 flex-col items-center justify-center gap-8 py-10"
    >
      <h1
        className={cn(
          "text-xl font-semibold uppercase tracking-widest text-subtext1",
          // Clase visual de transición (observador de fases §3.5): parpadeo breve
          // al cambiar de fase; el atributo data-flashing es el gancho observable
          // para U10 (cue) y U13 (vibración: mismo tick del orquestador).
          flash && "phase-flash",
        )}
      >
        {phase.label}
      </h1>
      <TimeDisplay remainingMs={view.remainingMs} phaseKind={phase.kind} />
      <PhaseRing percent={percent} phaseKind={phase.kind} />
      <NextPhaseHint next={view.nextPhase} />
      <Controls
        status={view.status}
        onPause={pause}
        onResume={resume}
        onStop={onStopRequest}
      />
    </section>
  );
}
