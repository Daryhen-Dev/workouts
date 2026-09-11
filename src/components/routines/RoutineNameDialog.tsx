"use client";

// RoutineNameDialog — diálogo COMPARTIDO de guardar/renombrar (tasks.md U9
// REFACTOR: la lógica de nombre/validación vive en UN solo componente y ambos
// diálogos son cableados delgados encima). Modal ESCRITO A MANO (misma
// decisión documentada que ConfirmStopDialog en U7: radix no está en las
// dependencias aprobadas y tasks.md U9 permite elegir el patrón simple —
// `role="dialog"` + `aria-modal` + botones explícitos, cero deps nuevas).
//
// Estados: (1) formulario de nombre; (2) rama de confirmación de
// sobrescritura — SOLO si `onCommit` devuelve `confirm-overwrite` (spec
// routines: jamás se sobrescribe en silencio; la confirmación es explícita).
import { useEffect, useState } from "react";
import { ROUTINES_COPY } from "@/components/shared/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ROUTINE_WRITE_RESULT,
  type RoutineWriteResult,
} from "@/stores/routinesStore";

export interface RoutineNameDialogProps {
  open: boolean;
  /** Título del diálogo (p. ej. «Guardar rutina» / «Renombrar rutina»). */
  title: string;
  description: string;
  /** Etiqueta del botón de confirmación del formulario. */
  submitLabel: string;
  /** Valor inicial del campo (renombrar precarga el nombre actual). */
  initialName: string;
  /** Intento de escritura; el resultado dirige la UI del diálogo. */
  onCommit: (name: string, opts: { overwrite: boolean }) => RoutineWriteResult;
  onClose: () => void;
}

export function RoutineNameDialog({
  open,
  title,
  description,
  submitLabel,
  initialName,
  onCommit,
  onClose,
}: RoutineNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pendingOverwrite, setPendingOverwrite] = useState(false);

  // Reinicio por apertura: cada apertura arranca del estado limpio.
  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
      setPendingOverwrite(false);
    }
  }, [open, initialName]);

  if (!open) return null;

  /** Aplica el resultado del store a la UI del diálogo. */
  const apply = (result: RoutineWriteResult): void => {
    if (result.status === ROUTINE_WRITE_RESULT.saved) {
      onClose();
      return;
    }
    switch (result.status) {
      case ROUTINE_WRITE_RESULT.confirmOverwrite:
        setPendingOverwrite(true);
        break;
      case ROUTINE_WRITE_RESULT.rejectedEmptyName:
        setError(ROUTINES_COPY.errores.nombreVacio);
        break;
      case ROUTINE_WRITE_RESULT.rejectedDuplicateName:
        setError(ROUTINES_COPY.errores.nombreDuplicado);
        break;
      case ROUTINE_WRITE_RESULT.rejectedInvalidConfig:
        setError(ROUTINES_COPY.errores.configInvalida);
        break;
      case ROUTINE_WRITE_RESULT.rejectedMissing:
        // El objetivo desapareció (p. ej. borrado en otra pestaña): nada que
        // renombrar — cerrar sin tocar nada es la respuesta honesta.
        onClose();
        break;
    }
  };

  const submit = (overwrite: boolean) => {
    const trimmed = name.trim();
    if (trimmed === "") {
      setError(ROUTINES_COPY.errores.nombreVacio);
      return;
    }
    apply(onCommit(trimmed, { overwrite }));
  };

  const { sobrescribir, cancelar } = ROUTINES_COPY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rutina-dialogo-titulo"
        aria-describedby="rutina-dialogo-descripcion"
        className="w-full max-w-sm rounded-lg border border-surface-1 bg-surface-dim p-6"
      >
        {pendingOverwrite ? (
          <>
            <h2 id="rutina-dialogo-titulo" className="text-lg font-semibold">
              {sobrescribir.titulo}
            </h2>
            <p
              id="rutina-dialogo-descripcion"
              className="mt-2 text-sm text-subtext1"
            >
              {sobrescribir.descripcion}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setPendingOverwrite(false)}
              >
                {cancelar}
              </Button>
              <Button
                variant="outline"
                className="border-danger text-danger hover:border-danger"
                onClick={() => submit(true)}
              >
                {sobrescribir.confirmar}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 id="rutina-dialogo-titulo" className="text-lg font-semibold">
              {title}
            </h2>
            <p
              id="rutina-dialogo-descripcion"
              className="mt-2 text-sm text-subtext1"
            >
              {description}
            </p>
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(false);
              }}
            >
              <label
                htmlFor="rutina-nombre"
                className="block text-sm font-medium text-subtext1"
              >
                {ROUTINES_COPY.nombreCampo}
              </label>
              <Input
                id="rutina-nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={error !== null}
                className="mt-1.5 text-left"
                autoFocus
              />
              {error && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  {cancelar}
                </Button>
                <Button type="submit">{submitLabel}</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
