"use client";

// Header + barra de pestañas (§2.4). Ambos son componentes cliente porque
// leen la ruta activa con `usePathname` (siempre como primera llamada, antes
// de cualquier early-return); el shell (AppShell) permanece servidor y esta
// es la única superficie interactiva del layout.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, History, Home, Settings } from "lucide-react";
import { BRAND } from "@/components/shared/copy";
import { cn } from "@/lib/utils";
import { isActivePath, NAV_ITEMS, showNavFor } from "./nav";

const NAV_ICONS = {
  inicio: Home,
  rutinas: Dumbbell,
  historial: History,
  ajustes: Settings,
} as const;

/** Header fijo: marca en mono + acento; en pantallas anchas absorbe la navegación. */
export function HeaderBar() {
  const pathname = usePathname() ?? "/";
  if (!showNavFor(pathname)) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-surface-1 bg-base/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-mono text-sm font-bold uppercase tracking-widest text-accent"
        >
          {BRAND}
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-sm font-medium text-subtext0 transition-colors hover:text-text",
                  active && "text-accent hover:text-accent"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/** Barra de pestañas inferior en móvil (desaparece en pantallas anchas). */
export function NavBar() {
  const pathname = usePathname() ?? "/";
  if (!showNavFor(pathname)) return null;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-surface-1 bg-surface-dim md:hidden"
    >
      <ul className="mx-auto flex max-w-3xl">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = NAV_ICONS[item.key];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-3 text-xs font-medium text-subtext0",
                  active && "text-accent"
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
