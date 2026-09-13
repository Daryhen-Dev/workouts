"use client";

import { useEffect } from "react";
import { setupInstallPromptCapture } from "@/lib/pwa/install";

/** Mounts global PWA install-event capture independently of route hydration. */
export function InstallPromptCapture() {
  useEffect(() => setupInstallPromptCapture(), []);

  return null;
}
