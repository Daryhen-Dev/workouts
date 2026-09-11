// RoutineCard — fila de rutina (presentacional): nombre, etiqueta de modo
// (MODE_LABEL verbatim) y fecha de actualización (Intl "es", patrón EntryList).
// Las acciones llegan por callbacks; el estado vive en RoutinesScreen.
import { ROUTINES_COPY, MODE_LABEL } from "@/components/shared/copy";
import type { RoutineRecord } from "@/stores/routinesStore";

const DATE_FORMATTER = new Intl.DateTimeFormat("es");

export function RoutineCard({
  routine,
  onStart,
  onRename,
  onDelete,
}: {
  routine: RoutineRecord;
  onStart: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      data-routine-id={routine.id}
      className="rounded-md border border-surface-1 bg-surface-dim px-3 py-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{routine.name}</p>
          <p className="text-sm text-subtext1">{MODE_LABEL[routine.mode]}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-sm text-subtext0">
            {DATE_FORMATTER.format(routine.updatedAt)}
          </p>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-base transition-colors hover:bg-pink-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {ROUTINES_COPY.iniciar}
          </button>
          <button
            type="button"
            onClick={onRename}
            className="rounded-md border border-surface-1 px-3 py-1.5 text-sm text-subtext1 transition-colors hover:border-accent hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {ROUTINES_COPY.renombrar}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-surface-1 px-3 py-1.5 text-sm text-danger transition-colors hover:border-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {ROUTINES_COPY.eliminar}
          </button>
          </div>
        </div>
      </div>
    </li>
  );
}
