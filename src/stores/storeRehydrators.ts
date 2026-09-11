// Registro de rehydrators de los stores persistidos (§2.3).
//
// U2 define el API del gate; los stores persistidos (routines/history/settings)
// aterrizan en U8/U9/U11 y se apuntan aquí para que el layout no necesite
// pasar funciones a través del límite servidor→cliente (no serializables).
export type Rehydrator = () => Promise<unknown>;

export const storeRehydrators: Rehydrator[] = [];
