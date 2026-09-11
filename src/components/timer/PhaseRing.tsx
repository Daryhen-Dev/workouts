"use client";

// Anillo de progreso de fase — diseño §9.3: CSS conic-gradient puro, sin lib de
// gráficas. El avance semántico viaja por role="progressbar" (probable en tests);
// la variable --progress alimenta el conic-gradient inline.
import { SESSION_COPY } from "@/components/shared/copy";
import { PHASE_KIND, type PhaseKind } from "@/lib/timer/types";

/** Color del arco por kind de fase (mismos tokens que TimeDisplay). */
const KIND_RING: Record<PhaseKind, string> = {
    [PHASE_KIND.preparacion]: "var(--color-warning)",
    [PHASE_KIND.trabajo]: "var(--color-accent)",
    [PHASE_KIND.descanso]: "var(--color-success)",
    [PHASE_KIND.descansoLargo]: "var(--color-info)",
    [PHASE_KIND.descansoGlobal]: "var(--color-info)",
};

export interface PhaseRingProps {
    /** 0–100: porcentaje recorrido de la fase actual. */
    percent: number;
    phaseKind: PhaseKind;
}

export function PhaseRing({ percent, phaseKind }: PhaseRingProps) {
    return (
        <div
            role="progressbar"
            aria-label={SESSION_COPY.progresoFase}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="size-40 rounded-full transition-[background] duration-200 ease-linear"
            style={
                {
                    "--progress": `${percent}%`,
                    background: `conic-gradient(${KIND_RING[phaseKind]} var(--progress), var(--color-surface-1) 0)`,
                } as React.CSSProperties
            }
        />
    );
}
