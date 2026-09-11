// Select — select NATIVO estilizado (decisión documentada de U8: radix no
// está en el set de deps aprobado — misma línea que button/input de U5 y el
// diálogo de U7). El select nativo da semántica accesible, teclado y lector
// de pantalla, sin dependencias; TasksBar lo consume para los filtros.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-surface-1 bg-surface-0 px-2 text-sm text-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
