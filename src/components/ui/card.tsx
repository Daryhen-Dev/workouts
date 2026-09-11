// Card — patrón shadcn, escrita a mano (misma decisión documentada de U5/U7:
// radix no está en el set de deps aprobado; §9.1: tarjeta = surface-dim con
// borde surface-1 y hover hacia acento).
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-surface-1 bg-surface-dim p-4 transition-all duration-150",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-sm font-medium text-subtext1", className)}
      {...props}
    />
  );
}

export { Card, CardTitle };
