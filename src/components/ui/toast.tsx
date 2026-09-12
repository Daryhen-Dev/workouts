// Toast mínimo inline (U11) — decisión documentada: sonner NO está en el set de
// deps aprobado, así que el «patrón shadcn de toasts» se sustituye por esta
// pila minimalista con la semántica accesible suficiente (role="status" +
// aria-live="polite" — anuncios corteses, sin interrumpir el lector).
// Auto-descarte a los 6 s; el padre (SettingsScreen) posee el estado y los
// temporizadores se limpian por el propio unmount de React al desmontar.
export interface ToastItem {
  id: number;
  message: string;
}

export const TOAST_DURATION_MS = 6_000;

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <p
          key={toast.id}
          className="rounded-md border border-danger bg-surface-1 px-4 py-3 text-sm text-text shadow-lg"
        >
          {toast.message}
        </p>
      ))}
    </div>
  );
}
