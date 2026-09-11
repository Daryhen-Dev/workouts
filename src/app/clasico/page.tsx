// Shell servidor de /clasico (§2.3): encabezado y copy estático en español;
// toda la interactividad vive en la única entrada cliente, ClasicoConfigScreen.
import type { Metadata } from "next";
import { ClasicoConfigScreen } from "@/components/forms/ClasicoConfigScreen";
import { BRAND, CONFIG_COPY, MODE_LABEL } from "@/components/shared/copy";

export const metadata: Metadata = {
  title: `${MODE_LABEL.clasico} · ${BRAND}`,
};

export default function ClasicoPage() {
  return (
    <section aria-labelledby="config-clasico">
      <h1 id="config-clasico" className="text-2xl font-bold">
        {MODE_LABEL.clasico}
      </h1>
      <p className="mt-1 text-sm text-subtext1">
        {CONFIG_COPY.descripcion.clasico}
      </p>
      <div className="mt-6">
        <ClasicoConfigScreen />
      </div>
    </section>
  );
}
