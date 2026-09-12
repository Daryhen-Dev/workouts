import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

/*
 * U1 scaffold → U12: el wrapper de Serwist (PWA I) ahora está activo.
 *
 * React Compiler decision (U1, recorded per design §13):
 * `experimental.reactCompiler: true` was tried and rejected — the build
 * fails because `babel-plugin-react-compiler` is not part of the approved
 * dependency set (next 15 requires it as a peer of the flag). Per design,
 * the flag is dropped and the no-manual-memoization discipline stands.
 */

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Reconnecting must not discard an in-progress local workout by forcing a
  // document reload. The app stays usable offline and refreshes naturally on
  // the user's next navigation.
  reloadOnOnline: false,
  // Dev stays uncached (no dev-server poisoning): offline behavior is
  // validated against production builds only (smoke §8.3).
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {};

export default withSerwist(nextConfig);
