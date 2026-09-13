import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "@/stores/settingsStore";

const installMocks = vi.hoisted(() => {
  const state = {
    snapshot: {
      isPromptAvailable: false,
      isInstalled: false,
    },
    subscribers: new Set<() => void>(),
  };

  return {
    state,
    getInstallSnapshot: vi.fn(() => state.snapshot),
    subscribeInstallState: vi.fn((subscriber: () => void) => {
      state.subscribers.add(subscriber);
      return () => state.subscribers.delete(subscriber);
    }),
    promptInstall: vi.fn(),
  };
});

vi.mock("@/lib/pwa/install", () => ({
  getInstallSnapshot: installMocks.getInstallSnapshot,
  subscribeInstallState: installMocks.subscribeInstallState,
  promptInstall: installMocks.promptInstall,
}));

vi.mock("@/components/settings/InstallCard", () => {
  throw new Error("HomeInstallNudge must not couple to the Settings install card");
});

import { HomeInstallNudge } from "./HomeInstallNudge";

const originalUserAgent = window.navigator.userAgent;

function setUserAgent(userAgent: string): void {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
}

function setInstallSnapshot(isInstalled: boolean): void {
  installMocks.state.snapshot = {
    isPromptAvailable: false,
    isInstalled,
  };
  installMocks.state.subscribers.forEach((subscriber) => subscriber());
}

function setIosUserAgent(): void {
  setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  );
}

describe("HomeInstallNudge", () => {
  beforeEach(() => {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    useSettingsStore.setState({ installNudgeDismissedAt: null });
    installMocks.state.snapshot = {
      isPromptAvailable: false,
      isInstalled: false,
    };
    installMocks.state.subscribers.clear();
    installMocks.getInstallSnapshot.mockClear();
    installMocks.subscribeInstallState.mockClear();
    installMocks.promptInstall.mockClear();
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/123.0.0.0 Safari/537.36");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setUserAgent(originalUserAgent);
  });

  it("shows the exact iOS manual-install guidance for a fresh, uninstalled Home visitor", () => {
    setIosUserAgent();

    render(<HomeInstallNudge />);

    expect(screen.getByRole("heading", { name: "Instalar la app" })).toBeVisible();
    expect(
      screen.getByText("Usa Compartir → Añadir a pantalla de inicio."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Ahora no" })).toBeVisible();
    expect(installMocks.promptInstall).not.toHaveBeenCalled();
  });

  it("renders nothing outside iOS", () => {
    render(<HomeInstallNudge />);

    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ahora no" })).not.toBeInTheDocument();
    expect(installMocks.promptInstall).not.toHaveBeenCalled();
  });

  it("renders nothing when iOS is already installed", () => {
    setIosUserAgent();
    setInstallSnapshot(true);

    render(<HomeInstallNudge />);

    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ahora no" })).not.toBeInTheDocument();
  });

  it("hides after an installed snapshot update", () => {
    setIosUserAgent();
    const { rerender } = render(<HomeInstallNudge />);

    expect(screen.getByRole("heading", { name: "Instalar la app" })).toBeVisible();

    setInstallSnapshot(true);
    rerender(<HomeInstallNudge />);

    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
  });

  it("persists one dismissal timestamp, hides, and never prompts", () => {
    setIosUserAgent();
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const dismissInstallNudge = vi.spyOn(
      useSettingsStore.getState(),
      "dismissInstallNudge",
    );

    render(<HomeInstallNudge />);
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));

    expect(dismissInstallNudge).toHaveBeenCalledTimes(1);
    expect(dismissInstallNudge).toHaveBeenCalledWith(1_700_000_000_000);
    expect(
      JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null").state
        .installNudgeDismissedAt,
    ).toBe(1_700_000_000_000);
    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
    expect(installMocks.promptInstall).not.toHaveBeenCalled();
  });

  it("does not render when the real settings store rehydrates a prior dismissal", async () => {
    setIosUserAgent();
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: {
          assignments: useSettingsStore.getState().assignments,
          notificationsOptIn: false,
          installNudgeDismissedAt: 1_700_000_000_000,
        },
        version: 1,
      }),
    );
    await useSettingsStore.persist.rehydrate();

    render(<HomeInstallNudge />);

    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ahora no" })).not.toBeInTheDocument();
    expect(installMocks.promptInstall).not.toHaveBeenCalled();
  });
});
