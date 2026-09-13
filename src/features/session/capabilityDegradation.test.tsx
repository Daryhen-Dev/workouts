import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompletionSummary } from "@/components/history/CompletionSummary";
import { createFakeClock, systemClock, type Clock } from "@/lib/timer/clock";
import {
  hasBadging,
  hasMediaSession,
  hasNotifications,
  hasServiceWorker,
  hasVibration,
  hasWakeLock,
} from "@/lib/pwa/capabilities";
import { getInstallSnapshot } from "@/lib/pwa/install";
import { SESSION_STATUS, type SessionConfig } from "@/lib/timer/types";
import { HISTORY_STORAGE_KEY, useHistoryStore } from "@/stores/historyStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

import { SessionController } from "./SessionController";

const CLASICO_CORTO: SessionConfig = {
  mode: "clasico",
  values: { preparacionS: 1, trabajoS: 2, descansoS: 1, rondas: 2 },
};

const NO_MUSIC = {
  preparacion: null,
  trabajo: null,
  descanso: null,
  descansoLargo: null,
  descansoGlobal: null,
};

function withoutNavigatorCapabilities() {
  const absent = new Set([
    "serviceWorker",
    "wakeLock",
    "mediaSession",
    "vibrate",
    "setAppBadge",
    "clearAppBadge",
  ]);
  return new Proxy(navigator, {
    get(target, property) {
      return absent.has(String(property)) ? undefined : Reflect.get(target, property);
    },
    has(target, property) {
      return !absent.has(String(property)) && Reflect.has(target, property);
    },
  });
}

function withoutNotifications() {
  return new Proxy(window, {
    get(target, property) {
      return property === "Notification" ? undefined : Reflect.get(target, property);
    },
    has(target, property) {
      return property !== "Notification" && Reflect.has(target, property);
    },
  });
}

beforeEach(() => {
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  useHistoryStore.setState({ entries: [] });
  useSessionStore.setState({
    state: null,
    view: null,
    clock: systemClock,
    onComplete: null,
  });
  useSettingsStore.setState({
    assignments: { ...NO_MUSIC },
    notificationsOptIn: false,
  });
  mocks.replace.mockClear();
  mocks.push.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("all-capabilities-unavailable degradation", () => {
  it("completes a real short Clásico session with every optional capability absent", () => {
    vi.stubGlobal("navigator", withoutNavigatorCapabilities());
    vi.stubGlobal("window", withoutNotifications());
    vi.stubGlobal("Notification", undefined);
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("Audio", undefined);

    expect(hasServiceWorker()).toBe(false);
    expect(hasWakeLock()).toBe(false);
    expect(hasMediaSession()).toBe(false);
    expect(hasVibration()).toBe(false);
    expect(hasBadging()).toBe(false);
    expect(hasNotifications()).toBe(false);
    expect(getInstallSnapshot().isPromptAvailable).toBe(false);

    const clock = createFakeClock(0);
    const asClock: Clock = () => clock.now();
    expect(() => {
      act(() => useSessionStore.getState().start(CLASICO_CORTO, asClock));
      render(<SessionController />);

      act(() => {
        clock.advance(6_000);
        useSessionStore.getState().refreshView();
      });
    }).not.toThrow();

    expect(useSessionStore.getState().view?.status).toBe(SESSION_STATUS.completed);
    expect(useHistoryStore.getState().entries).toEqual([
      expect.objectContaining({
        mode: "clasico",
        rounds: 2,
        activeDurationMs: 6_000,
      }),
    ]);
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/resumen");

    render(<CompletionSummary />);
    expect(screen.getByText("Clásico")).toBeInTheDocument();
    expect(screen.getByText("2 rondas")).toBeInTheDocument();
  });
});
