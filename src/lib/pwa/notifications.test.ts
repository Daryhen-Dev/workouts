import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canRequestNotificationPermission,
  deliverCompletionNotification,
  requestNotificationPermission,
} from "./notifications";

type NotificationPermission = "default" | "denied" | "granted";

function installCompletionNotification(
  permission: NotificationPermission = "granted",
) {
  const requestPermission = vi.fn().mockResolvedValue("granted");
  const Notification = vi.fn();
  Object.assign(Notification, { permission, requestPermission });
  vi.stubGlobal("Notification", Notification);
  return { Notification, requestPermission };
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

function installNotification(
  permission: "default" | "denied" | "granted",
  requestPermission = vi.fn().mockResolvedValue("granted"),
) {
  vi.stubGlobal("Notification", { permission, requestPermission });
  return requestPermission;
}

describe("notification permission adapter", () => {
  it("resolves browser globals lazily and is SSR-safe", async () => {
    vi.stubGlobal("window", undefined);

    expect(canRequestNotificationPermission()).toBe(false);
    await expect(requestNotificationPermission()).resolves.toBe("default");
  });

  it("degrades safely when the API is absent", async () => {
    vi.stubGlobal("Notification", undefined);

    expect(canRequestNotificationPermission()).toBe(false);
    await expect(requestNotificationPermission()).resolves.toBe("default");
  });

  it("prompts only while permission is default", async () => {
    const requestPermission = installNotification("default");

    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it.each(["granted", "denied"] as const)(
    "does not re-prompt when permission is already %s",
    async (permission) => {
      const requestPermission = installNotification(permission);

      await expect(requestNotificationPermission()).resolves.toBe(permission);
      expect(requestPermission).not.toHaveBeenCalled();
    },
  );

  it("swallows synchronous, rejected, and permission-read failures", async () => {
    installNotification("default", vi.fn(() => {
      throw new Error("blocked");
    }));
    await expect(requestNotificationPermission()).resolves.toBe("default");

    installNotification("default", vi.fn().mockRejectedValue(new Error("blocked")));
    await expect(requestNotificationPermission()).resolves.toBe("default");

    vi.stubGlobal("Notification", {
      get permission() {
        throw new Error("blocked");
      },
      requestPermission: vi.fn(),
    });
    await expect(requestNotificationPermission()).resolves.toBe("default");
  });

  it("constructs exactly once for granted permission while the document is hidden", () => {
    const { Notification, requestPermission } = installCompletionNotification();
    setVisibility("hidden");

    expect(() => deliverCompletionNotification()).not.toThrow();
    expect(Notification).toHaveBeenCalledExactlyOnceWith(
      "Entrenamiento completado",
    );
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("suppresses delivery while the document is visible", () => {
    const { Notification, requestPermission } = installCompletionNotification();
    setVisibility("visible");

    deliverCompletionNotification();

    expect(Notification).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it.each(["default", "denied"] as const)(
    "suppresses delivery when permission is %s",
    (permission) => {
      const { Notification, requestPermission } = installCompletionNotification(
        permission,
      );
      setVisibility("hidden");

      deliverCompletionNotification();

      expect(Notification).not.toHaveBeenCalled();
      expect(requestPermission).not.toHaveBeenCalled();
    },
  );

  it("silently ignores absent APIs, DOM access errors, and constructor errors", () => {
    vi.stubGlobal("Notification", undefined);
    setVisibility("hidden");
    expect(() => deliverCompletionNotification()).not.toThrow();

    const { Notification } = installCompletionNotification();
    vi.stubGlobal("document", undefined);
    expect(() => deliverCompletionNotification()).not.toThrow();
    expect(Notification).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
    const throwingPermission = installCompletionNotification();
    Object.defineProperty(throwingPermission.Notification, "permission", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    setVisibility("hidden");
    expect(() => deliverCompletionNotification()).not.toThrow();
    expect(throwingPermission.Notification).not.toHaveBeenCalled();

    const throwingVisibility = installCompletionNotification();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    expect(() => deliverCompletionNotification()).not.toThrow();
    expect(throwingVisibility.Notification).not.toHaveBeenCalled();

    const throwingConstructor = installCompletionNotification();
    setVisibility("hidden");
    throwingConstructor.Notification.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => deliverCompletionNotification()).not.toThrow();
    expect(throwingConstructor.Notification).toHaveBeenCalledTimes(1);
  });
});
