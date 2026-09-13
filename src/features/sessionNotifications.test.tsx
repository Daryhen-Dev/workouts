import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeClock, systemClock, type Clock, type FakeClock } from "@/lib/timer/clock";
import type { SessionConfig } from "@/lib/timer/types";
import { useHistoryStore } from "@/stores/historyStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

import { SessionController } from "./session/SessionController";

const CLASICO_85: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 10, trabajoS: 30, descansoS: 15, rondas: 2 },
};

const REAL_REFRESH_VIEW = useSessionStore.getState().refreshView;

function asClock(fake: FakeClock): Clock {
  return () => fake.now();
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function installNotification(
  permission: "default" | "denied" | "granted" = "granted",
) {
  const requestPermission = vi.fn().mockResolvedValue("granted");
  const Notification = vi.fn();
  Object.assign(Notification, { permission, requestPermission });
  vi.stubGlobal("Notification", Notification);
  return { Notification, requestPermission };
}

function resetStores() {
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
    refreshView: REAL_REFRESH_VIEW,
  });
  useHistoryStore.setState({ entries: [] });
  useSettingsStore.setState({ notificationsOptIn: false });
}

function mountRunning(clock: FakeClock) {
  act(() => useSessionStore.getState().start(CLASICO_85, asClock(clock)));
  render(<SessionController />);
}

function completeNaturally(clock: FakeClock) {
  act(() => {
    clock.advance(100_000);
    useSessionStore.getState().refreshView();
  });
}

describe("SessionController completion notifications", () => {
  beforeEach(() => {
    resetStores();
    mocks.replace.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  it("delivers once after hidden opted-in natural completion and preserves history/navigation across later refreshes", () => {
    const clock = createFakeClock(0);
    const { Notification, requestPermission } = installNotification();
    setVisibility("hidden");
    act(() => useSettingsStore.setState({ notificationsOptIn: true }));
    mountRunning(clock);

    completeNaturally(clock);
    act(() => {
      clock.advance(20_000);
      useSessionStore.getState().refreshView();
      setVisibility("visible");
      setVisibility("hidden");
    });

    expect(Notification).toHaveBeenCalledTimes(1);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(useHistoryStore.getState().entries).toHaveLength(1);
    expect(
      mocks.replace.mock.calls.filter(([to]) => to === "/resumen"),
    ).toHaveLength(1);
  });

  it("suppresses foreground delivery while preserving history and navigation", () => {
    const clock = createFakeClock(0);
    const { Notification, requestPermission } = installNotification();
    act(() => useSettingsStore.setState({ notificationsOptIn: true }));
    mountRunning(clock);

    completeNaturally(clock);

    expect(Notification).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(useHistoryStore.getState().entries).toHaveLength(1);
    expect(mocks.replace).toHaveBeenCalledWith("/resumen");
  });

  it.each([
    {
      name: "opt-out",
      optIn: false,
      permission: "granted" as const,
      notification: "available" as const,
      constructorThrows: false,
    },
    {
      name: "denied permission",
      optIn: true,
      permission: "denied" as const,
      notification: "available" as const,
      constructorThrows: false,
    },
    {
      name: "absent API",
      optIn: true,
      permission: "granted" as const,
      notification: "absent" as const,
      constructorThrows: false,
    },
    {
      name: "throwing constructor",
      optIn: true,
      permission: "granted" as const,
      notification: "available" as const,
      constructorThrows: true,
    },
  ])(
    "keeps completion authoritative when notifications have $name",
    ({ optIn, permission, notification, constructorThrows }) => {
      const clock = createFakeClock(0);
      setVisibility("hidden");
      const installed =
        notification === "available" ? installNotification(permission) : null;
      if (notification === "absent") vi.stubGlobal("Notification", undefined);
      if (constructorThrows) {
        installed!.Notification.mockImplementation(() => {
          throw new Error("blocked");
        });
      }
      act(() => useSettingsStore.setState({ notificationsOptIn: optIn }));
      mountRunning(clock);

      expect(() => completeNaturally(clock)).not.toThrow();

      expect(useHistoryStore.getState().entries).toHaveLength(1);
      expect(mocks.replace).toHaveBeenCalledWith("/resumen");
      if (installed !== null) {
        expect(installed.requestPermission).not.toHaveBeenCalled();
      }
    },
  );
});
