import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import * as copyModule from "./copy";
import { MODE_LABEL } from "./copy";

// Recorre en profundidad todos los valores string exportados del módulo de
// copy — el "copy audit" del spec ui-design revisa exactamente esto.
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectStrings((value as Record<string, unknown>)[key], out);
    }
  }
  return out;
}

function productionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [relative(process.cwd(), path)]
      : [];
  });
}

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

// Inventario revisado manualmente: superficies que renderizan copy centralizado
// frente a rutas, wrappers y primitives sin copy de producto. Se excluyen clases,
// rutas, IDs, tokens de API, nombres de rutinas/pistas/archivos aportados por la
// persona usuaria, unidades y nombres de producto. Los aria-label sí se auditan.
const CENTRAL_COPY_RENDERING_SURFACES = [
  "src/components/builder/AddBlockMenu.tsx",
  "src/components/builder/BlockCard.tsx",
  "src/components/builder/BlockList.tsx",
  "src/components/builder/PersonalizadoBuilder.tsx",
  "src/components/builder/ReorderControls.tsx",
  "src/components/forms/ClasicoConfigScreen.tsx",
  "src/components/forms/DurationField.tsx",
  "src/components/forms/TabataConfigScreen.tsx",
  "src/components/forms/ValidatedNumberInput.tsx",
  "src/components/history/CompletionSummary.tsx",
  "src/components/history/EntryList.tsx",
  "src/components/history/FiltersBar.tsx",
  "src/components/history/HistoryScreen.tsx",
  "src/components/history/StatsCards.tsx",
  "src/components/home/HomeInstallNudge.tsx",
  "src/components/home/HomeScreen.tsx",
  "src/components/layout/AppShell.tsx",
  "src/components/layout/NavBar.tsx",
  "src/components/routines/ConfirmDeleteRoutineDialog.tsx",
  "src/components/routines/RenameDialog.tsx",
  "src/components/routines/RoutineCard.tsx",
  "src/components/routines/RoutineNameDialog.tsx",
  "src/components/routines/RoutinesScreen.tsx",
  "src/components/routines/SaveRoutineDialog.tsx",
  "src/components/settings/InstallCard.tsx",
  "src/components/settings/MusicLibrary.tsx",
  "src/components/settings/NotificationsCard.tsx",
  "src/components/settings/SettingsScreen.tsx",
  "src/components/settings/TrackAssigner.tsx",
  "src/components/shared/StoreHydrationGate.tsx",
  "src/components/timer/ActiveSessionScreen.tsx",
  "src/components/timer/ConfirmStopDialog.tsx",
  "src/components/timer/Controls.tsx",
  "src/components/timer/NextPhaseHint.tsx",
  "src/components/timer/PhaseRing.tsx",
  "src/components/timer/TimeDisplay.tsx",
] as const;

const REVIEWED_COPY_FREE_OR_INFRASTRUCTURE_SURFACES = [
  "src/app/ajustes/page.tsx",
  "src/app/clasico/page.tsx",
  "src/app/historial/page.tsx",
  "src/app/layout.tsx",
  "src/app/manifest.ts",
  "src/app/offline/page.tsx",
  "src/app/page.tsx",
  "src/app/personalizado/page.tsx",
  "src/app/resumen/page.tsx",
  "src/app/rutinas/page.tsx",
  "src/app/sesion/page.tsx",
  "src/app/sw.ts",
  "src/app/tabata/page.tsx",
  "src/components/layout/nav.ts",
  "src/components/shared/InstallPromptCapture.tsx",
  "src/components/shared/copy.ts",
  "src/components/ui/button.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/label.tsx",
  "src/components/ui/select.tsx",
  "src/components/ui/skeleton.tsx",
  "src/components/ui/toast.tsx",
] as const;

// Allowlist de promesas prohibidas: ninguna cadena de copy de la app puede
// prometer ejecución en segundo plano (spec timer-correctness). Las unidades
// posteriores (U7–U13) extienden esta lista a medida que añaden copy.
const BACKGROUND_PROMISE_PATTERNS: RegExp[] = [
  /en (el )?segundo plano/i,
  /second (plane|background)/i,
  /seguir(á|á corriendo|á funcionando|á sonando|á sonarán)/i,
  /sigue (corriendo|funcionando|sonando)/i,
  /aunque (cierres|salgas|bloquees|apagues|minimices)/i,
  /continuar(á|á sonando)/i,
  /no se (detiene|detendrá|para)/i,
  /seguirán/i,
];

