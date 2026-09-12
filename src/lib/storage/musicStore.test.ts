// musicStore (U11 — diseño §6.4/§7) — pruebas con fake-indexeddb.
//
// jsdom NO tiene IndexedDB: fake-indexeddb se importa SOLO en este archivo de
// music-store (restricción §11.1 — ningún otro test puede depender de él). El
// aislamiento por test lo da `resetMusicDbForTests()` (cierra el singleton de
// conexión y borra la BD).
//
// Cobertura (tasks.md U11 + spec audio):
// - import persiste trackMeta + blob (UNA transacción) y `list()` devuelve solo
//   metadatos; getObjectUrl resuelve el URL del blob almacenado;
// - cuota simulada (writeTrack inyectado) → MusicImportError{quota}, biblioteca
//   intacta SIN archivo parcial (el abort de la transacción es estructural);
// - MIME no-audio, error de sonda y timeout de 10 s → {undecodable};
// - removeTrack borra blob + meta y dispara la limpieza de asignaciones.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORE_TRACK_BLOBS,
  STORE_TRACK_META,
  openMusicDb,
  resetMusicDbForTests,
} from "./db";
import {
  MUSIC_IMPORT_ERROR,
  PROBE_TIMEOUT_MS,
  createMusicStore,
  defaultWriteTrack,
  isMusicImportError,
  type MusicStoreDeps,
} from "./musicStore";

/** Archivo de audio plausible (el contenido no importa: la sonda se inyecta). */
const archivoAudio = (name = "cancion.mp3") =>
  new File([new Uint8Array([1, 2, 3, 4])], name, { type: "audio/mpeg" });

/** Store con sonda OK y limpieza espiada por defecto — cada test inyecta lo suyo. */
function makeStore(overrides: Partial<MusicStoreDeps> = {}) {
  const clearAssignmentsForTrack = vi.fn();
  const store = createMusicStore({
    probeFile: async () => {},
    clearAssignmentsForTrack,
    ...overrides,
  });
  return { store, clearAssignmentsForTrack };
}

/** Lectura CRUD de los DOS stores — aserciones sin pasar por la API bajo prueba. */
async function readRaw(): Promise<{ meta: unknown[]; blobs: unknown[] }> {
  const db = await openMusicDb();
  const tx = db.transaction([STORE_TRACK_META, STORE_TRACK_BLOBS], "readonly");
  const meta = await tx.objectStore(STORE_TRACK_META).getAll();
  const blobs = await tx.objectStore(STORE_TRACK_BLOBS).getAll();
  return { meta, blobs };
}

/** Stub de URLs de objeto: jsdom no implementa createObjectURL/revokeObjectURL.
 *  Registra también el valor entregado a createObjectURL (ver nota de fidelidad). */
const urlCalls: {
  created: unknown[];
  createdUrls: string[];
  revoked: string[];
} = {
  created: [],
  createdUrls: [],
  revoked: [],
};
function stubObjectUrls(): void {
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: (blob: unknown) => {
      n += 1;
      const url = `blob:prueba-${n}`;
      urlCalls.created.push(blob);
      urlCalls.createdUrls.push(url);
      return url;
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: (url: string) => {
      urlCalls.revoked.push(url);
    },
  });
}

// NOTA DE FIDELIDAD DEL FAKE: fake-indexeddb clona los File/Blob de jsdom como
// objeto PLANO (verificado: constructor Object, sin .size) — su structuredClone
// solo reconoce Blobs nativos de Node. En navegadores reales IDB devuelve el Blob
// original; por eso las aserciones de bytes usan el argumento entregado a
// createObjectUrl y el CONTEO de registros, no instanceof/size del clon.

beforeEach(async () => {
  await resetMusicDbForTests();
  urlCalls.created = [];
  urlCalls.createdUrls = [];
  urlCalls.revoked = [];
  stubObjectUrls();
});

