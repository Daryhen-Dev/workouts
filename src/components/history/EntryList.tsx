// EntryList — filas de historial, la más reciente PRIMERO. Presentacional:
// orden (desc por completedAt, estable), esfuerzo y formatos vienen de la
// capa pura (query.ts). Fechas vía Intl.DateTimeFormat("es") (diseño §5).
import { HISTORY_COPY, MODE_LABEL } from "@/components/shared/copy";
import { describeEffort, formatDuration } from "@/lib/history/query";
import type { HistoryEntry } from "@/lib/history/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("es");

export function EntryList({
  entries,
  hasAnyEntry,
}: {
  entries: HistoryEntry[];
  hasAnyEntry: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-subtext1" role="status">
        {hasAnyEntry ? HISTORY_COPY.sinResultados : HISTORY_COPY.vacio}
      </p>
    );
  }

  const newestFirst = [...entries].sort(
    (a, b) => b.completedAt - a.completedAt,
  );

  return (
    <ul className="space-y-2">
      {newestFirst.map((entry) => {
        const effort = describeEffort(entry);
        return (
          <li
            key={entry.id}
            data-entry-id={entry.id}
            className="flex items-center justify-between gap-2 rounded-md border border-surface-1 bg-surface-dim px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium">{MODE_LABEL[entry.mode]}</p>
              {effort !== "" && (
                <p className="text-sm text-subtext1">{effort}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-mono">
                {formatDuration(entry.activeDurationMs)}
              </p>
              <p className="text-sm text-subtext1">
                {DATE_FORMATTER.format(entry.completedAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
