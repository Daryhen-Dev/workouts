// Shell servidor de /personalizado (§2.3): encabezado y copy estático en
// español; toda la interactividad vive en la única entrada cliente,
// PersonalizadoBuilder. Completa «All modes reachable» (spec timer-modes).
import type { Metadata } from "next";
import { PersonalizadoBuilder } from "@/components/builder/PersonalizadoBuilder";
import { BRAND, CONFIG_COPY, MODE_LABEL } from "@/components/shared/copy";

export const metadata: Metadata = {
  title: `${MODE_LABEL.personalizado} · ${BRAND}`,
};

export default function PersonalizadoPage() {
  return (
    <section aria-labelledby="config-personalizado">
      <h1 id="config-personalizado" className="text-2xl font-bold">
        {MODE_LABEL.personalizado}
      </h1>
      <p className="mt-1 text-sm text-subtext1">
        {CONFIG_COPY.descripcion.personalizado}
      </p>
      <div className="mt-6">
        <PersonalizadoBuilder />
      </div>
    </section>
  );
}
