import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/stores/settingsStore", () => {
  throw new Error("InstallCard must not access settings persistence");
});

import { InstallCard } from "./InstallCard";

const originalUserAgent = window.navigator.userAgent;

function setUserAgent(userAgent: string): void {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
}

describe("InstallCard", () => {
  beforeEach(() => {
    installMocks.state.snapshot = {
      isPromptAvailable: false,
      isInstalled: false,
    };
    installMocks.state.subscribers.clear();
    installMocks.getInstallSnapshot.mockClear();
    installMocks.subscribeInstallState.mockClear();
    installMocks.promptInstall.mockReset().mockResolvedValue(undefined);
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/123.0.0.0 Safari/537.36");
  });

  afterEach(() => {
    setUserAgent(originalUserAgent);
  });

  it("renders the Chromium card without prompting, then prompts once from its explicit CTA", () => {
    installMocks.state.snapshot = {
      isPromptAvailable: true,
      isInstalled: false,
    };

    render(<InstallCard />);

    expect(screen.getByRole("heading", { name: "Instalar la app" })).toBeVisible();
    expect(
      screen.getByText("Añádela a tu dispositivo para abrirla más rápido."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Instalar app" })).toBeVisible();
    expect(installMocks.promptInstall).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Instalar app" }));

    expect(installMocks.promptInstall).toHaveBeenCalledTimes(1);
    expect(installMocks.subscribeInstallState).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when the app is already installed", () => {
    installMocks.state.snapshot = {
      isPromptAvailable: true,
      isInstalled: true,
    };

    render(<InstallCard />);

    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar app" })).not.toBeInTheDocument();
    expect(installMocks.promptInstall).not.toHaveBeenCalled();
  });

  it("renders nothing for a non-iOS browser with no available prompt", () => {
    render(<InstallCard />);

    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar app" })).not.toBeInTheDocument();
  });

  it("uses the iOS manual path and dismisses only this mounted card without persistence", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1");
    installMocks.state.snapshot = {
      isPromptAvailable: true,
      isInstalled: false,
    };
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");

    render(<InstallCard />);

    expect(screen.getByRole("heading", { name: "Instalar la app" })).toBeVisible();
    expect(
      screen.getByText("Usa Compartir → Añadir a pantalla de inicio."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Instalar app" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ahora no" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));

    expect(screen.queryByRole("heading", { name: "Instalar la app" })).not.toBeInTheDocument();
    expect(installMocks.promptInstall).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });
});
