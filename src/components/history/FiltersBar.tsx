// FiltersBar — dos selects nativos (período × tipo) con labels en español del
// spec history. Componente presentacional: el estado del filtro vive en
// HistoryScreen; la lógica de filtrado es la capa pura lib/history/query.
import { HISTORY_COPY } from "@/components/shared/copy";
import { Select } from "@/components/ui/select";
import { HISTORY_TYPE, PERIOD, type HistoryFilter } from "@/lib/history/query";

const PERIOD_IDS = [PERIOD.dias7, PERIOD.dias30, PERIOD.todo] as const;
const TYPE_IDS = [
  HISTORY_TYPE.todas,
  HISTORY_TYPE.clasico,
  HISTORY_TYPE.tabata,
  HISTORY_TYPE.personalizado,
] as const;

export function FiltersBar({
  filter,
  onChange,
}: {
  filter: HistoryFilter;
  onChange: (next: HistoryFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-sm text-subtext1">
        {HISTORY_COPY.periodo}
        <Select
          aria-label={HISTORY_COPY.periodo}
          value={filter.period}
          onChange={(e) =>
            onChange({
              ...filter,
              period: e.target.value as HistoryFilter["period"],
            })
          }
        >
          {PERIOD_IDS.map((id) => (
            <option key={id} value={id}>
              {HISTORY_COPY.periodos[id]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm text-subtext1">
        {HISTORY_COPY.tipo}
        <Select
          aria-label={HISTORY_COPY.tipo}
          value={filter.type}
          onChange={(e) =>
            onChange({
              ...filter,
              type: e.target.value as HistoryFilter["type"],
            })
          }
        >
          {TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {HISTORY_COPY.tipos[id]}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
