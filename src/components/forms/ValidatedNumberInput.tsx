"use client";

// Entrada numérica validada — base compartida de los campos de configuración
// (U5). El valor del formulario es un número; cuando el texto tecleado no
// parsea (vacío, «abc»), se comunica `NaN` y zod reporta el mensaje español
// «debe ser un número». El texto sin clamp pasa directo al formulario: los
// límites los reporta el schema, no el input.
//
// `leftSlot`/`rightSlot` permiten componer steppers (DurationField) alrededor
// del input sin duplicar la lógica de etiqueta/borrador/error.

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ValidatedNumberInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Mensaje de validación en español (RHF/zod); ausente = sin error. */
  error?: string;
  /** Sufijo visual dentro del input, p. ej. «s» de segundos. */
  suffix?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function ValidatedNumberInput({
  id,
  label,
  value,
  onChange,
  error,
  suffix,
  leftSlot,
  rightSlot,
}: ValidatedNumberInputProps) {
  // Borrador local: conserva el texto tal como lo teclea el usuario mientras
  // el valor controlado (número) viaja al formulario.
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    if (Number.isFinite(value) && draft !== String(value)) {
      setDraft(String(value));
    }
  }, [value, draft]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDraft(raw);
    const trimmed = raw.trim();
    onChange(trimmed === "" ? Number.NaN : Number(trimmed));
  };

  return (
    <div className="w-full">
      <Label htmlFor={id} aria-invalid={error ? true : undefined}>
        {label}
      </Label>
      <div className="mt-1.5 flex items-center gap-2">
        {leftSlot}
        <div className="relative w-24 shrink">
          <Input
            id={id}
            inputMode="decimal"
            value={draft}
            onChange={handleChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={suffix ? "pr-7" : undefined}
          />
          {suffix && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtext0"
            >
              {suffix}
            </span>
          )}
        </div>
        {rightSlot}
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className={cn("mt-1.5 text-sm text-danger")}
        >
          {error}
        </p>
      )}
    </div>
  );
}
