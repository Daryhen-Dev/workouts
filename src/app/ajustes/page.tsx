import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { AJUSTES_COPY } from "@/components/shared/copy";

// Shell servidor de /ajustes (§2.3): el copy estático vive aquí; la única
// entrada cliente (SettingsScreen) posee biblioteca + asignaciones (U11).
// U13 añade las tarjetas de notificaciones e instalación.
export const metadata = {
  title: `${AJUSTES_COPY.titulo} — Tip Tap Workout`,
};

export default function AjustesPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{AJUSTES_COPY.titulo}</h1>
        <p className="text-subtext1">{AJUSTES_COPY.descripcion}</p>
      </div>
      <SettingsScreen />
    </section>
  );
}
