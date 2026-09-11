// Botón — patrón shadcn, escrito a mano (fallback pre-autorizado: la CLI alpha
// de shadcn no permite init aditivo; U5 solo consume button/input/label y se
// mantiene sin radix ni cva — variantes como objetos const, §9.1 tratamientos:
// primario = acento + glow; tarjetas/bordes con la escala surface).
import { cn } from "@/lib/utils";

const BUTTON_VARIANTS = {
  primary:
    "bg-accent font-semibold text-base shadow-[0_0_24px_var(--color-accent-glow)] hover:bg-pink-bright active:translate-y-px",
  outline:
    "border border-surface-1 bg-surface-dim text-text hover:border-accent hover:-translate-y-px",
  ghost: "text-subtext1 hover:bg-surface-1 hover:text-text",
} as const;

const BUTTON_SIZES = {
  default: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
}

export function Button({
  variant = "primary",
  size = "default",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
