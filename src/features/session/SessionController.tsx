"use client";

// SessionController — única entrada cliente de /sesion (§2.3). Posee el flujo de
// efectos (hook) y el flujo de descarte con confirmación; la presentación vive en
// ActiveSessionScreen. Guarda de ruta: sin sesión no hay /sesion (la recarga a
// mitad de sesión la descarta — frontera honesta aceptada, diseño §13).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_COPY } from "@/components/shared/copy";
import { ActiveSessionScreen } from "@/components/timer/ActiveSessionScreen";
import { ConfirmStopDialog } from "@/components/timer/ConfirmStopDialog";
import { useSessionStore } from "@/stores/sessionStore";
import {
  useCompletionWiring,
  useSessionController,
} from "./useSessionController";

export function SessionController() {
  const router = useRouter();
  const hasSession = useSessionStore((s) => s.state !== null);
  const stop = useSessionStore((s) => s.stop);
  const [stopOpen, setStopOpen] = useState(false);
  const { flash } = useSessionController();

  // U8: completado natural → UNA entrada de historial + /resumen (seam U7).
  useCompletionWiring((to) => router.replace(to));

  // Guarda: entrar a /sesion sin sesión devuelve al inicio (con aviso español).
  useEffect(() => {
    if (!hasSession) router.replace("/");
  }, [hasSession, router]);

  if (!hasSession) {
    return <p role="status">{SESSION_COPY.sinSesion}</p>;
  }

  return (
    <>
      <ActiveSessionScreen
        flash={flash}
        onStopRequest={() => setStopOpen(true)}
      />
      <ConfirmStopDialog
        open={stopOpen}
        onCancel={() => setStopOpen(false)}
        onConfirm={() => {
          setStopOpen(false);
          stop(); // descarta: sin resumen, sin entrada (spec workout-completion)
          router.replace("/"); // vuelta al inicio
        }}
      />
    </>
  );
}
