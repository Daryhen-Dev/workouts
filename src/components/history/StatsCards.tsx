// StatsCards — «X sesiones · tiempo total · duración media» sobre el conjunto
// YA filtrado (spec history: las stats siguen al filtro). Solo pinta; el
// cálculo es computeStats (lib/history/query, puro).
import { HISTORY_COPY } from "@/components/shared/copy";
import { Card, CardTitle } from "@/components/ui/card";
import { formatDuration, type HistoryStats } from "@/lib/history/query";

export function StatsCards({ stats }: { stats: HistoryStats }) {
  const sesiones =
    stats.count === 1 ? HISTORY_COPY.sesion : HISTORY_COPY.sesiones;
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Estadísticas">
      <Card className="text-center">
        <CardTitle>{`${stats.count} ${sesiones}`}</CardTitle>
      </Card>
      <Card className="text-center">
        <CardTitle>{HISTORY_COPY.tiempoTotal}</CardTitle>
        <p className="mt-1 font-mono text-lg">
          {formatDuration(stats.totalMs)}
        </p>
      </Card>
      <Card className="text-center">
        <CardTitle>{HISTORY_COPY.duracionMedia}</CardTitle>
        <p className="mt-1 font-mono text-lg">{formatDuration(stats.avgMs)}</p>
      </Card>
    </div>
  );
}
