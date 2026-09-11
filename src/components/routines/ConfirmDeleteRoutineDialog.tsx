"use client";

// ConfirmDeleteRoutineDialog — confirmación de borrado, patrón alert-dialog
// ESCRITO A MANO de U7 (ConfirmStopDialog): radix no está en las deps
// aprobadas y tasks.md U9 permite elegir el patrón simple.
import { ROUTINES_COPY } from "@/components/shared/copy";
import type { RoutineRecord } from "@/stores/routinesStore";
import { Button } from "@/components/ui/button";

export interface ConfirmDeleteRoutineDialogProps {
  routine: RoutineRecord | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteRoutineDialog({
  routine,
  onCancel,
  onConfirm,
}: ConfirmDeleteRoutineDialogProps) {
  if (!routine) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="eliminar-rutina-titulo"
        aria-describedby="eliminar-rutina-descripcion"
        className="w-full max-w-sm rounded-lg border border-surface-1 bg-surface-dim p-6"
      >
        <h2
          id="eliminar-rutina-titulo"
          className="text-lg font-semibold text-text"
        >
          {ROUTINES_COPY.eliminarDialogo.titulo}
        </h2>
        <p
          id="eliminar-rutina-descripcion"
          className="mt-2 text-sm text-subtext1"
        >
          {ROUTINES_COPY.eliminarDialogo.descripcion}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {ROUTINES_COPY.cancelar}
          </Button>
          <Button
            variant="outline"
            className="border-danger text-danger hover:border-danger"
            onClick={onConfirm}
          >
            {ROUTINES_COPY.eliminar}
          </Button>
        </div>
      </div>
    </div>
  );
}
