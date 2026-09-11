import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * U1 scaffold: plain config. withSerwist lands in U12 (PWA I).
   *
   * React Compiler decision (U1, recorded per design §13):
   * `experimental.reactCompiler: true` was tried and rejected — the build
   * fails because `babel-plugin-react-compiler` is not part of the approved
   * dependency set (next 15 requires it as a peer of the flag). Per design,
   * the flag is dropped and the no-manual-memoization discipline stands.
   */
};

export default nextConfig;
