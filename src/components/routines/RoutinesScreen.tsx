"use client";

// RoutinesScreen — única entrada cliente de /rutinas (§2.3). Lista las rutinas
// guardadas (store persistido v1) con Iniciar directo por el seam de sesión
// (sessionStore.start(routine.config) + /sesion), Renombrar y Eliminar con
// confirmación. Todo el copy vive en ROUTINES_COPY (auditoría ui-design).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTINES_COPY } from "@/components/shared/copy";
import { start as sessionStart } from "@/stores/sessionStore";
import { useRoutinesStore, type RoutineRecord } from "@/stores/routinesStore";
import { ConfirmDeleteRoutineDialog } from "./ConfirmDeleteRoutineDialog";
import { RenameDialog } from "./RenameDialog";
import { RoutineCard } from "./RoutineCard";

export function RoutinesScreen() {
  const router = useRouter();
  const routines = useRoutinesStore((s) => s.routines);
  const [renaming, setRenaming] = useState<RoutineRecord | null>(null);
  const [deleting, setDeleting] = useState<RoutineRecord | null>(null);

  /** Iniciar directo (spec routines): sesión con la config guardada exacta. */
  const startRoutine = (routine: RoutineRecord) => {
    sessionStart(routine.config);
    router.push("/sesion");
  };

  const removeRoutine = () => {
    if (deleting) useRoutinesStore.getState().remove(deleting.id);
    setDeleting(null);
  };

  return (
    <div>
      {routines.length === 0 ? (
        <p className="text-subtext1" role="status">
          {ROUTINES_COPY.vacio}
        </p>
      ) : (
        <ul className="space-y-2">
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onStart={() => startRoutine(routine)}
              onRename={() => setRenaming(routine)}
              onDelete={() => setDeleting(routine)}
            />
          ))}
        </ul>
      )}

      <RenameDialog
        open={renaming !== null}
        routine={renaming}
        onClose={() => setRenaming(null)}
      />
      <ConfirmDeleteRoutineDialog
        routine={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={removeRoutine}
      />
    </div>
  );
}
