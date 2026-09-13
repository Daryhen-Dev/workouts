"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { AJUSTES_COPY } from "@/components/shared/copy";
import {
  canRequestNotificationPermission,
  requestNotificationPermission,
} from "@/lib/pwa/notifications";
import { useSettingsStore } from "@/stores/settingsStore";

/** Settings-owned opt-in. Permission is requested exclusively by its checkbox gesture. */
export function NotificationsCard() {
  const notificationsOptIn = useSettingsStore((state) => state.notificationsOptIn);
  const setNotificationsOptIn = useSettingsStore(
    (state) => state.setNotificationsOptIn,
  );
  const [supported, setSupported] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const nextSupported = canRequestNotificationPermission();
    setSupported(nextSupported);
    if (!nextSupported) setNotificationsOptIn(false);
  }, [setNotificationsOptIn]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    if (!event.target.checked) {
      setNotificationsOptIn(false);
      return;
    }
    if (!supported || requesting) {
      setNotificationsOptIn(false);
      return;
    }

    setRequesting(true);
    try {
      const permission = await requestNotificationPermission();
      setNotificationsOptIn(permission === "granted");
    } catch {
      setNotificationsOptIn(false);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-surface-1 bg-surface-dim p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{AJUSTES_COPY.notificaciones.titulo}</h2>
        <p className="text-sm text-subtext1">
          {AJUSTES_COPY.notificaciones.descripcion}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          id="notifications-opt-in"
          type="checkbox"
          checked={supported && notificationsOptIn}
          disabled={!supported || requesting}
          aria-describedby={!supported ? "notifications-unavailable" : undefined}
          onChange={(event) => void handleChange(event)}
        />
        <label htmlFor="notifications-opt-in">{AJUSTES_COPY.notificaciones.etiqueta}</label>
      </div>
      {!supported ? (
        <p id="notifications-unavailable" className="text-sm text-subtext1">
          {AJUSTES_COPY.notificaciones.noDisponible}
        </p>
      ) : null}
    </section>
  );
}
