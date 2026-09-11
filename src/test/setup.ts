import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Navigator/capability stub helpers land in src/test/fakes.ts in the units
// that first need them (U4 FakeClock, U10 stubAudioContext, U13 capability
// deletion) per design §11.1.

afterEach(() => {
  cleanup();
});
