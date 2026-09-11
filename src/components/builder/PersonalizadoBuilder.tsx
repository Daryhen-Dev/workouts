"use client";

// Constructor Personalizado (U6) — única entrada cliente de /personalizado
// (§2.3: el shell page.tsx queda en servidor). RHF + zodResolver local sobre
// `personalizadoValuesSchema` (cero bloques ⇒ mensaje español; campos de cada
// bloque validan bajo las reglas de duración/conto del schema U3).
//
// Estado de bloques: el `id` de cada BlockDef es la clave estable (design
// §3.1) — las operaciones estructurales (añadir/quitar/reordenar) reescriben
// el array completo vía setValue, y cada bloque mantiene su estado de
// formulario independiente bajo su ruta anidada `blocks[i].values.*`.
//
// Resumen vivo: compilePlan (puro, U3) + totalPlanMs — el descanso global se
// cuenta SOLO entre bloques consecutivos (nunca tras el final), por
// construcción del compilador.

import { Path, useForm } from "react-hook-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CONFIG_COPY, ROUTINES_COPY } from "@/components/shared/copy";
import { SaveRoutineDialog } from "@/components/routines/SaveRoutineDialog";
import { compilePlan } from "@/lib/timer/plan";
import { formatDurationMs, totalPlanMs } from "@/lib/timer/duration";
import {
  MODE,
  type BlockDef,
  type PersonalizadoConfig,
} from "@/lib/timer/types";
import {
  personalizadoValuesSchema,
  type BlockFormValues,
  type PersonalizadoFormValues,
} from "@/lib/validation/configSchemas";
import { zodResolver } from "@/lib/validation/zodResolver";
import { start as sessionStart } from "@/stores/sessionStore";
import { DurationField } from "@/components/forms/DurationField";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockList } from "./BlockList";
import type { BlockCampo, BlockFieldErrors } from "./BlockCard";

// Descanso global por defecto del escenario del spec («Mixed sequence…», 20 s).
const DEFAULT_VALUES: PersonalizadoFormValues = {
  descansoGlobalS: 20,
  blocks: [],
};

// Semillas con los valores por defecto de U5 para cada tipo de bloque.
const CLASICO_SEED = {
  preparacionS: 10,
  trabajoS: 30,
  descansoS: 15,
  rondas: 2,
};
const TABATA_SEED = {
  preparacionS: 10,
  trabajoS: 20,
  descansoS: 10,
  rondasPorTabata: 2,
  tabatas: 2,
  descansoLargoS: 60,
};

let fallbackCounter = 0;

/** Id estable por bloque: crypto.randomUUID, o contador si no existe (jsdom). */
function newBlockId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  fallbackCounter += 1;
  return `bloque-${Date.now()}-${fallbackCounter}`;
}

function newClasicoBlock(): BlockFormValues {
  return { id: newBlockId(), tipo: MODE.clasico, values: { ...CLASICO_SEED } };
}

function newTabataBlock(): BlockFormValues {
  return { id: newBlockId(), tipo: MODE.tabata, values: { ...TABATA_SEED } };
}

/**
 * Valida y normaliza a la PersonalizadoConfig de envío. El bloque Tabata fija
 * su `rondas` vestigial (flag U3) en `rondasPorTabata` — misma decisión que
 * TabataConfigScreen en U5; la compilación usa exclusivamente rondasPorTabata.
 */
function toPersonalizadoConfig(
  values: PersonalizadoFormValues,
): PersonalizadoConfig | null {
  const parsed = personalizadoValuesSchema.safeParse(values);
  if (!parsed.success) return null;
  const blocks: BlockDef[] = parsed.data.blocks.map((block) =>
    block.tipo === MODE.tabata
      ? {
          id: block.id,
          tipo: block.tipo,
          values: { ...block.values, rondas: block.values.rondasPorTabata },
        }
      : { id: block.id, tipo: block.tipo, values: block.values },
  );
  return {
    mode: MODE.personalizado,
    descansoGlobalS: parsed.data.descansoGlobalS,
    blocks,
  };
}

/**
 * Errores por campo de cada bloque. Cast documentado: el resolver anida los
 * errores por ruta (`blocks[i].values.campo` → {type, message}); el tipado de
 * RHF para arrays de uniones no lo modela, el runtime es un objeto plano con
 * claves numéricas.
 */
function fieldErrorsByIndex(
  errors: { blocks?: unknown },
  blockCount: number,
): BlockFieldErrors[] {
  const raw = errors.blocks as
    | Record<string, { values?: Record<string, { message?: string }> }>
    | undefined;
  const result: BlockFieldErrors[] = [];
  for (let i = 0; i < blockCount; i += 1) {
    const mensajes: BlockFieldErrors = {};
    const values = raw?.[String(i)]?.values;
    if (values) {
      for (const [campo, error] of Object.entries(values)) {
        mensajes[campo as BlockCampo] = error?.message;
      }
    }
    result.push(mensajes);
  }
  return result;
}

