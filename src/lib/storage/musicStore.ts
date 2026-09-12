// musicStore (U11 — diseño §6.4/§7) — biblioteca de música del usuario.
//
// Pipeline de importación (§6.4):
//   (1) puerta MIME: todo lo que no sea `audio/*` → undecodable (antes de sondear);
//   (2) sonda de reproducibilidad: URL de objeto + <audio> detached esperando
//       loadedmetadata vs error, con guardia de 10 s — valida que el navegador
//       PUEDE reproducir el archivo sin decodificar PCM;
//   (3) escritura en UNA transacción IndexedDB de trackMeta + trackBlobs —
//       el abort por cuota revierte AMBAS: «sin archivo parcial» es estructural;
//   (4) detección de cuota (QuotaExceededError / código 22 / nombre con quota)
//       → MusicImportError{code:"quota"}.
//
// IndexedDB queda ESTRICTAMENTE detrás de esta interfaz (tarea REFACTOR U11):
// ningún consumidor toca la base directamente.
//
// Huérfanos (§7): removeTrack también limpia las asignaciones de ajustes que
// referencien la pista eliminada — el cableado por defecto llama al
// settingsStore; los tests inyectan su propio espía.

import {
  openMusicDb,
  STORE_TRACK_BLOBS,
  STORE_TRACK_META,
  type MusicDatabase,
} from "./db";
import { clearTrackAssignments } from "@/stores/settingsStore";

export const MUSIC_IMPORT_ERROR = {
  quota: "quota",
  undecodable: "undecodable",
} as const;
export type MusicImportErrorCode =
  (typeof MUSIC_IMPORT_ERROR)[keyof typeof MUSIC_IMPORT_ERROR];

/** Error visible de importación — la UI mapea `code` a los toasts españoles. */
export interface MusicImportError extends Error {
  code: MusicImportErrorCode;
}

export function isMusicImportError(error: unknown): error is MusicImportError {
  if (!(error instanceof Error)) return false;
  const code = (error as MusicImportError).code;
  return (
    code === MUSIC_IMPORT_ERROR.quota || code === MUSIC_IMPORT_ERROR.undecodable
  );
}

function toMusicImportError(
  code: MusicImportErrorCode,
  mensaje: string,
  causa?: unknown,
): MusicImportError {
  const error = new Error(mensaje) as MusicImportError;
  error.code = code;
  error.cause = causa;
  return error;
}

/** Id de pista (uuid de IndexedDB). Fuente única: este módulo (diseño §6.4). */
export type TrackId = string;

/** Metadato de pista (§7) — lo que `list()` devuelve; el blob nunca viaja aquí. */
export interface TrackMeta {
  id: TrackId;
  name: string;
  mime: string;
  sizeBytes: number;
  importedAt: number;
}

export interface MusicStore {
  /** Metadatos de toda la biblioteca — jamás carga blobs. */
  list(): Promise<TrackMeta[]>;
  /** Pipeline §6.4; lanza MusicImportError{quota|undecodable}. */
  importTrack(file: File): Promise<TrackMeta>;
  /** Borra meta+blob y limpia asignaciones huérfanas (§7). */
  removeTrack(id: TrackId): Promise<void>;
  /** Busca el blob y devuelve su URL de objeto (el jugador la revoca tras el swap). */
  getObjectUrl(id: TrackId): Promise<string>;
}

/** Escritura atómica por defecto — UNA transacción, DOS stores (§7). */
export type WriteTrackFn = (
  db: MusicDatabase,
  meta: TrackMeta,
  blob: Blob,
) => Promise<void>;

export const defaultWriteTrack: WriteTrackFn = async (db, meta, blob) => {
  const tx = db.transaction([STORE_TRACK_META, STORE_TRACK_BLOBS], "readwrite");
  const metaPut = tx.objectStore(STORE_TRACK_META).put(meta);
  const blobPut = tx.objectStore(STORE_TRACK_BLOBS).put(blob, meta.id);
  // Las tres promesas pertenecen a la MISMA transacción: un fallo aborta todo.
  await Promise.all([metaPut, blobPut, tx.done]);
};

/** Guardia de la sonda (§6.4): 10 s sin loadedmetadata ni error ⇒ undecodable. */
export const PROBE_TIMEOUT_MS = 10_000;

/**
 * Sonda de reproducibilidad por defecto: URL de objeto + <audio> detached con
 * preload="metadata". Sin Web Audio NO implica nada aquí — el elemento audio es
 * independiente; pero sin `Audio`/createObjectURL (SSR/entornos raros) no
 * podemos validar NADA: se rechaza (nunca afirmamos reproducible sin probar).
 */
