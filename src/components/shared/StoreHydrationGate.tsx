"use client";

// Puerta de hidratación (§2.3): los stores persistidos usan
// `skipHydration: true`; este componente cliente llama a cada rehydrator en
// un efecto y renderiza los hijos solo cuando terminan — así el markup SSR
// (skeleton) y el primer render cliente coinciden. Es genérico: acepta una
// lista de rehydrators (tests / uso programático) y por defecto usa el
// registro global `storeRehydrators`.
import { useEffect, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { storeRehydrators, type Rehydrator } from "@/stores/storeRehydrators";

const NO_EXTRA_REHYDRATORS: Rehydrator[] = [];

export function useHydrated(
  extraRehydrators: Rehydrator[] = NO_EXTRA_REHYDRATORS,
): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const rehydrators = [...storeRehydrators, ...extraRehydrators];
    Promise.all(rehydrators.map((rehydrate) => rehydrate()))
      // Fail-open: si la hidratación falla, se muestran los hijos con los
      // valores por defecto en lugar de dejar un skeleton infinito.
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [extraRehydrators]);

  return hydrated;
}

export function StoreHydrationGate({
  children,
  rehydrators = NO_EXTRA_REHYDRATORS,
}: {
  children: ReactNode;
  rehydrators?: Rehydrator[];
}) {
  const hydrated = useHydrated(rehydrators);

  if (!hydrated) {
    return (
      <Skeleton
        role="status"
        aria-label="Cargando datos"
        className="h-64 w-full"
      />
    );
  }
  return <>{children}</>;
}
