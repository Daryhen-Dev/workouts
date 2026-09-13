import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canRequestNotificationPermission,
  requestNotificationPermission,
} from "./notifications";

afterEach(() => {
  vi.unstubAllGlobals();
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
});
