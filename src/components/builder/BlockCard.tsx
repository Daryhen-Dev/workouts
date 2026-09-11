"use client";

// BlockCard (U6) — tarjeta de un bloque de la secuencia. Reutiliza los campos
// de U5 (DurationField / ValidatedNumberInput — requisito REFACTOR del tasks):
// duraciones con stepper, conteos con entrada validada; mismos mensajes zod.
// Componente de presentación puro: sin RHF — el estado vive en el builder.

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUILDER_COPY, CONFIG_COPY, MODE_LABEL } from "@/components/shared/copy";
import { MODE, type BlockDef, type TabataValues } from "@/lib/timer/types";
import { DurationField } from "@/components/forms/DurationField";
import { ValidatedNumberInput } from "@/components/forms/ValidatedNumberInput";
import { ReorderControls } from "./ReorderControls";

/** Campos editables de un bloque: duraciones + conteos de ambos tipos. */
export type BlockCampo =
  | "preparacionS"
  | "trabajoS"
  | "descansoS"
  | "descansoLargoS"
  | "rondas"
  | "rondasPorTabata"
  | "tabatas";

/** Mensajes de error en español por campo (ausente = sin error). */
export type BlockFieldErrors = Partial<Record<BlockCampo, string>>;

export interface BlockCardProps {
  /** Valores actuales del bloque (id incluido — clave estable). */
  block: BlockDef;
  /** Posición visible (1-based). */
  position: number;
  errors: BlockFieldErrors;
  onFieldChange: (campo: BlockCampo, valor: number) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/**
 * Nota de tipos: BlockDef no correlaciona `tipo` con `values` (diseño §3.1).
 * El estrechamiento aquí es estructural (discriminated union del schema);
 * el cast documentado de U3 vive solo en `personalizadoSeeds` (plan.ts).
 */
export function BlockCard({
  block,
  position,
  errors,
  onFieldChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: BlockCardProps) {
  const { campos } = CONFIG_COPY;
  const idFor = (campo: BlockCampo) => `bloque-${block.id}-${campo}`;
  const esTabata = block.tipo === MODE.tabata;
  const headingId = `bloque-${block.id}-titulo`;
  const values = block.values;
  // Cast documentado (patrón único de U3 en personalizadoSeeds): BlockDef no
  // correlaciona `tipo` con `values`; los valores llegan validados por zod.
  const tabataValues = esTabata ? (values as TabataValues) : null;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg border border-surface-1 bg-surface-dim p-4"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-base font-semibold">
          {`Bloque ${position} · ${MODE_LABEL[block.tipo]}`}
        </h3>
        <div className="flex items-center gap-2">
          <ReorderControls
            position={position}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${BUILDER_COPY.quitar} ${position}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <DurationField
          id={idFor("preparacionS")}
          label={campos.preparacionS}
          value={values.preparacionS}
          onChange={(v) => onFieldChange("preparacionS", v)}
          error={errors.preparacionS}
        />
        <DurationField
          id={idFor("trabajoS")}
          label={campos.trabajoS}
          value={values.trabajoS}
          onChange={(v) => onFieldChange("trabajoS", v)}
          error={errors.trabajoS}
        />
        <DurationField
          id={idFor("descansoS")}
          label={campos.descansoS}
          value={values.descansoS}
          onChange={(v) => onFieldChange("descansoS", v)}
          error={errors.descansoS}
        />
        {esTabata && tabataValues ? (
          <>
            <ValidatedNumberInput
              id={idFor("rondasPorTabata")}
              label={campos.rondasPorTabata}
              value={tabataValues.rondasPorTabata}
              onChange={(v) => onFieldChange("rondasPorTabata", v)}
              error={errors.rondasPorTabata}
            />
            <ValidatedNumberInput
              id={idFor("tabatas")}
              label={campos.tabatas}
              value={tabataValues.tabatas}
              onChange={(v) => onFieldChange("tabatas", v)}
              error={errors.tabatas}
            />
            <DurationField
              id={idFor("descansoLargoS")}
              label={campos.descansoLargoS}
              value={tabataValues.descansoLargoS}
              onChange={(v) => onFieldChange("descansoLargoS", v)}
              error={errors.descansoLargoS}
            />
          </>
        ) : (
          <ValidatedNumberInput
            id={idFor("rondas")}
            label={campos.rondas}
            value={values.rondas}
            onChange={(v) => onFieldChange("rondas", v)}
            error={errors.rondas}
          />
        )}
      </div>
    </article>
  );
}
