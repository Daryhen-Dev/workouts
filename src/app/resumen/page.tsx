// Shell servidor de /resumen (§2.3): encabezado y copy estático en español;
// la entrada cliente CompletionSummary renderiza la sesión más reciente.
import type { Metadata } from "next";
import { CompletionSummary } from "@/components/history/CompletionSummary";
import { BRAND, RESUMEN_COPY } from "@/components/shared/copy";

export const metadata: Metadata = {
  title: `${RESUMEN_COPY.titulo} · ${BRAND}`,
};

export default function ResumenPage() {
  return (
    <section aria-labelledby="resumen-titulo">
      <h1 id="resumen-titulo" className="text-2xl font-bold">
        {RESUMEN_COPY.titulo}
      </h1>
      <p className="mt-1 text-sm text-subtext1">{RESUMEN_COPY.descripcion}</p>
      <div className="mt-6">
        <CompletionSummary />
      </div>
    </section>
  );
}
