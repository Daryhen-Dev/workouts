"use client";

import { useState, useSyncExternalStore } from "react";
import { AJUSTES_COPY } from "@/components/shared/copy";
import {
  getInstallSnapshot,
  promptInstall,
  subscribeInstallState,
} from "@/lib/pwa/install";

function isIosBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Settings-only installation guidance; iOS dismissal intentionally stays mounted-session local. */
export function InstallCard() {
  const snapshot = useSyncExternalStore(
    subscribeInstallState,
    getInstallSnapshot,
    getInstallSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);

  if (snapshot.isInstalled || dismissed) return null;

  const ios = isIosBrowser();
  if (!ios && !snapshot.isPromptAvailable) return null;

  return (
    <section className="space-y-3 rounded-lg border border-surface-1 bg-surface-dim p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{AJUSTES_COPY.instalacion.titulo}</h2>
        <p className="text-sm text-subtext1">
          {ios
            ? AJUSTES_COPY.instalacion.iosGuia
            : AJUSTES_COPY.instalacion.descripcionChromium}
        </p>
      </div>
      {ios ? (
        <button
          type="button"
          className="rounded-md border border-surface-1 px-3 py-2 text-sm font-medium"
          onClick={() => setDismissed(true)}
        >
          {AJUSTES_COPY.instalacion.descartarIos}
        </button>
      ) : (
        <button
          type="button"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-base"
          onClick={() => void promptInstall()}
        >
          {AJUSTES_COPY.instalacion.cta}
        </button>
      )}
    </section>
  );
}
