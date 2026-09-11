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

// ——— Copy de configuración (U5: pantallas Clásico/Tabata) ———

export const CONFIG_COPY = {
 iniciar: "Iniciar",
 duracionTotal: "Duración total",
 campos: {
  preparacionS: "Preparación",
  trabajoS: "Trabajo",
  descansoS: "Descanso",
  rondas: "Rondas",
  rondasPorTabata: "Rondas por tabata",
  tabatas: "Tabatas",
  descansoLargoS: "Descanso largo",
  descansoGlobalS: "Descanso global",
 },
 descripcion: {
  clasico: "Preparación, trabajo y descanso en rondas.",
  tabata: "Rondas por tabata con descanso largo entre tabatas.",
  personalizado: "Encadena bloques Clásico y Tabata a tu medida.",
 },
} as const;

// ——— Copy del inicio (U5: HomeScreen) ———

export const HOME_COPY = {
 subtitulo: "Elige un modo y configura tu entrenamiento",
 modos: {
  clasico: "Preparación, trabajo y descanso en rondas.",
  tabata: "Rondas por tabata con descanso largo entre tabatas.",
  personalizado: "Encadena bloques clásicos y tabata a tu medida.",
 },
} as const;

// ——— Copy del constructor Personalizado (U6) ———

export const BUILDER_COPY = {
 anadirClasico: "Añadir bloque Clásico",
 anadirTabata: "Añadir bloque Tabata",
 quitar: "Eliminar bloque",
 subir: "Subir bloque",
 bajar: "Bajar bloque",
 vacio:
  "Sin bloques todavía. Añade un bloque Clásico o Tabata para armar tu secuencia.",
} as const;

// ——— Copy de la sesión activa (U7: temporizador, controles y descarte) ———
// Frontera honesta (spec timer-correctness): nada aquí promete ejecución en
// segundo plano — la auditoría de copy.test.ts re-escanea este bloque.

export const SESSION_COPY = {
 pausar: "Pausar",
 reanudar: "Reanudar",
 detener: "Detener",
 siguiente: "Siguiente",
 ultimaFase: "Última fase",
 completada: "Sesión completada",
 progresoFase: "Progreso de fase",
 sinSesion: "No hay ninguna sesión en curso. Volviendo al inicio…",
 detenerTitulo: "¿Descartar la sesión?",
 detenerDescripcion:
  "Si descartas la sesión ahora, no se guardará en el historial.",
 detenerCancelar: "Cancelar",
 detenerConfirmar: "Descartar",
} as const;
