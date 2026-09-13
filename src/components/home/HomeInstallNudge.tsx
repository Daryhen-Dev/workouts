"use client";

import { useSyncExternalStore } from "react";
import { AJUSTES_COPY } from "@/components/shared/copy";
import { getInstallSnapshot, subscribeInstallState } from "@/lib/pwa/install";
import { useSettingsStore } from "@/stores/settingsStore";

function isIosBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Persisted Home-only iOS installation guidance; Chromium prompting stays in Settings. */
export function HomeInstallNudge() {
  const snapshot = useSyncExternalStore(
    subscribeInstallState,
    getInstallSnapshot,
    getInstallSnapshot,
  );
  const installNudgeDismissedAt = useSettingsStore(
    (state) => state.installNudgeDismissedAt,
  );
  const dismissInstallNudge = useSettingsStore(
    (state) => state.dismissInstallNudge,
  );

  if (
    !isIosBrowser() ||
    snapshot.isInstalled ||
    installNudgeDismissedAt !== null
  ) {
    return null;
  }

  return (
    <section className="mt-8 space-y-3 rounded-lg border border-surface-1 bg-surface-dim p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{AJUSTES_COPY.instalacion.titulo}</h2>
        <p className="text-sm text-subtext1">
          {AJUSTES_COPY.instalacion.iosGuia}
        </p>
      </div>
      <button
        type="button"
        className="rounded-md border border-surface-1 px-3 py-2 text-sm font-medium"
        onClick={() => dismissInstallNudge(Date.now())}
      >
        {AJUSTES_COPY.instalacion.descartarIos}
      </button>
    </section>
  );
}
