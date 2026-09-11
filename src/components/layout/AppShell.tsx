// Shell servidor de la app (§2.3): cero interactividad aquí — la ruta activa
// y el highlighting viven en NavBar.tsx (cliente). `/sesion` se oculta desde
// dentro de HeaderBar/NavBar vía showNavFor (chrome-minimal).
import { HeaderBar, NavBar } from "./NavBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-base text-text">
      <HeaderBar />
      {/* pb-24 en móvil despeja la barra de pestañas fija inferior */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>
      <NavBar />
    </div>
  );
}
