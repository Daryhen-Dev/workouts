// Shell servidor de /sesion (§2.3): cero interactividad aquí — la única entrada
// cliente es SessionController. La ruta es chrome-minimal (§2.4): AppShell/NavBar
// ocultan header y barra inferior para /sesion vía showNavFor (testado en U2).
import type { Metadata } from "next";
import { SessionController } from "@/features/session/SessionController";

export const metadata: Metadata = {
  title: "Sesión",
};

export default function SesionPage() {
  return <SessionController />;
}
