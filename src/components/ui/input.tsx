// Input — patrón shadcn escrito a mano (sin radix; ver nota en button.tsx).
import { cn } from "@/lib/utils";

export function Input({
  className,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-md border border-surface-1 bg-surface-0 px-3 text-text",
        "placeholder:text-subtext0 focus-visible:border-accent focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/40",
        "aria-invalid:border-danger",
        "text-center tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
