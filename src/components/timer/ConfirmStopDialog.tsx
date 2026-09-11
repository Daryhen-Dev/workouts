"use client";

// Diálogo de confirmación de descarte — ESCRITO A MANO (decisión documentada):
// radix NO está en las dependencias aprobadas del proyecto y tasks.md U7 da a
// elegir "hand-write alert-dialog (radix) or a simple modal — pick the simpler".
// La semántica del AlertDialog de shadcn se cubre con role="alertdialog" +
// aria-modal + botones explícitos; cero dependencias nuevas.
import { SESSION_COPY } from "@/components/shared/copy";
import { Button } from "@/components/ui/button";

export interface ConfirmStopDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmStopDialog({
  open,
  onCancel,
  onConfirm,
}: ConfirmStopDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-detener-titulo"
        aria-describedby="confirmar-detener-descripcion"
        className="w-full max-w-sm rounded-lg border border-surface-1 bg-surface-dim p-6"
      >
        <h2
          id="confirmar-detener-titulo"
          className="text-lg font-semibold text-text"
        >
          {SESSION_COPY.detenerTitulo}
        </h2>
        <p
          id="confirmar-detener-descripcion"
          className="mt-2 text-sm text-subtext1"
        >
          {SESSION_COPY.detenerDescripcion}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {SESSION_COPY.detenerCancelar}
          </Button>
          <Button
            variant="outline"
            className="border-danger text-danger hover:border-danger"
            onClick={onConfirm}
          >
            {SESSION_COPY.detenerConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
