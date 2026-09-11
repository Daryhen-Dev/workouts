"use client";

// Controles de sesión (spec Session Controls): Pausar/Reanudar en el MISMO
// botón conmutando por estado, y Detener (que pide confirmación arriba).
import { SESSION_COPY } from "@/components/shared/copy";
import { Button } from "@/components/ui/button";
import { SESSION_STATUS, type SessionStatus } from "@/lib/timer/types";

export interface ControlsProps {
  status: SessionStatus;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function Controls({ status, onPause, onResume, onStop }: ControlsProps) {
  const paused = status === SESSION_STATUS.paused;
  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant={paused ? "primary" : "outline"}
        size="lg"
        onClick={paused ? onResume : onPause}
      >
        {paused ? SESSION_COPY.reanudar : SESSION_COPY.pausar}
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="border-danger text-danger hover:border-danger hover:-translate-y-px"
        onClick={onStop}
      >
        {SESSION_COPY.detener}
      </Button>
    </div>
  );
}
