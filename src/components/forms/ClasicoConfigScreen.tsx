"use client";

// Pantalla de configuración Clásico (U5) — única entrada cliente de /clasico
// (§2.3: el shell page.tsx queda en servidor). RHF + zodResolver local sobre
// `clasicoValuesSchema`: valores inválidos bloquean «Iniciar» y muestran el
// mensaje español del schema (spec timer-modes). El resumen de duración total
// se deriva del plan compilado (compilePlan es puro, §3.2).

import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CONFIG_COPY } from "@/components/shared/copy";
import { compilePlan } from "@/lib/timer/plan";
import { formatDurationMs, totalPlanMs } from "@/lib/timer/duration";
import { MODE, type ClasicoConfig } from "@/lib/timer/types";
import {
  clasicoValuesSchema,
  type ClasicoFormValues,
} from "@/lib/validation/configSchemas";
import { zodResolver } from "@/lib/validation/zodResolver";
import { start as sessionStart } from "@/stores/sessionStore";
import { DurationField } from "./DurationField";
import { ValidatedNumberInput } from "./ValidatedNumberInput";

// Escenario «Valid configuration starts a session» del spec como valores por
// defecto (10/30/15/2 → 85 s).
const DEFAULT_VALUES: ClasicoFormValues = {
  preparacionS: 10,
  trabajoS: 30,
  descansoS: 15,
  rondas: 2,
};

/** Total del plan compilado; null mientras algún valor sea inválido. */
function summaryTotalMs(values: ClasicoFormValues): number | null {
  const parsed = clasicoValuesSchema.safeParse(values);
  if (!parsed.success) return null;
  return totalPlanMs(compilePlan({ mode: MODE.clasico, values: parsed.data }));
}

export function ClasicoConfigScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClasicoFormValues>({
    resolver: zodResolver(clasicoValuesSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const values = watch();
  const totalMs = summaryTotalMs(values);

  const onSubmit = (data: ClasicoFormValues) => {
    const config: ClasicoConfig = { mode: MODE.clasico, values: data };
    // Seam documentado en src/stores/sessionStore.ts — U7 implementa el store.
    sessionStart(config);
    router.push("/sesion");
  };

  const { campos } = CONFIG_COPY;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
      aria-label="Configuración Clásico"
    >
      <Controller
        name="preparacionS"
        control={control}
        render={({ field }) => (
          <DurationField
            id="preparacionS"
            label={campos.preparacionS}
            value={field.value}
            onChange={field.onChange}
            error={errors.preparacionS?.message}
          />
        )}
      />
      <Controller
        name="trabajoS"
        control={control}
        render={({ field }) => (
          <DurationField
            id="trabajoS"
            label={campos.trabajoS}
            value={field.value}
            onChange={field.onChange}
            error={errors.trabajoS?.message}
          />
        )}
      />
      <Controller
        name="descansoS"
        control={control}
        render={({ field }) => (
          <DurationField
            id="descansoS"
            label={campos.descansoS}
            value={field.value}
            onChange={field.onChange}
            error={errors.descansoS?.message}
          />
        )}
      />
      <Controller
        name="rondas"
        control={control}
        render={({ field }) => (
          <ValidatedNumberInput
            id="rondas"
            label={campos.rondas}
            value={field.value}
            onChange={field.onChange}
            error={errors.rondas?.message}
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
    </form>
  );
}
