// Adaptador local zod → react-hook-form (rol de `zodResolver` de
// @hookform/resolvers). Decisión documentada (U5): el paquete oficial no está
// en el set de dependencias aprobado (U1) y el orquestador pidió mantener las
// dependencias al mínimo — este adaptador cubre el contrato que U5/U6 usan:
// rutas planas (pantallas de configuración) y rutas anidadas (blocks de
// Personalizado), con los mensajes en español de configSchemas intactos.

import type { FieldErrors, FieldValues, ResolverResult } from "react-hook-form";
import type { z } from "zod";

/** Asigna el error en la ruta anidada (p. ej. blocks[0].values.trabajoS). */
function setAtPath(
  errors: Record<string, unknown>,
  path: readonly PropertyKey[],
  type: string,
  message: string,
): void {
  let node: Record<string, unknown> = errors;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = String(path[i]);
    const next = node[key];
    if (typeof next !== "object" || next === null) {
      node[key] = {};
    }
    node = node[key] as Record<string, unknown>;
  }
  const leaf = String(path[path.length - 1]);
  // El primer issue por ruta gana (zod reporta una issue por nivel de schema).
  if (node[leaf] === undefined) {
    node[leaf] = { type, message };
  }
}

/**
 * Resuelve un formulario de react-hook-form contra un schema zod.
 * Éxito → `{ values: datos parseados, errors: {} }`.
 * Fallo → `{ values: {}, errors }` con el mensaje español en la ruta del campo.
 */
export function zodResolver<TValues extends FieldValues>(
  schema: z.ZodType<TValues>,
): (values: TValues) => ResolverResult<TValues> {
  return (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, unknown> = {};
    for (const issue of result.error.issues) {
      setAtPath(errors, issue.path, issue.code, issue.message);
    }
    return { values: {}, errors: errors as FieldErrors<TValues> };
  };
}
