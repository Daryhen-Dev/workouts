"use client";

// HomeScreen (U5) — única entrada cliente de / (§2.3): tarjetas de modo con
// los nombres verbatim (spec ui-design) que navegan a cada pantalla de
// configuración. Slot de rutinas rápidas: stub hasta U9 (nada renderizado).
// Nudge de instalación: U13.

import { useRouter } from "next/navigation";
import { Layers, Repeat, Timer } from "lucide-react";
import { HOME_COPY, MODE_LABEL } from "@/components/shared/copy";
import { MODE, type ModeId } from "@/lib/timer/types";

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
            {/* Slot de rutinas rápidas — lo llena U9 (lista de rutinas guardadas
          con arranque directo). Slot de nudge de instalación — U13. */}
        </div>
    );
}
