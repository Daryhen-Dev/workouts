"use client";

// HomeScreen (U5) — única entrada cliente de / (§2.3): tarjetas de modo con
// los nombres verbatim (spec ui-design) que navegan a cada pantalla de
// configuración. Slot de rutinas rápidas (U9): lista las rutinas guardadas y
// las arranca directamente (sessionStore.start(routine.config) + /sesion).
// Nudge de instalación: U13.

import { useRouter } from "next/navigation";
import { Layers, Play, Repeat, Timer } from "lucide-react";
import { HOME_COPY, MODE_LABEL } from "@/components/shared/copy";
import { MODE, type ModeId } from "@/lib/timer/types";
import { start as sessionStart } from "@/stores/sessionStore";
import { useRoutinesStore, type RoutineRecord } from "@/stores/routinesStore";

const MODE_ICONS = {
    clasico: Timer,
    tabata: Repeat,
    personalizado: Layers,
} as const;

interface ModeCard {
    mode: ModeId;
    href: string;
}

const MODE_CARDS: ModeCard[] = [
    { mode: MODE.clasico, href: "/clasico" },
    { mode: MODE.tabata, href: "/tabata" },
    { mode: MODE.personalizado, href: "/personalizado" },
];

export function HomeScreen() {
    const router = useRouter();
    const routines = useRoutinesStore((s) => s.routines);

    /** Arranque directo desde el slot (spec routines): config guardada exacta. */
    const startRoutine = (routine: RoutineRecord) => {
        sessionStart(routine.config);
        router.push("/sesion");
    };

    return (
        <div className="mt-6">
            <h2 className="text-sm font-medium text-subtext1">
                {HOME_COPY.subtitulo}
            </h2>
            {/* Tratamiento de tarjeta §9.1: surface-dim + borde surface-1, hover
              acento + translateY(-2px). */}
            <div className="mt-3 grid gap-3">
                {MODE_CARDS.map(({ mode, href }) => {
                    const Icon = MODE_ICONS[mode];
                    return (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => router.push(href)}
                            className="flex items-center gap-4 rounded-lg border border-surface-1 bg-surface-dim p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface-1 text-accent">
                                <Icon aria-hidden="true" className="h-5 w-5" />
                            </span>
                            <span>
                                <span className="block text-base font-semibold">
                                    {MODE_LABEL[mode]}
                                </span>
                                <span className="mt-0.5 block text-sm text-subtext0">
                                    {HOME_COPY.modos[mode]}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Slot de rutinas rápidas (U9): solo con rutinas guardadas. */}
            {routines.length > 0 && (
                <section className="mt-8" aria-labelledby="rutinas-guardadas">
                    <h2
                        id="rutinas-guardadas"
                        className="text-sm font-medium text-subtext1"
                    >
                        {HOME_COPY.rutinasTitulo}
                    </h2>
                    <div className="mt-3 grid gap-2">
                        {routines.map((routine) => (
                            <button
                                key={routine.id}
                                type="button"
                                onClick={() => startRoutine(routine)}
                                className="flex items-center justify-between gap-3 rounded-lg border border-surface-1 bg-surface-dim px-4 py-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                                <span className="min-w-0 truncate font-medium">
                                    {routine.name}
                                </span>
                                <span className="flex shrink-0 items-center gap-2 text-sm text-subtext1">
                                    {MODE_LABEL[routine.mode]}
                                    <Play
                                        aria-hidden="true"
                                        className="h-4 w-4 text-accent"
                                    />
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
            {/* Slot de nudge de instalación — U13. */}
        </div>
    );
}
