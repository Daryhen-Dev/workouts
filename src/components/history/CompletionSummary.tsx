"use client";

// CompletionSummary — única entrada cliente de /resumen (§2.3). Renderiza la
// entrada MÁS NUEVA del historial (spec workout-completion): modo, conteo de
// esfuerzo por modo, duración ACTIVA total (pausas excluidas) y fecha. Toda la
// selección/formateo es la capa pura de lib/history (REFACTOR: la pantalla
// solo pinta selectores).
import { useRouter } from "next/navigation";
import { MODE_LABEL, RESUMEN_COPY } from "@/components/shared/copy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  describeEffort,
  formatDuration,
  newestEntry,
} from "@/lib/history/query";
import { useHistoryStore } from "@/stores/historyStore";

const DATE_FORMATTER = new Intl.DateTimeFormat("es");

export function CompletionSummary() {
  const router = useRouter();
  const entries = useHistoryStore((s) => s.entries);
  const entry = newestEntry(entries);

  if (entry === null) {
    return (
      <div className="space-y-4">
        <p className="text-subtext1">{RESUMEN_COPY.vacio}</p>
        <SummaryActions
          onHome={() => router.push("/")}
          onHistorial={() => router.push("/historial")}
        />
      </div>
    );
  }

  const effort = describeEffort(entry);

  return (
    <div className="space-y-4">
      <Card className="space-y-3 text-center">
        <p className="text-sm text-subtext1">{RESUMEN_COPY.modo}</p>
        <p className="text-3xl font-bold text-accent">
          {MODE_LABEL[entry.mode]}
        </p>
        {effort !== "" && <p className="text-lg text-text">{effort}</p>}
        <p className="text-sm text-subtext1">{RESUMEN_COPY.tiempoActivo}</p>
        <p
          className="font-mono text-4xl"
          aria-label={RESUMEN_COPY.tiempoActivo}
        >
          {formatDuration(entry.activeDurationMs)}
        </p>
        <p className="text-sm text-subtext1">
          {DATE_FORMATTER.format(entry.completedAt)}
        </p>
      </Card>
      <SummaryActions
        onHome={() => router.push("/")}
        onHistorial={() => router.push("/historial")}
      />
    </div>
  );
}

function SummaryActions({
  onHome,
  onHistorial,
}: {
  onHome: () => void;
  onHistorial: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant="primary" size="lg" onClick={onHome}>
        {RESUMEN_COPY.volverInicio}
      </Button>
      <Button variant="outline" size="lg" onClick={onHistorial}>
        {RESUMEN_COPY.verHistorial}
      </Button>
    </div>
  );
}
