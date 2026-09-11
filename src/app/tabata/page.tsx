// Shell servidor de /tabata (§2.3): encabezado y copy estático en español;
// toda la interactividad vive en la única entrada cliente, TabataConfigScreen.
import type { Metadata } from "next";
import { TabataConfigScreen } from "@/components/forms/TabataConfigScreen";
import { BRAND, CONFIG_COPY, MODE_LABEL } from "@/components/shared/copy";

export const metadata: Metadata = {
  title: `${MODE_LABEL.tabata} · ${BRAND}`,
};

export default function TabataPage() {
  return (
    <section aria-labelledby="config-tabata">
      <h1 id="config-tabata" className="text-2xl font-bold">
        {MODE_LABEL.tabata}
      </h1>
      <p className="mt-1 text-sm text-subtext1">
        {CONFIG_COPY.descripcion.tabata}
      </p>
      <div className="mt-6">
        <TabataConfigScreen />
      </div>
    </section>
  );
}
