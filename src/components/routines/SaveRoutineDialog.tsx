"use client";

// SaveRoutineDialog — cableado delgado sobre RoutineNameDialog: entrega la
// config ACTUAL del formulario (getConfig se evalúa al confirmar, no al
// abrir). Config inválida → rejected-invalid-config (mensaje en línea); la
// rama confirm-overwrite la maneja el diálogo compartido.
import { ROUTINES_COPY } from "@/components/shared/copy";
import type { SessionConfig } from "@/lib/timer/types";
import { useRoutinesStore } from "@/stores/routinesStore";
import { RoutineNameDialog } from "./RoutineNameDialog";

export interface SaveRoutineDialogProps {
    open: boolean;
    /** Config a guardar; null cuando el formulario está inválido. */
    getConfig: () => SessionConfig | null;
    onClose: () => void;
}

export function SaveRoutineDialog({
    open,
    getConfig,
    onClose,
}: SaveRoutineDialogProps) {
    return (
        <RoutineNameDialog
            open={open}
            title={ROUTINES_COPY.guardar.titulo}
            description={ROUTINES_COPY.guardar.descripcion}
            submitLabel={ROUTINES_COPY.guardar.confirmar}
            initialName=""
            onCommit={(name, opts) => {
                const config = getConfig();
                if (config === null) {
                    return {
                        status: "rejected-invalid-config" as const,
                    };
                }
                return useRoutinesStore.getState().save(config, name, opts);
            }}
            onClose={onClose}
        />
    );
}
