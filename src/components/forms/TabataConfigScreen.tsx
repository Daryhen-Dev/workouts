"use client";

// Pantalla de configuración Tabata (U5, TRIANGULATE) — única entrada cliente de
// /tabata (§2.3). Mismos patrones que ClasicoConfigScreen: RHF + zodResolver
// local sobre `tabataValuesSchema`; los SEIS campos del spec validan bajo las
// reglas idénticas y «Iniciar» entrega la config exacta por el seam de U7.

import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CONFIG_COPY } from "@/components/shared/copy";
import { compilePlan } from "@/lib/timer/plan";
import { formatDurationMs, totalPlanMs } from "@/lib/timer/duration";
import { MODE, type TabataConfig, type TabataValues } from "@/lib/timer/types";
import {
  tabataValuesSchema,
  type TabataFormValues,
} from "@/lib/validation/configSchemas";
import { zodResolver } from "@/lib/validation/zodResolver";
import { start as sessionStart } from "@/stores/sessionStore";
import { DurationField } from "./DurationField";
import { ValidatedNumberInput } from "./ValidatedNumberInput";

// Escenario «Valid Tabata configuration» del spec (10/20/10/2/2/60 → 170 s).
const DEFAULT_VALUES: TabataFormValues = {
  preparacionS: 10,
  trabajoS: 20,
  descansoS: 10,
  rondasPorTabata: 2,
  tabatas: 2,
  descansoLargoS: 60,
};

/** Total del plan compilado; null mientras algún valor sea inválido. */
function summaryTotalMs(values: TabataFormValues): number | null {
  const parsed = tabataValuesSchema.safeParse(values);
  if (!parsed.success) return null;
  // `rondas` vestigial (flag U3): el plan usa exclusivamente rondasPorTabata.
  const tabataValues: TabataValues = {
    ...parsed.data,
    rondas: parsed.data.rondasPorTabata,
  };
  return totalPlanMs(compilePlan({ mode: MODE.tabata, values: tabataValues }));
}

export function TabataConfigScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TabataFormValues>({
    resolver: zodResolver(tabataValuesSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const values = watch();
  const totalMs = summaryTotalMs(values);

  const onSubmit = (data: TabataFormValues) => {
    // `rondas` vestigial (flag U3): el tipo TabataValues lo exige; se fija en
    // `rondasPorTabata` — la compilación usa exclusivamente rondasPorTabata.
    const config: TabataConfig = {
      mode: MODE.tabata,
      values: { ...data, rondas: data.rondasPorTabata },
    };
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
      aria-label="Configuración Tabata"
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
        name="rondasPorTabata"
        control={control}
        render={({ field }) => (
          <ValidatedNumberInput
            id="rondasPorTabata"
            label={campos.rondasPorTabata}
            value={field.value}
            onChange={field.onChange}
            error={errors.rondasPorTabata?.message}
          />
        )}
      />
      <Controller
        name="tabatas"
        control={control}
        render={({ field }) => (
          <ValidatedNumberInput
            id="tabatas"
            label={campos.tabatas}
            value={field.value}
            onChange={field.onChange}
            error={errors.tabatas?.message}
          />
        )}
      />
      <Controller
        name="descansoLargoS"
        control={control}
        render={({ field }) => (
          <DurationField
            id="descansoLargoS"
            label={campos.descansoLargoS}
            value={field.value}
            onChange={field.onChange}
            error={errors.descansoLargoS?.message}
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
