// Registro de rehydrators de los stores persistidos (§2.3).
//
// U2 define el API del gate; cada store persistido se apunta AQUÍ al aterrizar
// (history U8; routines/settings llegan en U9/U11). El registro importa los
// stores directamente (en lugar de que cada store se auto-registre) porque el
// gate se monta con el layout: así el rehydrator está registrado ANTES del
// efecto del gate en toda carga de ruta — un registro viviendo en un chunk de
// ruta llegaría tarde en navegaciones client-side posteriores.
import { useHistoryStore } from "./historyStore";

export type Rehydrator = () => Promise<unknown>;

export const storeRehydrators: Rehydrator[] = [
  // U8 — historial: "tiptap.history" (persistido v1, validado con zod).
  // async: persist.rehydrate() devuelve void | Promise<void>; el gate espera promesa.
  async () => {
    await useHistoryStore.persist.rehydrate();
  },
];
