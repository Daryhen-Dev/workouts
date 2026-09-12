import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("declares the Tip Tap Workout identity and standalone launch contract", () => {
    expect(manifest()).toMatchObject({
      name: "Tip Tap Workout",
      short_name: "Tip Tap",
      start_url: "/",
      display: "standalone",
      background_color: "#1a1218",
      theme_color: "#f095c8",
      lang: "es",
    });
  });

  it("declares standard and maskable launcher icons", () => {
    expect(manifest().icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          purpose: "maskable",
          type: "image/png",
        }),
      ]),
    );
  });

  it("offers the three timer modes as progressive launcher shortcuts", () => {
    expect(manifest().shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Clásico", url: "/clasico" }),
        expect.objectContaining({ name: "Tabata", url: "/tabata" }),
        expect.objectContaining({ name: "Personalizado", url: "/personalizado" }),
      ]),
    );
  });
});
