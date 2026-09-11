// shadcn/ui skeleton (manual, per the U2 fallback for the flaky shadcn CLI),
// tinted with the Gentleman surface token instead of the default gray so the
// hydration gates match the single dark skin (design §9.1/§9.3).
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface-1", className)}
      {...props}
    />
  );
}

export { Skeleton };
