import { afterEach, describe, expect, it, vi } from "vitest";

type PromptEvent = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice?: unknown;
};

function createPromptEvent(options: {
  prompt?: ReturnType<typeof vi.fn>;
  userChoice?: unknown;
} = {}): PromptEvent {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, {
    prompt: options.prompt ?? vi.fn(() => Promise.resolve()),
    userChoice: options.userChoice,
  });
  return event as PromptEvent;
}

describe("install prompt controller", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.unstubAllGlobals();
  });

  async function loadController() {
    vi.resetModules();
    return import("./install");
  }

  it("imports without browser globals during SSR", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("navigator", undefined);

    await expect(loadController()).resolves.toBeDefined();
  });

  it("prevents and captures the newest install event, then notifies subscribers", async () => {
    const controller = await loadController();
    const notify = vi.fn();
    cleanups.push(controller.subscribeInstallState(notify));
    cleanups.push(controller.setupInstallPromptCapture());
    const first = createPromptEvent();
    const newest = createPromptEvent();

    window.dispatchEvent(first);
    window.dispatchEvent(newest);

    expect(first.defaultPrevented).toBe(true);
    expect(newest.defaultPrevented).toBe(true);
    expect(notify).toHaveBeenCalledTimes(2);
    await controller.promptInstall();
    expect(first.prompt).not.toHaveBeenCalled();
    expect(newest.prompt).toHaveBeenCalledTimes(1);
  });

  it("never prompts during setup, capture, subscription, or cleanup", async () => {
    const controller = await loadController();
    const event = createPromptEvent();
    const stop = controller.setupInstallPromptCapture();
    cleanups.push(stop);
    cleanups.push(controller.subscribeInstallState(vi.fn()));

    window.dispatchEvent(event);
    stop();

    expect(event.prompt).not.toHaveBeenCalled();
  });

  it("prompts once for an explicit call and consumes availability immediately", async () => {
    const controller = await loadController();
    const event = createPromptEvent();
    cleanups.push(controller.setupInstallPromptCapture());
    window.dispatchEvent(event);

    const firstPrompt = controller.promptInstall();
    const secondPrompt = controller.promptInstall();

    expect(controller.getInstallSnapshot().isPromptAvailable).toBe(false);
    await Promise.all([firstPrompt, secondPrompt]);
    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["accepted", () => Promise.resolve({ outcome: "accepted" })],
    ["dismissed", () => Promise.resolve({ outcome: "dismissed" })],
    ["malformed", () => ({ unexpected: true })],
    ["rejected", () => Promise.reject(new Error("choice unavailable"))],
    ["absent", () => undefined],
  ])("handles %s userChoice data without claiming installation", async (_name, choice) => {
    const controller = await loadController();
    cleanups.push(controller.setupInstallPromptCapture());
    window.dispatchEvent(createPromptEvent({ userChoice: choice() }));

    await expect(controller.promptInstall()).resolves.toBeUndefined();
    expect(controller.getInstallSnapshot()).toEqual({
      isPromptAvailable: false,
      isInstalled: false,
    });
  });

  it("marks installed and clears deferred availability on appinstalled", async () => {
    const controller = await loadController();
    cleanups.push(controller.setupInstallPromptCapture());
    window.dispatchEvent(createPromptEvent());

    window.dispatchEvent(new Event("appinstalled"));

    expect(controller.getInstallSnapshot()).toEqual({
      isPromptAvailable: false,
      isInstalled: true,
    });
  });

  it("detects standalone display mode and iOS standalone mode during setup", async () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", matchMedia);
    let controller = await loadController();
    cleanups.push(controller.setupInstallPromptCapture());

    expect(matchMedia).toHaveBeenCalledWith("(display-mode: standalone)");
    expect(controller.getInstallSnapshot().isInstalled).toBe(true);

    cleanups.splice(0).forEach((cleanup) => cleanup());
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
    controller = await loadController();
    cleanups.push(controller.setupInstallPromptCapture());

    expect(controller.getInstallSnapshot().isInstalled).toBe(true);
    delete (navigator as { standalone?: unknown }).standalone;
  });

  it("survives strict-mode setup cleanup remount and replaces stale events", async () => {
    const controller = await loadController();
    const firstStop = controller.setupInstallPromptCapture();
    firstStop();
    const secondStop = controller.setupInstallPromptCapture();
    const duplicateStop = controller.setupInstallPromptCapture();
    cleanups.push(secondStop, duplicateStop);
    const stale = createPromptEvent();
    const newest = createPromptEvent();

    window.dispatchEvent(stale);
    window.dispatchEvent(newest);
    await controller.promptInstall();

    expect(stale.prompt).not.toHaveBeenCalled();
    expect(newest.prompt).toHaveBeenCalledTimes(1);
    duplicateStop();
    secondStop();
    const afterCleanup = createPromptEvent();
    window.dispatchEvent(afterCleanup);
    expect(afterCleanup.defaultPrevented).toBe(false);
  });
});
