"use client";

// Cuenta atrás grande — §9.1: mono, tabular, color por kind de fase
// (trabajo = acento rosa, descanso = verde, preparación = amarillo, largo/global = azul).
import { formatDurationMs } from "@/lib/timer/duration";
import { displaySeconds } from "@/lib/timer/engine";
import { PHASE_KIND, type PhaseKind } from "@/lib/timer/types";
import { cn } from "@/lib/utils";

/** Color de texto por kind de fase (tokens §9.1). */
const KIND_TEXT: Record<PhaseKind, string> = {
  [PHASE_KIND.preparacion]: "text-warning",
  [PHASE_KIND.trabajo]: "text-accent",
  [PHASE_KIND.descanso]: "text-success",
  [PHASE_KIND.descansoLargo]: "text-info",
  [PHASE_KIND.descansoGlobal]: "text-info",
};

export interface TimeDisplayProps {
  remainingMs: number;
  phaseKind: PhaseKind;
}

/** Muestra el restante en m:ss vía displaySeconds (§3.4: valor completo al entrar, 0 en la frontera). */
export function TimeDisplay({ remainingMs, phaseKind }: TimeDisplayProps) {
  return (
    <p
      className={cn(
        "font-mono text-7xl font-bold leading-none tabular-nums",
        KIND_TEXT[phaseKind],
      )}
    >
      {formatDurationMs(displaySeconds(remainingMs) * 1000)}
    </p>
  );
}
