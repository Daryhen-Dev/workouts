import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Diseño §9.1: los tokens Gentleman deben existir textualmente en
// globals.css (skin única, oscura, sin switcher). Se lee del disco porque
// vitest no procesa CSS por defecto.
const globalsCss = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8"
);
const GENTLEMAN_TOKENS: Array<[name: string, value: string]> = [
  ["--color-base", "#1a1218"],
  ["--color-surface-dim", "#20161e"],
  ["--color-surface-0", "#241822"],
  ["--color-surface-1", "#342230"],
  ["--color-text", "#f6eff3"],
  ["--color-subtext1", "#a78e9b"],
  ["--color-subtext0", "#76616b"],
  ["--color-accent", "#f095c8"],
  ["--color-accent-glow", "#f095c84d"],
  ["--color-success", "#b4e7c7"],
  ["--color-warning", "#e0c27a"],
  ["--color-danger", "#ff718f"],
  ["--color-info", "#a9c7ee"],
  ["--color-mauve", "#d7a0b8"],
  ["--color-pink-bright", "#ffb1dd"],
  ["--color-peach", "#f2b86d"],
  ["--color-teal", "#c4daf6"],
];

const SHADCN_ALIASES: Array<[name: string, value: string]> = [
  ["--background", "#1a1218"],
  ["--foreground", "#f6eff3"],
  ["--card", "#20161e"],
  ["--card-foreground", "#f6eff3"],
  ["--popover", "#241822"],
  ["--popover-foreground", "#f6eff3"],
  ["--primary", "#f095c8"],
  ["--primary-foreground", "#1a1218"],
  ["--secondary", "#342230"],
  ["--secondary-foreground", "#f6eff3"],
  ["--accent", "#342230"],
  ["--accent-foreground", "#f6eff3"],
  ["--muted", "#241822"],
  ["--muted-foreground", "#76616b"],
  ["--destructive", "#ff718f"],
  ["--destructive-foreground", "#1a1218"],
  ["--border", "#342230"],
  ["--input", "#342230"],
  ["--ring", "#f095c8"],
  ["--radius", "12px"],
];

describe("globals.css — tokens Gentleman (§9.1)", () => {
  it("importa Tailwind v4", () => {
    expect(globalsCss).toContain('@import "tailwindcss"');
  });

  it.each(GENTLEMAN_TOKENS)("define %s: %s", (name, value) => {
    expect(globalsCss).toContain(`${name}: ${value}`);
  });

  it.each(SHADCN_ALIASES)("aliasa el token shadcn %s: %s", (name, value) => {
    expect(globalsCss).toContain(`${name}: ${value}`);
  });

  it("define las fuentes (Inter + JetBrains Mono vía variables de next/font)", () => {
    expect(globalsCss).toMatch(/--font-sans:\s*var\(--font-inter\)/);
    expect(globalsCss).toMatch(/--font-mono:\s*var\(--font-jetbrains\)/);
    expect(globalsCss).toContain('"Iosevka Term"');
  });

  it("define los radios del sistema", () => {
    expect(globalsCss).toContain("--radius-sm: 8px");
    expect(globalsCss).toContain("--radius-md: 12px");
    expect(globalsCss).toContain("--radius-lg: 16px");
  });

  it("mapea los alias semánticos a utilidades Tailwind (@theme inline)", () => {
    expect(globalsCss).toMatch(/@theme\s+inline\s*\{[^}]*--color-background:\s*var\(--background\)/);
    expect(globalsCss).toMatch(/@theme\s+inline\s*\{[^}]*--color-primary:\s*var\(--primary\)/);
  });
});