describe("importTrack — pipeline §6.4 (spec: Import persists across reload)", () => {
  it("persiste trackMeta + blob en UNA transacción; list() devuelve solo metadatos", async () => {
    const writeTrack = vi.fn(defaultWriteTrack);
    const { store } = makeStore({ writeTrack });

    const meta = await store.importTrack(archivoAudio("Rock.mp3"));

    expect(meta).toMatchObject({
      name: "Rock.mp3",
      mime: "audio/mpeg",
      sizeBytes: 4,
    });
    expect(typeof meta.id).toBe("string");
    expect(meta.id.length).toBeGreaterThan(0);
    // UNA llamada de escritura: la atomicidad de la transacción es del pipeline.
    expect(writeTrack).toHaveBeenCalledTimes(1);
    const [, metaEscrito, blobEscrito] = writeTrack.mock.calls[0];
    expect(metaEscrito.id).toBe(meta.id);
    expect(blobEscrito).toBeInstanceOf(Blob);

    const listado = await store.list();
    expect(listado).toHaveLength(1);
    expect(listado[0]).toEqual(meta);

    // En disco: AMBOS stores poblados; el corte de list() no arrastra blobs.
    const raw = await readRaw();
    expect(raw.meta).toEqual([meta]);
    expect(raw.blobs).toHaveLength(1); // byte-fidelity: nota de fidelidad del fake arriba
  });

  it("sobrevive a una «recarga»: una instancia nueva lista la pista sin re-importar", async () => {
    const { store } = makeStore();
    const meta = await store.importTrack(archivoAudio());

    // Instancia NUEVA (estado de módulo fresco), MISMA base de datos.
    const tiendaFresca = createMusicStore({ probeFile: async () => {} });
    const listado = await tiendaFresca.list();
    expect(listado).toEqual([meta]);
  });

  it("getObjectUrl resuelve el URL del blob almacenado", async () => {
    const { store } = makeStore();
    const meta = await store.importTrack(archivoAudio());

    const url = await store.getObjectUrl(meta.id);
    expect(url).toMatch(/^blob:prueba-\d+$/);
    // createObjectUrl recibió exactamente lo que devolvió el almacén de blobs.
    expect(urlCalls.createdUrls).toHaveLength(1);
    expect(urlCalls.created[0]).toBeDefined();
  });

  it("getObjectUrl de un id inexistente rechaza (contrato: la UI nunca lo llama así)", async () => {
    const { store } = makeStore();
    await expect(store.getObjectUrl("inexistente")).rejects.toBeInstanceOf(
      Error,
    );
  });
});

describe("importTrack — fallo de cuota (spec: Quota exceeded)", () => {
  /** Simula la petición de blob rechazada por cuota: ambas escrituras se emiten,
   *  la transacción ABORTA (semántica nativa) y el error sale con forma de cuota. */
  const writeTrackConCuota: MusicStoreDeps["writeTrack"] = async (
    db,
    meta,
    blob,
  ) => {
    const tx = db.transaction(
      [STORE_TRACK_META, STORE_TRACK_BLOBS],
      "readwrite",
    );
    tx.objectStore(STORE_TRACK_META)
      .put(meta)
      .catch(() => {});
    tx.objectStore(STORE_TRACK_BLOBS)
      .put(blob, meta.id)
      .catch(() => {});
    tx.done.catch(() => {}); // el abort rechaza tx.done: manejado aquí a propósito
    tx.abort();
    throw new DOMException(
      "La cuota de almacenamiento se agotó",
      "QuotaExceededError",
    );
  };

  it("lanza MusicImportError{quota}; biblioteca intacta y SIN archivo parcial", async () => {
    const { store } = makeStore({ writeTrack: writeTrackConCuota });

    const fallo = store.importTrack(
      new File([new Uint8Array(5)], "grande.mp3", { type: "audio/mpeg" }),
    );
    await expect(fallo).rejects.toMatchObject({
      code: MUSIC_IMPORT_ERROR.quota,
    });

    // La biblioteca queda exactamente como estaba: nada en NINGÚN store.
    expect(await store.list()).toEqual([]);
    const raw = await readRaw();
    expect(raw.meta).toEqual([]);
    expect(raw.blobs).toEqual([]);
  });

  it.each([
    [
      "DOMException QuotaExceededError",
      () => new DOMException("x", "QuotaExceededError"),
    ],
    ["código 22 legado", () => Object.assign(new Error("x"), { code: 22 })],
    [
      "nombre con «quota»",
      () =>
        Object.assign(new Error("x"), { name: "NS_ERROR_DOM_QUOTA_REACHED" }),
    ],
  ])(
    "detecta la forma de cuota: %s → MusicImportError{quota}",
    async (_n, make) => {
      const { store } = makeStore({
        writeTrack: async () => {
          throw make();
        },
      });
      const fallo = store.importTrack(archivoAudio());
      await expect(fallo).rejects.toMatchObject({
        code: MUSIC_IMPORT_ERROR.quota,
      });
    },
  );

  it("un error de escritura que NO es de cuota se relanza sin disfrazar", async () => {
    const { store } = makeStore({
      writeTrack: async () => {
        throw new Error("disco roto");
      },
    });
    const fallo = store.importTrack(archivoAudio());
    await expect(fallo).rejects.toThrow("disco roto");
    await expect(fallo).rejects.toSatisfy(
      (err: unknown) => !isMusicImportError(err),
    );
  });
});

