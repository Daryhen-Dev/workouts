// Shell servidor de /rutinas (§2.3): encabezado y copy estático en español;
// la entrada cliente RoutinesScreen posee la lista y los diálogos (U9).
import type { Metadata } from "next";
import { RoutinesScreen } from "@/components/routines/RoutinesScreen";
import { BRAND, ROUTINES_COPY } from "@/components/shared/copy";

export const metadata: Metadata = {
  title: `${ROUTINES_COPY.titulo} · ${BRAND}`,
};

export default function RutinasPage() {
  return (
    <section aria-labelledby="rutinas-titulo">
      <h1 id="rutinas-titulo" className="text-2xl font-bold">
        {ROUTINES_COPY.titulo}
      </h1>
      <p className="mt-1 text-sm text-subtext1">{ROUTINES_COPY.descripcion}</p>
      <div className="mt-6">
        <RoutinesScreen />
      </div>
    </section>
  );
}
