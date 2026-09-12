// /ajustes (U11 — diseño §6.4/§7): biblioteca de música + asignación por clase.
//
// Contrato bajo prueba (tasks.md U11 TRIANGULATE + spec audio):
// - MusicLibrary: importar vía File API (picker), listar nombre/tamaño, quitar;
// - fallos de importación VISIBLES como toasts españoles (cuota/indescodificable),
//   la biblioteca queda intacta y las sesiones en curso NO se ven afectadas
//   (importar vive SOLO en /ajustes — el reproductor nunca se toca);
// - TrackAssigner: asignar por clase de fase (las cinco) → settingsStore;
// - quitar una pista limpia la asignación huérfana (contrato §7).
//
// El musicStore se mockea a nivel instancia (list/importTrack/removeTrack); el
// settingsStore es REAL (las asignaciones deben persistir de verdad).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AjustesPage from "@/app/ajustes/page";
import { MUSIC_IMPORT_ERROR, type TrackMeta } from "@/lib/storage/musicStore";
import { PHASE_KIND } from "@/lib/timer/types";
import { clearTrackAssignments, useSettingsStore } from "@/stores/settingsStore";

// Instancia del store de música mockeada (el pipeline real vive en musicStore.test).
const storeMocks = vi.hoisted(() => ({
  list: vi.fn(),
  importTrack: vi.fn(),
  removeTrack: vi.fn(),
  getObjectUrl: vi.fn(),
}));
vi.mock("@/lib/storage/musicStore", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/storage/musicStore")>();
  return {
    ...actual,
    musicStore: {
      list: storeMocks.list,
      importTrack: storeMocks.importTrack,
      removeTrack: storeMocks.removeTrack,
      getObjectUrl: storeMocks.getObjectUrl,
    },
  };
});

// El reproductor queda espiado: importar/asignar/quitar NUNCA lo toca.
const playerMocks = vi.hoisted(() => ({
  retarget: vi.fn(),
  pauseMusic: vi.fn(),
  resumeMusic: vi.fn(),
  stopMusic: vi.fn(),
}));
vi.mock("@/lib/audio/musicPlayer", () => ({
  retargetToPhase: playerMocks.retarget,
  pauseMusic: playerMocks.pauseMusic,
  resumeMusic: playerMocks.resumeMusic,
  stopMusic: playerMocks.stopMusic,
}));

import { SettingsScreen } from "./SettingsScreen";

const meta = (id: string, name: string, sizeBytes = 1_234_567): TrackMeta => ({
  id,
  name,
  mime: "audio/mpeg",
  sizeBytes,
  importedAt: 1_700_000_000_000,
});

const TRACKS: TrackMeta[] = [meta("track-1", "Suena.mp3"), meta("track-2", "Ritmo.ogg")];

function quotaError(): Error {
  const error = new Error("cuota") as Error & { code: string };
  error.code = MUSIC_IMPORT_ERROR.quota;
  return error;
}

function undecodableError(): Error {
  const error = new Error("roto") as Error & { code: string };
  error.code = MUSIC_IMPORT_ERROR.undecodable;
  return error;
}

function archivo(nombre = "nueva.mp3"): File {
  return new File([new Uint8Array([1, 2, 3])], nombre, { type: "audio/mpeg" });
}

beforeEach(() => {
  window.localStorage.clear();
  useSettingsStore.setState({
    assignments: {
      [PHASE_KIND.preparacion]: null,
      [PHASE_KIND.trabajo]: null,
      [PHASE_KIND.descanso]: null,
      [PHASE_KIND.descansoLargo]: null,
      [PHASE_KIND.descansoGlobal]: null,
    },
    notificationsOptIn: false,
    installNudgeDismissedAt: null,
  });
  storeMocks.list.mockReset().mockResolvedValue([...TRACKS]);
  storeMocks.importTrack.mockReset().mockResolvedValue(meta("track-3", "nueva.mp3"));
  storeMocks.removeTrack
    .mockReset()
    .mockImplementation(async (id: string) => {
      // Contrato de huérfanos (§7): removeTrack limpia asignaciones — el
      // comportamiento del STORE REAL está probado en musicStore.test.
      clearTrackAssignments(id);
    });
  storeMocks.getObjectUrl.mockReset();
  playerMocks.retarget.mockClear();
  playerMocks.pauseMusic.mockClear();
  playerMocks.resumeMusic.mockClear();
  playerMocks.stopMusic.mockClear();
});

