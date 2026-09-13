// Deferred PWA installation prompt controller (U13 D2a).
//
// All browser APIs are read only inside function calls. The module can therefore
// be imported by an RSC/SSR boundary without evaluating window, navigator, or
// matchMedia. Later UI can subscribe to this small external-store seam.

type DeferredInstallPromptEvent = Event & {
  prompt?: () => Promise<unknown> | unknown;
  userChoice?: Promise<unknown> | unknown;
};

export type InstallSnapshot = Readonly<{
  isPromptAvailable: boolean;
  isInstalled: boolean;
}>;

type InstallSubscriber = () => void;

let deferredPrompt: DeferredInstallPromptEvent | null = null;
let installed = false;
let captureCount = 0;
let snapshot: InstallSnapshot = {
  isPromptAvailable: false,
  isInstalled: false,
};
const subscribers = new Set<InstallSubscriber>();

function publishInstallState(): void {
  const nextSnapshot: InstallSnapshot = {
    isPromptAvailable: deferredPrompt !== null,
    isInstalled: installed,
  };
  if (
    nextSnapshot.isPromptAvailable !== snapshot.isPromptAvailable ||
    nextSnapshot.isInstalled !== snapshot.isInstalled
  ) {
    snapshot = nextSnapshot;
  }

  subscribers.forEach((subscriber) => {
    try {
      subscriber();
    } catch {
      // A later UI subscriber must not break global prompt capture.
    }
  });
}

function detectInstalled(): boolean {
  try {
    const standaloneDisplayMode =
      typeof matchMedia === "function" &&
      matchMedia("(display-mode: standalone)").matches;
    const iosStandalone =
      typeof navigator !== "undefined" &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    return standaloneDisplayMode || iosStandalone;
  } catch {
    return false;
  }
}

function refreshInstalledState(): void {
  if (!installed && detectInstalled()) {
    installed = true;
    publishInstallState();
  }
}

function handleBeforeInstallPrompt(event: Event): void {
  const deferredEvent = event as DeferredInstallPromptEvent;
  deferredEvent.preventDefault();
  deferredPrompt = deferredEvent;
  publishInstallState();
}

function handleAppInstalled(): void {
  deferredPrompt = null;
  installed = true;
  publishInstallState();
}

/** Returns the snapshot consumed by future install UI through useSyncExternalStore. */
export function getInstallSnapshot(): InstallSnapshot {
  return snapshot;
}

/** Subscribes a future install UI without coupling capture to any route-level UI. */
export function subscribeInstallState(subscriber: InstallSubscriber): () => void {
  subscribers.add(subscriber);
  let active = true;

  return () => {
    if (!active) return;
    active = false;
    subscribers.delete(subscriber);
  };
}

/**
 * Starts one globally shared capture listener. Each cleanup is idempotent so a
 * React Strict Mode mount-cleanup-remount cycle keeps exactly one listener.
 */
export function setupInstallPromptCapture(): () => void {
  if (typeof window === "undefined") return () => undefined;

  refreshInstalledState();

  if (captureCount === 0) {
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
  }
  captureCount += 1;

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    captureCount -= 1;

    if (captureCount === 0) {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    }
  };
}

/**
 * Must be called only from an explicit user gesture by the eventual install UI.
 * Capture/setup paths never call this function. Availability is consumed before
 * prompting so parallel clicks cannot display the browser prompt twice.
 */
export async function promptInstall(): Promise<void> {
  const event = deferredPrompt;
  if (!event) return;

  deferredPrompt = null;
  publishInstallState();

  try {
    if (typeof event.prompt !== "function") return;
    await event.prompt();
    await Promise.resolve(event.userChoice);
  } catch {
    // Prompt and choice results are advisory only; appinstalled is authoritative.
  }
}
