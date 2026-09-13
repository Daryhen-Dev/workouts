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
 /** Slot de rutinas rápidas (U9): lista de rutinas guardadas. */
 rutinasTitulo: "Rutinas guardadas",
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

// ——— Copy del resumen de completado (U8: /resumen) ———

export const RESUMEN_COPY = {
 titulo: "Resumen",
 descripcion: "Tu sesión quedó registrada en el historial.",
 modo: "Modo",
 tiempoActivo: "Tiempo activo",
 volverInicio: "Volver al inicio",
 verHistorial: "Ver historial",
 vacio: "Todavía no hay ninguna sesión completada.",
} as const;

// ——— Copy del historial (U8: /historial) ———
// Labels del spec: «X sesiones · tiempo total · duración media»;
// períodos «últimos 7 días / últimos 30 días / toda la historia».

export const HISTORY_COPY = {
 titulo: "Historial",
 descripcion: "Tus sesiones completadas.",
 periodo: "Período",
 tipo: "Tipo",
 periodos: {
  dias7: "Últimos 7 días",
  dias30: "Últimos 30 días",
  todo: "Toda la historia",
 },
 tipos: { todas: "Todas", ...MODE_LABEL },
 sesion: "sesión",
 sesiones: "sesiones",
 tiempoTotal: "Tiempo total",
 duracionMedia: "Duración media",
 vacio: "Todavía no hay sesiones completadas.",
 sinResultados: "No hay sesiones con estos filtros.",
} as const;

// ——— Copy de rutinas (U9: /rutinas, diálogos de guardar/renombrar/eliminar) ———

export const ROUTINES_COPY = {
 titulo: "Rutinas",
 descripcion: "Tus configuraciones guardadas, listas para arrancar.",
 vacio: "Todavía no has guardado ninguna rutina.",
 iniciar: "Iniciar",
 renombrar: "Renombrar",
 eliminar: "Eliminar",
 guardarRutina: "Guardar rutina",
 nombreCampo: "Nombre de la rutina",
 cancelar: "Cancelar",
 guardar: {
  titulo: "Guardar rutina",
  descripcion: "Ponle un nombre a esta configuración para reutilizarla.",
  confirmar: "Guardar",
 },
 renombrarDialogo: {
  titulo: "Renombrar rutina",
  descripcion: "El nombre no puede quedar vacío.",
 },
 eliminarDialogo: {
  titulo: "¿Eliminar la rutina?",
  descripcion:
   "Esta rutina se quitará de tu lista. Tus otras rutinas y el historial no se tocan.",
 },
 sobrescribir: {
  titulo: "¿Sobrescribir rutina?",
  descripcion:
   "Ya existe una rutina con ese nombre. Sobrescribirla reemplazará su configuración.",
  confirmar: "Sobrescribir",
 },
 errores: {
  nombreVacio: "El nombre de la rutina no puede estar vacío",
  nombreDuplicado: "Ya existe una rutina con ese nombre",
  configInvalida:
   "Revisa los valores de la configuración antes de guardar la rutina",
 },
} as const;

// ——— Copy de ajustes (U11: /ajustes — biblioteca de música y asignaciones) ———
// Los dos mensajes de error son los textos EXACTOS del spec audio
// («Visible Import Failures»): cuota e indescodificable.

export const AJUSTES_COPY = {
 titulo: "Ajustes",
 descripcion: "Música, notificaciones e instalación de la app.",
 musica: {
  titulo: "Música",
  descripcion:
   "Importa canciones desde tu dispositivo y asígnalas a cada tipo de fase.",
  importar: "Importar canción",
  importando: "Importando…",
  vacio: "Todavía no has importado ninguna canción.",
  quitar: "Quitar",
  ninguna: "Ninguna",
  asignarTitulo: "Asignar por tipo de fase",
  clases: {
   preparacion: "Preparación",
   trabajo: "Trabajo",
   descanso: "Descanso",
   descansoLargo: "Descanso largo",
   descansoGlobal: "Descanso global",
  },
 },
 notificaciones: {
  titulo: "Notificaciones",
  descripcion: "Elige si quieres activar las notificaciones de esta app.",
  etiqueta: "Notificaciones",
  noDisponible: "Las notificaciones no están disponibles en este navegador.",
 },
 instalacion: {
  titulo: "Instalar la app",
  descripcionChromium: "Añádela a tu dispositivo para abrirla más rápido.",
  iosGuia: "Usa Compartir → Añadir a pantalla de inicio.",
  cta: "Instalar app",
  descartarIos: "Ahora no",
 },
 errores: {
  quota: "No hay espacio suficiente en el dispositivo para esta canción",
  undecodable: "El archivo no se pudo leer como audio",
  inesperado: "No se pudo importar la canción. Inténtalo de nuevo.",
 },
} as const;
