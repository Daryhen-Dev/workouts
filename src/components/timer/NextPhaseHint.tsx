"use client";

// Pista de la siguiente fase (o «Última fase» cuando no queda ninguna).
import { SESSION_COPY } from "@/components/shared/copy";
import type { ScheduledPhase } from "@/lib/timer/types";

export interface NextPhaseHintProps {
  next: ScheduledPhase | null;
}

export function NextPhaseHint({ next }: NextPhaseHintProps) {
  if (next === null) {
    return <p className="text-sm text-subtext0">{SESSION_COPY.ultimaFase}</p>;
  }
  return (
    <p className="text-sm font-medium text-subtext1">
      {SESSION_COPY.siguiente}: {next.label}
    </p>
  );
}