describe("/ajustes — shell y biblioteca", () => {
  it("el shell renderiza encabezado, importador y asignaciones", async () => {
    render(<AjustesPage />);

    expect(screen.getByRole("heading", { name: "Ajustes" })).toBeVisible();
    expect(
      await screen.findByRole("button", { name: /Importar canción/i }),
    ).toBeVisible();
    // Las CINCO clases de fase tienen su selector.
    for (const etiqueta of [
      "Preparación",
      "Trabajo",
      "Descanso",
      "Descanso largo",
      "Descanso global",
    ]) {
      expect(screen.getByRole("combobox", { name: etiqueta })).toBeVisible();
    }
  });

  it("la biblioteca lista el nombre de cada pista importada", async () => {
    render(<SettingsScreen />);

    // El nombre aparece en la fila de la biblioteca Y como opción del selector.
    expect((await screen.findAllByText("Suena.mp3")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ritmo.ogg").length).toBeGreaterThan(0);
  });

  it("importar una canción válida la añade a la biblioteca", async () => {
    const conNueva = [...TRACKS, meta("track-3", "nueva.mp3")];
    storeMocks.list.mockResolvedValueOnce([...TRACKS]).mockResolvedValue(conNueva);
    render(<SettingsScreen />);
    await screen.findAllByText("Suena.mp3");

    fireEvent.change(screen.getByLabelText(/Importar canción/i), {
      target: { files: [archivo()] },
    });

    expect(storeMocks.importTrack).toHaveBeenCalledTimes(1);
    expect((await screen.findAllByText("nueva.mp3")).length).toBeGreaterThan(0);
  });
});

describe("/ajustes — fallos de importación visibles (spec audio)", () => {
  it("cuota: toast español visible y biblioteca intacta", async () => {
    storeMocks.importTrack.mockRejectedValue(quotaError());
    render(<SettingsScreen />);
    await screen.findAllByText("Suena.mp3");

    fireEvent.change(screen.getByLabelText(/Importar canción/i), {
      target: { files: [archivo("enorme.mp3")] },
    });

    expect(
      await screen.findByText(
        "No hay espacio suficiente en el dispositivo para esta canción",
      ),
    ).toBeVisible();
    // Biblioteca intacta: las pistas existentes siguen y nada se eliminó.
    expect(screen.getAllByText("Suena.mp3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ritmo.ogg").length).toBeGreaterThan(0);
    expect(storeMocks.removeTrack).not.toHaveBeenCalled();
    expect(
      await screen.queryByText("enorme.mp3"),
    ).not.toBeInTheDocument();
  });

  it("indescodificable: toast español visible y la importación se rechaza", async () => {
    storeMocks.importTrack.mockRejectedValue(undecodableError());
    render(<SettingsScreen />);
    await screen.findAllByText("Suena.mp3");

    fireEvent.change(screen.getByLabelText(/Importar canción/i), {
      target: { files: [archivo("corrupto.mp3")] },
    });

    expect(
      await screen.findByText("El archivo no se pudo leer como audio"),
    ).toBeVisible();
    expect(screen.getAllByText("Suena.mp3").length).toBeGreaterThan(0);
    expect(storeMocks.removeTrack).not.toHaveBeenCalled();
  });

  it("importar (éxito o fallo) NUNCA toca el reproductor (sesiones intactas)", async () => {
    storeMocks.importTrack.mockRejectedValueOnce(quotaError());
    render(<SettingsScreen />);
    await screen.findAllByText("Suena.mp3");

    fireEvent.change(screen.getByLabelText(/Importar canción/i), {
      target: { files: [archivo("falla.mp3")] },
    });
    await screen.findByText(
      "No hay espacio suficiente en el dispositivo para esta canción",
    );
    fireEvent.change(screen.getByLabelText(/Importar canción/i), {
      target: { files: [archivo("va.mp3")] },
    });
    await waitFor(() =>
      expect(storeMocks.importTrack).toHaveBeenCalledTimes(2),
    );

    expect(playerMocks.retarget).not.toHaveBeenCalled();
    expect(playerMocks.pauseMusic).not.toHaveBeenCalled();
    expect(playerMocks.resumeMusic).not.toHaveBeenCalled();
    expect(playerMocks.stopMusic).not.toHaveBeenCalled();
  });
});

describe("/ajustes — asignación por clase de fase (spec audio)", () => {
  it("asignar una pista a Trabajo persiste en settingsStore; Ninguna desasigna", async () => {
    render(<SettingsScreen />);
    await screen.findAllByText("Suena.mp3");

    fireEvent.change(screen.getByRole("combobox", { name: "Trabajo" }), {
      target: { value: "track-1" },
    });

    expect(useSettingsStore.getState().assignments[PHASE_KIND.trabajo]).toBe(
      "track-1",
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Trabajo" }), {
      target: { value: "" },
    });

    expect(useSettingsStore.getState().assignments[PHASE_KIND.trabajo]).toBeNull();
  });

  it("el selector refleja la asignación persistida (vuelve con la pista elegida)", async () => {
    useSettingsStore.getState().setAssignment(PHASE_KIND.descanso, "track-2");
    render(<SettingsScreen />);
    await screen.findAllByText("Suena.mp3");

    const descanso = screen.getByRole("combobox", {
      name: "Descanso",
    }) as HTMLSelectElement;
    expect(descanso.value).toBe("track-2");
  });

  it("quitar una pista llama removeTrack, limpia la asignación huérfana y refresca", async () => {
    useSettingsStore.getState().setAssignment(PHASE_KIND.trabajo, "track-1");
    storeMocks.list
      .mockResolvedValueOnce([...TRACKS]) // carga inicial: ambas pistas
      .mockResolvedValue([TRACKS[1]]); // tras quitar, queda una
    render(<SettingsScreen />);
    await screen.findAllByText("Suena.mp3");

    fireEvent.click(screen.getByRole("button", { name: "Quitar Suena.mp3" }));

    await waitFor(() =>
      expect(storeMocks.removeTrack).toHaveBeenCalledWith("track-1"),
    );
    expect(useSettingsStore.getState().assignments[PHASE_KIND.trabajo]).toBeNull();
    await waitFor(() =>
      expect(screen.queryByText("Suena.mp3")).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText("Ritmo.ogg").length).toBeGreaterThan(0);
  });
});