async function defaultProbeFile(file: File): Promise<void> {
  if (
    typeof Audio === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error("sonda de audio no disponible en este entorno");
  }
  const url = URL.createObjectURL(file);
  const el = new Audio();
  el.preload = "metadata";
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("la sonda de audio agotó el tiempo")),
        PROBE_TIMEOUT_MS,
      );
      const limpiar = () => clearTimeout(timeout);
      el.addEventListener(
        "loadedmetadata",
        () => {
          limpiar();
          resolve();
        },
        { once: true },
      );
      el.addEventListener(
        "error",
        () => {
          limpiar();
          reject(new Error("el archivo no se pudo leer como audio"));
        },
        { once: true },
      );
      el.src = url;
    });
  } finally {
    el.removeAttribute("src"); // libera el recurso sin tocar load() (no implantado en jsdom)
    URL.revokeObjectURL(url);
  }
}

/** Formas de error de cuota reconocidas (§6.4): nombre, código 22 legado, nombre con «quota». */
function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { name?: unknown; code?: unknown };
  if (candidate.name === "QuotaExceededError") return true;
  if (candidate.code === 22) return true;
  return typeof candidate.name === "string" && /quota/i.test(candidate.name);
}

let fallbackCounter = 0;

/** Id estable de pista: crypto.randomUUID, o contador si no existe (jsdom). */
function newTrackId(): TrackId {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `pista-${Date.now()}-${fallbackCounter}`;
}

/** Dependencias inyectables — los tests simulan cuota/sonda/limpieza sin tocar la base real. */
export interface MusicStoreDeps {
  getDatabase?: () => Promise<MusicDatabase>;
  probeFile?: (file: File) => Promise<void>;
  writeTrack?: WriteTrackFn;
  /** Limpieza de huérfanos: por defecto, clearTrackAssignments del settingsStore. */
  clearAssignmentsForTrack?: (trackId: TrackId) => void;
}

export function createMusicStore(deps: MusicStoreDeps = {}): MusicStore {
  const getDatabase = deps.getDatabase ?? openMusicDb;
  const probeFile = deps.probeFile ?? defaultProbeFile;
  const writeTrack = deps.writeTrack ?? defaultWriteTrack;
  const clearAssignmentsForTrack =
    deps.clearAssignmentsForTrack ??
    ((trackId: TrackId) => clearTrackAssignments(trackId));

  return {
    async list() {
      const db = await getDatabase();
      return db
        .transaction(STORE_TRACK_META, "readonly")
        .objectStore(STORE_TRACK_META)
        .getAll();
    },

    async importTrack(file) {
      // (1) Puerta MIME: solo audio/* pasa (un tipo vacío no es verificable).
      if (!file.type.startsWith("audio/")) {
        throw toMusicImportError(
          MUSIC_IMPORT_ERROR.undecodable,
          "El archivo no se pudo leer como audio",
        );
      }
      // (2) Sonda de reproducibilidad.
      try {
        await probeFile(file);
      } catch (causa) {
        throw toMusicImportError(
          MUSIC_IMPORT_ERROR.undecodable,
          "El archivo no se pudo leer como audio",
          causa,
        );
      }
      // (3)+(4) Escritura atómica con detección de cuota.
      const meta: TrackMeta = {
        id: newTrackId(),
        name: file.name,
        mime: file.type,
        sizeBytes: file.size,
        importedAt: Date.now(),
      };
      const db = await getDatabase();
      try {
        await writeTrack(db, meta, file);
      } catch (causa) {
        if (isQuotaError(causa)) {
          throw toMusicImportError(
            MUSIC_IMPORT_ERROR.quota,
            "No hay espacio suficiente en el dispositivo para esta canción",
            causa,
          );
        }
        throw causa; // error desconocido: se relanza sin disfrazar (la UI lo hace visible)
      }
      return meta;
    },

    async removeTrack(id) {
      const db = await getDatabase();
      const tx = db.transaction(
        [STORE_TRACK_META, STORE_TRACK_BLOBS],
        "readwrite",
      );
      await Promise.all([
        tx.objectStore(STORE_TRACK_META).delete(id),
        tx.objectStore(STORE_TRACK_BLOBS).delete(id),
        tx.done,
      ]);
      // Huérfanos (§7): la pista ya no existe — ninguna asignación puede referenciarla.
      clearAssignmentsForTrack(id);
    },

    async getObjectUrl(id) {
      const db = await getDatabase();
      const blob = await db
        .transaction(STORE_TRACK_BLOBS, "readonly")
        .objectStore(STORE_TRACK_BLOBS)
        .get(id);
      if (blob === undefined) {
        throw new Error(`Pista no encontrada: ${id}`);
      }
      return URL.createObjectURL(blob);
    },
  };
}

/** Instancia por defecto de la app (con el cableado de huérfanos real). */
export const musicStore: MusicStore = createMusicStore();

// Funciones sueltas del contrato del apéndice (delegan en la instancia por defecto).
export function importTrack(file: File): Promise<TrackMeta> {
  return musicStore.importTrack(file);
}
export function list(): Promise<TrackMeta[]> {
  return musicStore.list();
}
export function removeTrack(id: TrackId): Promise<void> {
  return musicStore.removeTrack(id);
}
export function getObjectUrl(id: TrackId): Promise<string> {
  return musicStore.getObjectUrl(id);
}
