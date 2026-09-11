"use client";

// DurationField — stepper de segundos enteros (§9.3, componente custom).
// −/+ ajustan en pasos de 1 s respetando los límites del schema (por defecto
// 1..3600 s); desde un valor no numérico el stepper recupera el mínimo. El
// texto tecleado NO se clampea: los límites los reporta zod con su mensaje en
// español (spec timer-modes: rechazo visible de inválidos).

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_PHASE_SECONDS } from "@/lib/validation/configSchemas";
import { ValidatedNumberInput } from "./ValidatedNumberInput";

export interface DurationFieldProps {
    id: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    error?: string;
    /** Límites del stepper; por defecto los del schema de duraciones. */
    min?: number;
    max?: number;
    /** Paso en segundos enteros (1 por defecto). */
    step?: number;
}

export function DurationField({
    id,
    label,
    value,
    onChange,
    error,
    min = 1,
    max = MAX_PHASE_SECONDS,
    step = 1,
}: DurationFieldProps) {
    const clamp = (n: number): number => Math.min(max, Math.max(min, n));

    const adjust = (direction: 1 | -1) => {
        // NaN (texto inválido) → recupera el mínimo como valor válido ancla.
        if (!Number.isFinite(value)) {
            onChange(clamp(min));
            return;
        }
        onChange(clamp(value + direction * step));
    };

    const atMin = Number.isFinite(value) && value <= min;
    const atMax = Number.isFinite(value) && value >= max;

    return (
        <ValidatedNumberInput
            id={id}
            label={label}
            value={value}
            onChange={onChange}
            error={error}
            suffix="s"
            leftSlot={
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Disminuir ${label}`}
                    disabled={atMin}
                    onClick={() => adjust(-1)}
                >
                    <Minus aria-hidden="true" className="h-4 w-4" />
                </Button>
            }
            rightSlot={
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Aumentar ${label}`}
                    disabled={atMax}
                    onClick={() => adjust(1)}
                >
                    <Plus aria-hidden="true" className="h-4 w-4" />
                </Button>
            }
        />
    );
}
