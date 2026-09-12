// TrackAssigner (U11) — asignación de pista por clase de fase (las CINCO del
// spec audio: preparación, trabajo, descanso, descanso largo, descanso global).
// Lee/escribe directamente el settingsStore persistido: la asignación es
// inmediata y sobrevive recargas (spec «Import persists across reload»).
import { AJUSTES_COPY } from "@/components/shared/copy";
import { Select } from "@/components/ui/select";
import { PHASE_KIND, type PhaseKind } from "@/lib/timer/types";
import type { TrackMeta } from "@/lib/storage/musicStore";
import { useSettingsStore } from "@/stores/settingsStore";

const CLASES: ReadonlyArray<{ kind: PhaseKind; label: string }> = [
  {
    kind: PHASE_KIND.preparacion,
    label: AJUSTES_COPY.musica.clases.preparacion,
  },
  { kind: PHASE_KIND.trabajo, label: AJUSTES_COPY.musica.clases.trabajo },
  { kind: PHASE_KIND.descanso, label: AJUSTES_COPY.musica.clases.descanso },
  {
    kind: PHASE_KIND.descansoLargo,
    label: AJUSTES_COPY.musica.clases.descansoLargo,
  },
  {
    kind: PHASE_KIND.descansoGlobal,
    label: AJUSTES_COPY.musica.clases.descansoGlobal,
  },
];

export interface TrackAssignerProps {
  tracks: TrackMeta[];
}

export function TrackAssigner({ tracks }: TrackAssignerProps) {
  const assignments = useSettingsStore((s) => s.assignments);
  const setAssignment = useSettingsStore((s) => s.setAssignment);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {AJUSTES_COPY.musica.asignarTitulo}
      </h2>
      <ul className="space-y-2">
        {CLASES.map(({ kind, label }) => (
          <li
            key={kind}
            className="flex items-center justify-between gap-3 rounded-md border border-surface-1 bg-surface-dim px-3 py-2"
          >
            <span className="text-sm text-text">{label}</span>
            <Select
              aria-label={label}
              value={assignments[kind] ?? ""}
              onChange={(e) =>
                setAssignment(
                  kind,
                  e.target.value === "" ? null : e.target.value,
                )
              }
            >
              <option value="">{AJUSTES_COPY.musica.ninguna}</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>
    </section>
  );
}
