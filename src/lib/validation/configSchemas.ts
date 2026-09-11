// Schemas de validación de configuración por modo — diseño §10 (paso 1) y
// specs timer-modes ("Clásico Mode Configuration", "Tabata Mode
// Configuration", "Personalizado Sequence Builder").
//
// Mensajes en español listos para mostrarse bajo el campo del formulario
// (U5/U6 los consumen vía react-hook-form + zodResolver).
//
// Límites documentados (elegidos en U3):
//   - Duraciones: segundos enteros, 1..3600 s por fase.
//   - Conteos (rondas / rondas por tabata / tabatas): enteros, 1..50.
//   - `descansoGlobalS` sigue las mismas reglas de duración (spec).
//
// Nota: `TabataValues.rondas` es vestigial (extends ClasicoValues, diseño
// §3.1); el schema de Tabata valida los SEIS valores del spec y acepta el
// campo heredado como opcional — la compilación usa `rondasPorTabata`.

import { z } from "zod";
import { MODE } from "@/lib/timer/types";

export const MAX_PHASE_SECONDS = 3600;
export const MAX_COUNT = 50;

/** Duración en segundos enteros con límites y mensajes en español. */
function durationSchema(label: string) {
  return z
    .number({ error: `${label} debe ser un número` })
    .int({ error: `${label} debe ser un número entero de segundos` })
    .min(1, { error: `${label} debe durar al menos 1 segundo` })
    .max(MAX_PHASE_SECONDS, {
      error: `${label} no puede durar más de ${MAX_PHASE_SECONDS} segundos`,
    });
}

/** Conteo (rondas/tabatas) en enteros con límites y mensajes en español. */
function countSchema(label: string) {
  return z
    .number({ error: `${label} debe ser un número` })
    .int({ error: `${label} debe ser un número entero` })
    .min(1, { error: `${label} debe ser al menos 1` })
    .max(MAX_COUNT, {
      error: `${label} no puede ser más de ${MAX_COUNT}`,
    });
}

// ——— Values por modo (nivel formulario) ———

export const clasicoValuesSchema = z.object({
  preparacionS: durationSchema("La preparación"),
  trabajoS: durationSchema("El trabajo"),
  descansoS: durationSchema("El descanso"),
  rondas: countSchema("El número de rondas"),
});

export const tabataValuesSchema = z.object({
  preparacionS: durationSchema("La preparación"),
  trabajoS: durationSchema("El trabajo"),
  descansoS: durationSchema("El descanso"),
  rondasPorTabata: countSchema("El número de rondas por tabata"),
  tabatas: countSchema("El número de tabatas"),
  descansoLargoS: durationSchema("El descanso largo"),
  // Vestigial heredado de TabataValues (diseño §3.1) — ignorado por Tabata.
  rondas: countSchema("El número de rondas").optional(),
});

export const blockSchema = z.discriminatedUnion("tipo", [
  z.object({
    id: z.string(),
    tipo: z.literal(MODE.clasico),
    values: clasicoValuesSchema,
  }),
  z.object({
    id: z.string(),
    tipo: z.literal(MODE.tabata),
    values: tabataValuesSchema,
  }),
]);

export const personalizadoValuesSchema = z.object({
  descansoGlobalS: durationSchema("El descanso global"),
  blocks: z
    .array(blockSchema)
    .min(1, { error: "Añade al menos un bloque para iniciar la sesión" }),
});

// ——— Configs completos (nivel SessionConfig) ———

export const clasicoConfigSchema = z.object({
  mode: z.literal(MODE.clasico),
  values: clasicoValuesSchema,
});

export const tabataConfigSchema = z.object({
  mode: z.literal(MODE.tabata),
  values: tabataValuesSchema,
});

export const personalizadoConfigSchema = z.object({
  mode: z.literal(MODE.personalizado),
  descansoGlobalS: durationSchema("El descanso global"),
  blocks: personalizadoValuesSchema.shape.blocks,
});

export const sessionConfigSchema = z.discriminatedUnion("mode", [
  clasicoConfigSchema,
  tabataConfigSchema,
  personalizadoConfigSchema,
]);

// ——— Tipos inferidos para los formularios (U5/U6) ———

export type ClasicoFormValues = z.infer<typeof clasicoValuesSchema>;
export type TabataFormValues = z.infer<typeof tabataValuesSchema>;
export type PersonalizadoFormValues = z.infer<typeof personalizadoValuesSchema>;
export type BlockFormValues = z.infer<typeof blockSchema>;
