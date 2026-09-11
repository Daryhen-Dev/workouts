"use client";

// HistoryScreen — única entrada cliente de /historial (§2.3). Posee SOLO el
// estado de UI del filtro (período × tipo); todo el filtrado, las estadísticas
// y el orden son la capa pura lib/history/query (REFACTOR del tasks.md U8:
// las pantallas solo renderizan selectores). `now` se lee en cada render.
import { useState } from "react";
import { EntryList } from "./EntryList";
import { FiltersBar } from "./FiltersBar";
import { StatsCards } from "./StatsCards";
import {
    HISTORY_TYPE,
    PERIOD,
    computeStats,
    filterEntries,
    type HistoryFilter,
} from "@/lib/history/query";
import { useHistoryStore } from "@/stores/historyStore";

const DEFAULT_FILTER: HistoryFilter = {
    period: PERIOD.todo,
    type: HISTORY_TYPE.todas,
};

export function HistoryScreen() {
    const entries = useHistoryStore((s) => s.entries);
    const [filter, setFilter] = useState<HistoryFilter>(DEFAULT_FILTER);

    const filtered = filterEntries(entries, filter, Date.now());
    const stats = computeStats(filtered);

    return (
        <div className="space-y-4">
            <FiltersBar filter={filter} onChange={setFilter} />
            <StatsCards stats={stats} />
            <EntryList entries={filtered} hasAnyEntry={entries.length > 0} />
        </div>
    );
}