describe("importTrack — archivo no decodificable (spec: Undecodable file)", () => {
  it("MIME no-audio se rechaza ANTES de sondear → {undecodable}", async () => {
    const probeFile = vi.fn(async () => {});
    const { store } = makeStore({ probeFile });

    const fallo = store.importTrack(
      new File([new Uint8Array(3)], "nota.txt", {
        type: "text/plain",
      }),
    );
    await expect(fallo).rejects.toMatchObject({
      code: MUSIC_IMPORT_ERROR.undecodable,
    });
    expect(probeFile).not.toHaveBeenCalled();
    expect(await store.list()).toEqual([]);
  });

  it("MIME vacío también se rechaza (no verificable como audio)", async () => {
    const { store } = makeStore();
    const fallo = store.importTrack(
      new File([new Uint8Array(3)], "sin-tipo.bin", { type: "" }),
    );
    await expect(fallo).rejects.toMatchObject({
      code: MUSIC_IMPORT_ERROR.undecodable,
    });
  });

  it("error de la sonda de reproducibilidad → {undecodable}, biblioteca intacta", async () => {
    const { store } = makeStore({
      probeFile: async () => {
        throw new Error("error del elemento audio");
      },
    });
    const fallo = store.importTrack(archivoAudio("roto.mp3"));
    await expect(fallo).rejects.toMatchObject({
      code: MUSIC_IMPORT_ERROR.undecodable,
    });
    expect(await store.list()).toEqual([]);
  });

  it("timeout de la sonda (10 s sin loadedmetadata) → {undecodable}", async () => {
    // Sonda REAL: jsdom no carga medios — loadedmetadata/error nunca disparan,
    // así que el guardia de 10 s es el único desenlace (exacto al diseño §6.4).
    // OJO fake timers: congelan la cola interna de fake-indexeddb, así que la
    // conexión se pre-calienta y el list() posterior se hace con relojes reales.
    const store = createMusicStore({ clearAssignmentsForTrack: vi.fn() });
    await openMusicDb(); // conexión abierta ANTES de congelar los relojes

    vi.useFakeTimers();
    const fallo = store.importTrack(archivoAudio());
    const aserto = expect(fallo).rejects.toMatchObject({
      code: MUSIC_IMPORT_ERROR.undecodable,
    });
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);
    await aserto;
    vi.useRealTimers(); // la cola de IDB vuelve a correr antes de leer

    expect(await store.list()).toEqual([]);
    // La sonda revoca su URL de objeto al salir (sin fugas).
    expect(urlCalls.revoked).toEqual(urlCalls.createdUrls);
  });
});

describe("removeTrack — borrado + limpieza de huérfanos (diseño §7)", () => {
  it("borra meta y blob del almacén y llama a la limpieza de asignaciones", async () => {
    const { store, clearAssignmentsForTrack } = makeStore();
    const meta = await store.importTrack(archivoAudio());

    await store.removeTrack(meta.id);

    expect(await store.list()).toEqual([]);
    const raw = await readRaw();
    expect(raw.meta).toEqual([]);
    expect(raw.blobs).toEqual([]);
    expect(clearAssignmentsForTrack).toHaveBeenCalledWith(meta.id);
  });

  it("eliminar una pista no toca las demás (aislamiento)", async () => {
    const { store } = makeStore();
    const a = await store.importTrack(archivoAudio("a.mp3"));
    const b = await store.importTrack(archivoAudio("b.mp3"));

    await store.removeTrack(a.id);

    expect(await store.list()).toEqual([b]);
  });
});
