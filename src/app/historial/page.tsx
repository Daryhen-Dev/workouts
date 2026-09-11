// Shell servidor de /historial (§2.3): encabezado y copy estático en español;
// la entrada cliente HistoryScreen posee los filtros y la lista.
import type { Metadata } from "next";
import { HistoryScreen } from "@/components/history/HistoryScreen";
import { BRAND, HISTORY_COPY } from "@/components/shared/copy";

export const metadata: Metadata = {
  title: `${HISTORY_COPY.titulo} · ${BRAND}`,
};

export default function HistorialPage() {
  return (
    <section aria-labelledby="historial-titulo">
      <h1 id="historial-titulo" className="text-2xl font-bold">
        {HISTORY_COPY.titulo}
      </h1>
      <p className="mt-1 text-sm text-subtext1">{HISTORY_COPY.descripcion}</p>
      <div className="mt-6">
        <HistoryScreen />
      </div>
    </section>
  );
}
