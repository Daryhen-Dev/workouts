// Lógica de navegación pura (sin React ni APIs del navegador) — §2.4:
// la barra de pestañas inferior colapsa en el header en pantallas anchas y
// la ruta del temporizador `/sesion` es chrome-minimal.
import { NAV_LABELS, type NavKey } from "@/components/shared/copy";

export interface NavItem {
  href: string;
  label: string;
  key: NavKey;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: NAV_LABELS.inicio, key: "inicio" },
  { href: "/rutinas", label: NAV_LABELS.rutinas, key: "rutinas" },
  { href: "/historial", label: NAV_LABELS.historial, key: "historial" },
  { href: "/ajustes", label: NAV_LABELS.ajustes, key: "ajustes" },
];

/** `/sesion` (y sus subrutas) opta por renderizarse sin chrome (§2.4). */
export function showNavFor(pathname: string): boolean {
  return pathname !== "/sesion" && !pathname.startsWith("/sesion/");
}

/** `/` activa solo en la ruta exacta; el resto activa por segmento. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
