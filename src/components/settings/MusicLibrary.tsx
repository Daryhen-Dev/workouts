// MusicLibrary (U11) — importar vía File API (picker nativo con accept="audio/*"),
// listar (nombre + tamaño) y quitar pistas. Presentacional: toda la interacción
// la posee SettingsScreen (única entrada cliente de la ruta).
import { useRef } from "react";
import { Trash2, Upload } from "lucide-react";
import { AJUSTES_COPY } from "@/components/shared/copy";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrackMeta } from "@/lib/storage/musicStore";

export interface MusicLibraryProps {
  /** null = cargando de IndexedDB; [] = biblioteca vacía.
   *  Pista importada o eliminada — refresca desde SettingsScreen. */
  tracks: TrackMeta[] | null;
  importing: boolean;
  onImport: (file: File) => void;
  onRemove: (id: string) => void;
}

/** Tamaño legible con coma decimal española («kB»/«MB», sin traducir unidades). */
function formatBytes(bytes: number): string {
  const es = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${es.format(kb)} kB`;
  return `${es.format(kb / 1024)} MB`;
}

export function MusicLibrary({
  tracks,
  importing,
  onImport,
  onRemove,
}: MusicLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{AJUSTES_COPY.musica.titulo}</h2>
      <p className="text-sm text-subtext1">{AJUSTES_COPY.musica.descripcion}</p>

      {/* Picker File API: input oculto + botón accesible que lo dispara. */}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        aria-label={AJUSTES_COPY.musica.importar}
        className="sr-only"
        data-testid="importar-cancion-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = ""; // re-elegir el MISMO archivo vuelve a disparar
        }}
      />
      <Button
        variant="outline"
        disabled={importing}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden />
        {importing ? AJUSTES_COPY.musica.importando : AJUSTES_COPY.musica.importar}
      </Button>

      {tracks === null ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-subtext1">{AJUSTES_COPY.musica.vacio}</p>
      ) : (
        <ul className="space-y-2">
          {tracks.map((track) => (
            <li
              key={track.id}
              className="flex items-center justify-between gap-3 rounded-md border border-surface-1 bg-surface-dim px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-text">{track.name}</p>
                <p className="text-xs text-subtext1">
                  {formatBytes(track.sizeBytes)}
                </p>
              </div>
              <Button
                variant="ghost"
                aria-label={`${AJUSTES_COPY.musica.quitar} ${track.name}`}
                onClick={() => onRemove(track.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {AJUSTES_COPY.musica.quitar}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
