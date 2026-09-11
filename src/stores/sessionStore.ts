// ⚠ SEAM U5→U7 — CONTRATO MÍNIMO (placeholder documentado).
//
// U5 no conecta el motor (U7 lo posee). Este módulo existe para que las
// pantallas de configuración codifiquen YA el contrato real:
//
//   Iniciar → `start(config)` con la SessionConfig exacta → navegar a /sesion.
//
// La implementación provisional guarda la config pendiente en una variable de
// módulo (la navegación cliente a cliente conserva el contexto JS, así que el
// handoff funciona dentro de la sesión SPA; una recarga lo pierde — aceptable
// para el placeholder, U7 lo reemplaza por el store zustand real con el motor
// U4: `start` compilará el plan, creará SessionState y `/sesion` leerá el
// estado del store). Los tests de U5 mockean `start`; el mock ES el contrato.
//
// Alternativa descartada (documentada): serializar la config en sessionStorage
// bajo una clave tipada — se eligió el seam del store porque es el contrato
// que tasks.md U5 fija literalmente ("Iniciar" llama `sessionStore.start`).

import type { SessionConfig } from "@/lib/timer/types";

let pendingConfig: SessionConfig | null = null;

/** Registra la config que la pantalla de /sesion debe arrancar (placeholder). */
export function setPendingConfig(config: SessionConfig): void {
 pendingConfig = config;
}

/** Config pendiente de arranque, o null si nadie inició (placeholder). */
export function getPendingConfig(): SessionConfig | null {
 return pendingConfig;
}

/** Limpia la config pendiente (p. ej. al descartar la sesión). */
export function clearPendingConfig(): void {
 pendingConfig = null;
}

/**
 * Contrato U7: arranca una sesión con la configuración validada.
 * Implementación provisional: retiene la config como pendiente.
 */
export function start(config: SessionConfig): void {
 setPendingConfig(config);
}
