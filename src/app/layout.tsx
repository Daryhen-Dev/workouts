import type { Metadata } from "next";
// Side-effect import of the global stylesheet (Tailwind v4 entry point).
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
