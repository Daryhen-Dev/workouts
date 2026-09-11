"use client";

// ReorderControls (U6) — subir/bajar del bloque. Botones simples y testeables:
// el drag-and-drop queda explícitamente fuera del alcance v1 (tasks.md U6).
// Los aria-label llevan la posición actual para que queden únicos por tarjeta.

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILDER_COPY } from "@/components/shared/copy";

export interface ReorderControlsProps {
      /** Posición visible (1-based) del bloque que se controla. */
      position: number;
      canMoveUp: boolean;
      canMoveDown: boolean;
      onMoveUp: () => void;
      onMoveDown: () => void;
}

export function ReorderControls({
      position,
      canMoveUp,
      canMoveDown,
      onMoveUp,
      onMoveDown,
}: ReorderControlsProps) {
      return (
            <div className="flex items-center gap-1">
                  <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`${BUILDER_COPY.subir} ${position}`}
                        disabled={!canMoveUp}
                        onClick={onMoveUp}
                  >
                        <ChevronUp aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`${BUILDER_COPY.bajar} ${position}`}
                        disabled={!canMoveDown}
                        onClick={onMoveDown}
                  >
                        <ChevronDown aria-hidden="true" className="h-4 w-4" />
                  </Button>
            </div>
      );
}
