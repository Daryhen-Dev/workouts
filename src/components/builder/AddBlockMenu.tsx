"use client";

// AddBlockMenu (U6) — añadir un bloque Clásico o Tabata a la secuencia.
// Menú plano de dos acciones (simple y testeable); sin dropdown: el diseño pide
// «add block via AddBlockMenu», la forma mínima son dos botones visibles.

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILDER_COPY } from "@/components/shared/copy";

export interface AddBlockMenuProps {
  onAddClasico: () => void;
  onAddTabata: () => void;
}

export function AddBlockMenu({ onAddClasico, onAddTabata }: AddBlockMenuProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={onAddClasico}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        {BUILDER_COPY.anadirClasico}
      </Button>
      <Button type="button" variant="outline" onClick={onAddTabata}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        {BUILDER_COPY.anadirTabata}
      </Button>
    </div>
  );
}