export function PersonalizadoBuilder() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<PersonalizadoFormValues>({
    resolver: zodResolver(personalizadoValuesSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const [guardando, setGuardando] = useState(false);

  // Config ACTUAL para «Guardar rutina» (U9), evaluada al confirmar: la misma
  // toPersonalizadoConfig del envío (null si el constructor está inválido).
  const getConfig = () => toPersonalizadoConfig(getValues());

  const values = watch();
  // Cast documentado (patrón U3): los valores del formulario son
  // estructuralmente BlockDefs — solo el `rondas` vestigial de Tabata es
  // opcional en el schema; el render no lee ese campo. La config de envío
  // se normaliza en toPersonalizadoConfig (que SÍ fija rondas).
  const blocks = values.blocks as BlockDef[];
  const config = toPersonalizadoConfig(values);
  const totalMs = config === null ? null : totalPlanMs(compilePlan(config));
  const errorsByIndex = fieldErrorsByIndex(errors, blocks.length);

  // ——— Operaciones estructurales: reescriben el array; ids estables. ———

  const addBlock = (tipo: "clasico" | "tabata") => {
    const nuevos = [
      ...getValues("blocks"),
      tipo === MODE.tabata ? newTabataBlock() : newClasicoBlock(),
    ];
    setValue("blocks", nuevos, { shouldDirty: true });
    clearErrors("blocks");
  };

  const removeBlock = (index: number) => {
    const restantes = getValues("blocks").filter((_, i) => i !== index);
    setValue("blocks", restantes, { shouldDirty: true });
    clearErrors("blocks");
  };

  const moveBlock = (index: number, direccion: -1 | 1) => {
    const destino = index + direccion;
    const actuales = getValues("blocks");
    if (destino < 0 || destino >= actuales.length) return;
    const reordenados = [...actuales];
    [reordenados[index], reordenados[destino]] = [
      reordenados[destino],
      reordenados[index],
    ];
    setValue("blocks", reordenados, { shouldDirty: true });
    clearErrors("blocks");
  };

  const changeBlockField = (
    index: number,
    campo: BlockCampo,
    valor: number,
  ) => {
    setValue(
      `blocks.${index}.values.${campo}` as Path<PersonalizadoFormValues>,
      valor,
      {
        shouldDirty: true,
      },
    );
  };

  const onSubmit = (data: PersonalizadoFormValues) => {
    const personalizado = toPersonalizadoConfig(data);
    if (personalizado) {
      // Seam documentado en src/stores/sessionStore.ts — U7 implementa el store.
      sessionStart(personalizado);
      router.push("/sesion");
    }
  };

  // Error a nivel de array (cero bloques): message directo del resolver.
  const arrayError = (errors.blocks as { message?: string } | undefined)
    ?.message;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
      aria-label="Constructor Personalizado"
    >
      <AddBlockMenu
        onAddClasico={() => addBlock(MODE.clasico)}
        onAddTabata={() => addBlock(MODE.tabata)}
      />

      <BlockList
        blocks={blocks}
        errorsByIndex={errorsByIndex}
        onFieldChange={changeBlockField}
        onRemove={removeBlock}
        onMoveUp={(index) => moveBlock(index, -1)}
        onMoveDown={(index) => moveBlock(index, 1)}
      />

      {arrayError && (
        <p role="alert" className="text-sm text-danger">
          {arrayError}
        </p>
      )}

      <Controller
        name="descansoGlobalS"
        control={control}
        render={({ field }) => (
          <DurationField
            id="descansoGlobalS"
            label={CONFIG_COPY.campos.descansoGlobalS}
            value={field.value}
            onChange={field.onChange}
            error={errors.descansoGlobalS?.message}
          />
        )}
      />

      <p className="text-sm text-subtext1">
        {CONFIG_COPY.duracionTotal}:{" "}
        <span
          data-testid="total-sesion"
          className="font-mono text-base font-semibold text-text"
        >
          {totalMs === null ? "—" : formatDurationMs(totalMs)}
        </span>
      </p>

      <Button type="submit" size="lg" className="w-full">
        {CONFIG_COPY.iniciar}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setGuardando(true)}
      >
        {ROUTINES_COPY.guardarRutina}
      </Button>

      <SaveRoutineDialog
        open={guardando}
        getConfig={getConfig}
        onClose={() => setGuardando(false)}
      />
    </form>
  );
}