describe("copy — nombres de modo verbatim (§9.2, ui-design)", () => {
  it("mapea los ids de modo a sus nombres españoles verbatim", () => {
    expect(MODE_LABEL.clasico).toBe("Clásico");
    expect(MODE_LABEL.tabata).toBe("Tabata");
    expect(MODE_LABEL.personalizado).toBe("Personalizado");
  });

  it("conserva la tilde de «Clásico»", () => {
    expect(Object.values(MODE_LABEL)).toContain("Clásico");
  });
});

describe("copy — auditoría de promesas en segundo plano", () => {
  it("ninguna cadena de copy promete ejecución en segundo plano", () => {
    const strings = collectStrings(copyModule);
    expect(strings.length).toBeGreaterThan(0);
    for (const text of strings) {
      for (const pattern of BACKGROUND_PROMISE_PATTERNS) {
        expect(
          text,
          `copy prohibido («${text}» no debe prometer ejecución en segundo plano)`,
        ).not.toMatch(pattern);
      }
    }
  });

  it("incluye la marca y las etiquetas de navegación centralizadas", () => {
    expect(copyModule.BRAND).toBe("Tip Tap Workout");
    expect(copyModule.NAV_LABELS.inicio).toBe("Inicio");
    expect(copyModule.NAV_LABELS.rutinas).toBe("Rutinas");
    expect(copyModule.NAV_LABELS.historial).toBe("Historial");
    expect(copyModule.NAV_LABELS.ajustes).toBe("Ajustes");
  });
});

describe("copy — inventario estático y revisión humana de español", () => {
  it("clasifica cada superficie de producción app/components", () => {
    const reviewed = [
      ...CENTRAL_COPY_RENDERING_SURFACES,
      ...REVIEWED_COPY_FREE_OR_INFRASTRUCTURE_SURFACES,
    ].sort();
    expect(productionSources(join(process.cwd(), "src/app"))).toEqual(
      reviewed.filter((path) => path.startsWith("src/app/")),
    );
    expect(productionSources(join(process.cwd(), "src/components"))).toEqual(
      reviewed.filter((path) => path.startsWith("src/components/")),
    );
  });

  it("registra los textos inline españoles revisados", () => {
    expect(source("src/app/layout.tsx")).toContain('<html lang="es"');
    expect(source("src/app/layout.tsx")).toContain(
      'description: "Temporizador de intervalos para entrenos"',
    );
    expect(source("src/app/offline/page.tsx")).toContain("Sin conexión");
    expect(source("src/app/offline/page.tsx")).toContain(
      "Esta página no se ha cargado todavía.",
    );
    expect(source("src/app/sesion/page.tsx")).toContain('title: "Sesión"');
    expect(source("src/components/builder/PersonalizadoBuilder.tsx")).toContain(
      'aria-label="Constructor Personalizado"',
    );
    expect(source("src/components/forms/ClasicoConfigScreen.tsx")).toContain(
      'aria-label="Configuración Clásico"',
    );
    expect(copyModule.HISTORY_COPY.periodo).toBe("Período");
    expect(copyModule.HISTORY_COPY.tipo).toBe("Tipo");
    expect(source("src/components/history/FiltersBar.tsx")).toContain(
      "aria-label={HISTORY_COPY.periodo}",
    );
    expect(source("src/components/layout/NavBar.tsx")).toContain(
      'aria-label="Principal"',
    );
    expect(source("src/components/shared/StoreHydrationGate.tsx")).toContain(
      'aria-label="Cargando datos"',
    );
    expect(source("src/features/session/useSessionController.ts")).toContain(
      'const MEDIA_ARTIST = "Entrenamiento"',
    );
    expect(source("src/lib/pwa/notifications.ts")).toContain(
      'new NotificationApi("Entrenamiento completado")',
    );
  });
});
