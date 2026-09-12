// Manifest de la PWA vía Metadata API (U12 — diseño §8.1). Next lo sirve en
// /manifest.webmanifest como ruta estática. Los nombres de modo de los
// atajos son verbatim (MODE_LABEL, spec ui-design): «Clásico», «Tabata»,
// «Personalizado».

import type { MetadataRoute } from "next";

const ICONS = {
  192: { src: "/icons/icon-192.png", type: "image/png" as const },
  512: { src: "/icons/icon-512.png", type: "image/png" as const },
  maskable: { src: "/icons/icon-maskable-512.png", type: "image/png" as const },
} as const;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tip Tap Workout",
    short_name: "Tip Tap",
    description:
      "Temporizador de entrenamiento por intervalos: Clásico, Tabata y secuencias personalizadas, con sonido y música.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1218",
    theme_color: "#f095c8",
    lang: "es",
    icons: [
      { ...ICONS[192], sizes: "192x192" },
      { ...ICONS[512], sizes: "512x512" },
      { ...ICONS.maskable, sizes: "512x512", purpose: "maskable" },
    ],
    // SHOULD-requirement (spec pwa): donde el SO los soporta, aparecen; donde
    // no, se ignoran sin daño.
    shortcuts: [
      {
        name: "Clásico",
        short_name: "Clásico",
        description: "Preparación, trabajo y descanso en rondas.",
        url: "/clasico",
        icons: [{ src: ICONS[192].src, sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Tabata",
        short_name: "Tabata",
        description: "Rondas por tabata con descanso largo entre tabatas.",
        url: "/tabata",
        icons: [{ src: ICONS[192].src, sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Personalizado",
        short_name: "Personalizado",
        description: "Encadena bloques Clásico y Tabata a tu medida.",
        url: "/personalizado",
        icons: [{ src: ICONS[192].src, sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
