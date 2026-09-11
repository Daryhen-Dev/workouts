"use client";

// RenameDialog — cableado delgado sobre RoutineNameDialog (lógica de
// nombre/validación COMPARTIDA con guardar — tasks.md U9 REFACTOR). El store
// jamás devuelve confirm-overwrite al renombrar: pisar a otra rutina no es
// opción (perdería su config); duplicado → mensaje en línea.
import { ROUTINES_COPY } from "@/components/shared/copy";
import type { RoutineRecord } from "@/stores/routinesStore";
import { useRoutinesStore } from "@/stores/routinesStore";
import { RoutineNameDialog } from "./RoutineNameDialog";

export interface RenameDialogProps {
    open: boolean;
    routine: RoutineRecord | null;
    onClose: () => void;
}

export function RenameDialog({ open, routine, onClose }: RenameDialogProps) {
    if (!routine) return null;
    return (
        <RoutineNameDialog
            open={open}
            title={ROUTINES_COPY.renombrarDialogo.titulo}
            description={ROUTINES_COPY.renombrarDialogo.descripcion}
            submitLabel={ROUTINES_COPY.renombrar}
            initialName={routine.name}
            onCommit={(name) =>
                useRoutinesStore.getState().rename(routine.id, name)
            }
            onClose={onClose}
        />
    );
}
