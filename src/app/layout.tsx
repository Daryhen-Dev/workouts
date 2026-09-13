import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { InstallPromptCapture } from "@/components/shared/InstallPromptCapture";
import { StoreHydrationGate } from "@/components/shared/StoreHydrationGate";
// Side-effect import of the global stylesheet (Tailwind v4 entry point).
import "./globals.css";

// Fuentes self-hostadas en build (hashed ⇒ precacheables ⇒ offline-safe, §9.1).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tip Tap Workout",
  description: "Temporizador de intervalos para entrenos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-base font-sans text-text antialiased">
        <InstallPromptCapture />
        <AppShell>
          <StoreHydrationGate>{children}</StoreHydrationGate>
        </AppShell>
      </body>
    </html>
  );
}
