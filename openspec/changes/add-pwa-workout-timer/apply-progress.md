# Apply Progress — add-pwa-workout-timer

## U1 — Scaffold (RED-exempt) — PR 1 — branch `u1-scaffold`

**Status: COMPLETE.** All 9 U1 task checkboxes marked `- [x]` in `tasks.md`.

### Completed tasks (persisted checkbox updates)

All 9 U1 tasks checked off in `openspec/changes/add-pwa-workout-timer/tasks.md`
(scaffold/build/dev verified; shadcn init attempted; deps verified installed;
vitest + playwright configs; React Compiler decision; runner smoke test;
`openspec/config.yaml` evidence flip).

### Files changed (authored in this unit)

| File | Purpose |
| ------ | --------- |
| `tsconfig.json` | TS strict, Next 15 plugin, `@/*` → `./src/*`, moduleResolution bundler |
| `next.config.ts` | Plain scaffold config; React Compiler decision recorded in-file |
| `postcss.config.mjs` | `@tailwindcss/postcss` plugin |
| `eslint.config.mjs` | Flat config via FlatCompat (`next/core-web-vitals`, `next/typescript`) + build-artifact ignores |
| `src/app/layout.tsx` | Minimal Spanish root layout, `<html lang="es">` (U2 replaces) |
| `src/app/page.tsx` | Minimal Spanish placeholder (U2 replaces) |
| `src/app/globals.css` | `@import "tailwindcss";` minimal entry (U2 owns @theme tokens) |
| `src/types/css.d.ts` | Ambient `*.css` module shim for editor/LSP consistency |
| `vitest.config.ts` | jsdom, `@vitejs/plugin-react`, `@` alias, setup file, `globals: true` |
| `src/test/setup.ts` | jest-dom (`@testing-library/jest-dom/vitest`) + RTL `cleanup()` |
| `src/app/page.test.tsx` | Runner smoke test (RTL render + jest-dom assertion) |
| `playwright.config.ts` | Chromium-only, `testDir: "tests"`, webServer `pnpm build && pnpm start` (port 3000, reuseExistingServer: false) |
| `tests/.gitkeep` | Placeholder for U12's `offline.spec.ts` |
| `package.json` | Scripts: `dev/build/start/lint`, `test` → `vitest run`, `test:offline` → `playwright test`; dep pins below |
| `.gitignore` | Standard Next template entries (`.next/`, `out/`, `*.tsbuildinfo`, `next-env.d.ts`) + `public/sw.js`, `test-results/`, `playwright-report/`, `playwright/.cache/` |
| `openspec/config.yaml` | `testing.installed: true`, `status: installed`, actual evidence in `install_note`; `strict_tdd_status` corrected post-install; pre-existing YAML defect on the `size:exception` gate line repaired (full-string quoting — it was invalid YAML since baseline) |

Dependency corrections made by this unit (orchestrator installs were already on main):

- `eslint-config-next` 16.3.4 → **15.5.25** (major mismatch with next@15; flagged by orchestrator).
- `eslint` 10.10.0 → **9.39.5** + added `@eslint/eslintrc` 3.3.7 (the coherent eslint-config-next@15 / create-next-app@15 scaffold set; eslint-config-next@15 peers eslint ^7||^8||^9).
- `typescript` 7.0.2 → **5.9.3** (tooling friction confirmed: TS 7 Go preview broke `next build` at `next.config.ts` load with `Cannot read properties of undefined (reading 'fileExists')`; pinned per orchestrator instruction).

### TDD Cycle Evidence (U1 carve-out)

Strict TDD is active, but U1 is **RED-exempt** per `openspec/config.yaml`
phase_rules (scaffold step — no runner existed when the unit started). The
carve-out obligation — end with a committed runner smoke test proving
`pnpm test` executes `vitest run` — is fulfilled:

| Step | Evidence |
| ------ | ---------- |
| Runner smoke (mandated) | `pnpm test` → `vitest run` → `Test Files 1 passed (1), Tests 1 passed (1), Duration 1.02s` (`src/app/page.test.tsx` renders the app title via RTL + jest-dom, proving the jsdom + RTL + jest-dom chain end-to-end) |
| `pnpm build` | Green: compiled, type-checked, 2 static routes (`/`, `/_not-found`) |
| `pnpm dev` | Green: HTTP 200, "Tip Tap Workout" rendered on localhost:3000 |
| `pnpm lint` | Clean (flat config loads; build artifacts ignored) |

### React Compiler decision (design §13 — decision stays in U1)

Tried `experimental.reactCompiler: true` in `next.config.ts` → build failed:
`Failed to load the 'babel-plugin-react-compiler'. It is required to use the
React Compiler. Please install it.` The plugin is not part of the approved
dependency set, so per the task/design the **flag is dropped** and the
no-manual-memoization discipline stands. Outcome recorded in a comment in
`next.config.ts` and here.

### shadcn init outcome

Attempted `pnpm dlx shadcn@latest init -y -b neutral` → CLI error: the latest
shadcn alpha rewrote `-b` to a component-library enum (`radix | base | aria`),
rejecting `neutral` as a base color. Per the delivery contract this is the
skip condition: **init skipped**; U2 owns tokens/components init with a pinned
shadcn CLI version (the CLI itself suggested `shadcn@4.20.0`).

### Deviations from design/tasks

- **create-next-app equivalent**: the orchestrator pre-committed package.json +
  installs (ac75dc5), so the scaffold was hand-authored to the same shape
  (TS strict, Tailwind v4 via PostCSS plugin, App Router, `src/`) instead of
  running the generator into an already-populated tree. Acceptance essence
  preserved: `pnpm build` + `pnpm dev` verified green.
- **Navigator-stubbing helper starting point** (task text) lives with the
  design §11.1 placement: `src/test/fakes.ts` lands in the unit that first
  needs it (U4 FakeClock). `setup.ts` contains jest-dom + cleanup per the
  parent corrective instruction; a comment points to the fakes plan.
- `src/types/css.d.ts` shim added: the harness LSP could not resolve the CSS
  side-effect import even after `next-env.d.ts` was generated (project
  `tsc --noEmit` exits 0; `next build` type-check passes — discrepancy noted,
  shim is harmless and keeps editors consistent).
- Pre-existing invalid YAML in `openspec/config.yaml` (`size:exception` gate
  line) repaired by quoting the full string — required for the config file to
  parse.

### Remaining tasks

All U2–U13 tasks remain unchecked — next unit: **U2 — Tokens + shell — PR 2**
(first `- [ ]` lines are the two U2 RED tasks:
`src/components/layout/AppShell.test.tsx` and
`src/components/shared/StoreHydrationGate.test.tsx`).

### Workload / PR boundary

- PR 1 = U1 only, branch `u1-scaffold` → `main`, squash-merge authorized.
- Authored-line count ≈ 190 (configs + tests + docs edits) — within the
  400-line budget; dependency manifest/lockfile churn from the three pins is
  orchestrator-follow-up, counted against the manifest not authored code.

### Structured status consumed

- `applyState: ready`, `actionContext.mode: repo-local`, edit roots
  `[workspace]` — no warnings; all edits within the workspace root.
- Artifact store: openspec — tasks/spec/design read from
  `openspec/changes/add-pwa-workout-timer/` before work.
