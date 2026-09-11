// Label — patrón shadcn escrito a mano sin @radix-ui/react-label (fallback
// pre-autorizado; U5 no necesita el slot de radix).
import { cn } from "@/lib/utils";

export function Label({
  className,
  htmlFor,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium text-subtext1",
        "peer-aria-invalid:text-danger",
        className,
      )}
      {...props}
    />
  );
}
