"use client";

// BlockList (U6) — lista ordenada de BlockCards. La clave de React es el `id`
// estable del bloque (design §3.1): reordenar mueve identidades, no índices.
// Estado vacío visible en español (spec: cero bloques se rechaza al iniciar,
// pero la lista siempre informa qué hacer).

import { BUILDER_COPY } from "@/components/shared/copy";
import type { BlockDef } from "@/lib/timer/types";
import { BlockCard, type BlockCampo, type BlockFieldErrors } from "./BlockCard";

export interface BlockListProps {
  blocks: BlockDef[];
  /** Errores por campo agrupados por índice (posición actual). */
  errorsByIndex: BlockFieldErrors[];
  onFieldChange: (index: number, campo: BlockCampo, valor: number) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export function BlockList({
  blocks,
  errorsByIndex,
  onFieldChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: BlockListProps) {
  if (blocks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-surface-1 p-4 text-sm text-subtext1">
        {BUILDER_COPY.vacio}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4 list-none">
      {blocks.map((block, index) => (
        <li key={block.id}>
          <BlockCard
            block={block}
            position={index + 1}
            errors={errorsByIndex[index] ?? {}}
            onFieldChange={(campo, valor) => onFieldChange(index, campo, valor)}
            onRemove={() => onRemove(index)}
            onMoveUp={() => onMoveUp(index)}
            onMoveDown={() => onMoveDown(index)}
            canMoveUp={index > 0}
            canMoveDown={index < blocks.length - 1}
          />
        </li>
      ))}
    </ol>
  );
}
