// Shell servidor de /offline (U12 — diseño §8.2): fallback estático en
// español que el service worker sirve cuando una navegación de documento no
// tiene entrada en caché. Ligero a propósito: es página de precache/runtime,
// cero datos, cero interactividad (§2.3).

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin conexión · Tip Tap Workout",
};

export default function OfflinePage() {
  return (
    <section aria-labelledby="offline-titulo" className="py-10 text-center">
      <h1 id="offline-titulo" className="text-2xl font-bold">
        Sin conexión
      </h1>
      <p className="mt-2 text-subtext1">
        Esta página no se ha cargado todavía. Conéctate una vez para usarla sin
        conexión.
      </p>
      <p className="mt-6 text-sm text-subtext0">
        Las páginas que ya visitaste siguen disponibles sin conexión.
      </p>
    </section>
  );
}
