// db.ts — IndexedDB «tiptap-workout» v1 (diseño §7, decisión #3).
//
// DOS object stores para que listar NUNCA cargue blobs (el listado lee solo
// trackMeta; los blobs — los únicos datos grandes — solo se tocan al reproducir
// o importar). La conexión es un singleton perezoso: nada se evalúa en el nivel
// superior del módulo (SSR seguro); jsdom no tiene IndexedDB — este módulo solo
// se importa desde superficies cliente y desde pruebas con fake-indexeddb.
//
// `TrackMeta` vive en musicStore.ts (diseño §6.4); aquí se importa SOLO COMO
// TIPO (borrado en runtime — sin ciclo real de módulos: musicStore importa
// valores de db, db no importa nada de musicStore).

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { TrackMeta } from "./musicStore";

export const DB_NAME = "tiptap-workout";
export const DB_VERSION = 1;
export const STORE_TRACK_META = "trackMeta";
export const STORE_TRACK_BLOBS = "trackBlobs";

/** Schema tipado de la base (contrato §7: meta con keyPath id; blobs con clave fuera-de-línea). */
export interface TipTapDBSchema extends DBSchema {
  [STORE_TRACK_META]: {
    key: string;
    value: TrackMeta;
  };
  [STORE_TRACK_BLOBS]: {
    key: string;
    value: Blob;
  };
}

export type MusicDatabase = IDBPDatabase<TipTapDBSchema>;

let dbPromise: Promise<MusicDatabase> | null = null;

/** Conexión singleton perezosa con la base de música (crea stores en v1). */
export function openMusicDb(): Promise<MusicDatabase> {
  if (dbPromise === null) {
    dbPromise = openDB<TipTapDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_TRACK_META)) {
          db.createObjectStore(STORE_TRACK_META, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_TRACK_BLOBS)) {
          // Blob no puede llevar keyPath: clave fuera-de-línea (id explícito).
          db.createObjectStore(STORE_TRACK_BLOBS);
        }
      },
    });
  }
  return dbPromise;
}

/** SOLO PRUEBAS (fake-indexeddb): cierra el singleton y borra la base para
 *  aislar cada test. Ningún código de producción llama esto. */
export async function resetMusicDbForTests(): Promise<void> {
  if (dbPromise !== null) {
    const db = await dbPromise.catch(() => null);
    db?.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}
