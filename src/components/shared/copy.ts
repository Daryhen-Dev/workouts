// Copy centralizado de la app (diseño §9.2): TODO el copy autoriado en
// español vive aquí — un solo archivo auditable para el escenario
// "Copy audit" del spec ui-design. Sin maquinaria de i18n, sin switcher de
// tema/skin en ninguna parte.

export const BRAND = "Tip Tap Workout";

/** Ids de modo → nombres españoles verbatim (spec ui-design). U3 define
 *  `MODE` como const con exactamente estas claves. */
export const MODE_LABEL = {
 clasico: "Clásico",
 tabata: "Tabata",
 personalizado: "Personalizado",
} as const;

export const NAV_LABELS = {
 inicio: "Inicio",
 rutinas: "Rutinas",
 historial: "Historial",
 ajustes: "Ajustes",
} as const;
export type NavKey = keyof typeof NAV_LABELS;
