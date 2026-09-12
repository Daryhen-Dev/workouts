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

---

## U2 — Tokens + shell (PR 2)

**Branch**: `u2-tokens-shell` (from `main` @ 9f87604). Strict TDD active (`pnpm test` = vitest run).

### Completed tasks (tasks.md checkboxes updated 6/6 U2 → `- [x]`)

RED (2), GREEN (2), TRIANGULATE (1), REFACTOR (1) — all U2 lines checked.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED-1 | `src/components/layout/AppShell.test.tsx` | `Failed to resolve import "./AppShell"` (module absent) | 11/11 pass (brand, 4 tabs+hrefs, active highlight, `color-scheme: dark`, no switcher, `/sesion` hides nav, `showNavFor` ×5, `isActivePath` ×5) |
| RED-2 | `src/components/shared/StoreHydrationGate.test.tsx` | `Failed to resolve import "./StoreHydrationGate"` | 4/4 pass (skeleton→children, waits ALL rehydrators, no-rehydrator instant, fail-open on rejection) |
| Token gate | `src/app/globals.test.ts` | 41 failed (`expected '' to contain '--color-base: #1a1218'`) | 41/41 pass (17 Gentleman tokens, 20 shadcn aliases, fonts chain w/ Iosevka Term, 3 radii, `@theme inline` mapping, `color-scheme: dark`) |
| TRIANGULATE | `src/components/shared/copy.test.ts` | 3 failed (`MODE_LABEL` undefined) | 5/5 pass (verbatim Clásico/Tabata/Personalizado, tildes, background-promise allowlist scan over all exported copy, BRAND/NAV_LABELS centralized) |
| REFACTOR | boundary audit (no new tests by design) | — | `grep -rl "use client" src/` → exactly `NavBar.tsx` + `StoreHydrationGate.tsx`; all page/layout/AppShell shells are server components |

### Files changed

- `src/app/globals.css` — full Gentleman `@theme` (§9.1 hexes verbatim), `:root { color-scheme: dark }` + shadcn semantic aliases, `@theme inline` utility mapping (note: `--color-accent` stays the pink; shadcn's `--accent: #342230` documented as plain var).
- `src/app/layout.tsx` — `<html lang="es">`, Inter + JetBrains_Mono via `next/font/google` (`--font-inter`/`--font-jetbrains`), AppShell + StoreHydrationGate composition.
- `src/components/layout/AppShell.tsx` (server shell), `NavBar.tsx` (client: HeaderBar desktop collapse + mobile bottom tab bar, lucide icons, accent active highlight, `/sesion` opt-out), `nav.ts` (pure `NAV_ITEMS`/`showNavFor`/`isActivePath`).
- `src/components/shared/StoreHydrationGate.tsx` (client gate + `useHydrated`, fail-open), `copy.ts` (BRAND, NAV_LABELS, MODE_LABEL verbatim), `storeRehydrators.ts` registry (stores land U8/U9/U11 — functions can't cross the server→client prop boundary, so the registry is client-side by design).
- `src/components/ui/skeleton.tsx` + `src/lib/utils.ts` (cn) — shadcn skeleton, hand-authored per the pre-authorized fallback (U1 recorded the alpha CLI init failure); tinted `bg-surface-1`.
- `components.json` (hand-written, CLI-valid for later `shadcn add`), placeholders `src/app/{rutinas,historial,ajustes}/page.tsx` (Spanish; replaced by U8/U9/U11), `src/types/css.d.ts` unchanged (reverted — `?raw` unused).
- Deps: `clsx` + `tailwind-merge` (shadcn prerequisites; every generated component needs them).
- Tests: `AppShell.test.tsx`, `StoreHydrationGate.test.tsx`, `globals.test.ts`, `copy.test.ts`.

### Test commands run

- `pnpm test` → **Test Files 5 passed (5), Tests 60 passed (60)**.
- `pnpm lint` → clean.
- `pnpm build` → green: 5 static routes (`/`, `/_not-found`, `/ajustes`, `/historial`, `/rutinas`); next/font self-hosted fonts fetched at build (offline-safe per §9.1).

### Deviations from design

- **shadcn CLI init skipped** (pre-authorized fallback): U1 already recorded the alpha CLI breaking `init`; U2 hand-wrote `components.json` + the one consumed component (`skeleton`) per "generated code lands with its consumer" (U1 tasks note). Button/card/separator etc. land with their consumers in U5+.
- Token tests read `globals.css` from disk via `node:fs` instead of `?raw`: vitest's default CSS stubbing returns `''` for `?raw` imports (verified in RED run), and jsdom rewrites `import.meta.url` to a non-file scheme. Disk read is deterministic and asserts the shipped file verbatim.
- `usePathname()` before early-returns in NavBar (hooks rule); no `useChromeVisible` wrapper.

### Remaining tasks

U3–U13 all unchecked (62 tasks). Next unit: **U3 — Timer core I: types + plan compiler — PR 3** (first unchecked: `- [ ] RED: src/lib/timer/plan.test.ts`).

### Workload / PR boundary

- PR 2 = U2 only, branch `u2-tokens-shell` → `main` (stacked-to-main chain, user-confirmed).
- Authored lines ≈ 545 (incl. tests + artifacts); raw diff also carries `package.json`/lockfile churn from clsx + tailwind-merge. Within the 800-line attempt budget; scaffold-diff acceptance applies to `components.json`/skeleton.

### Structured status consumed

- `applyState: ready` (9/71 complete), `actionContext.mode: repo-local`, edit roots `[workspace]`, no warnings. Attempt token authority: u2-1789115404-27053 (never written to any repo file).

---

## U3 — Timer core I: types + plan compiler (PR 3)

**Branch**: `u3-timer-plan` (from `main` @ 8124873). Strict TDD active (`pnpm test` = vitest run). Attempt authority: u3-1789125840-3888 (never written to any repo file).

### Completed tasks (tasks.md checkboxes updated 5/5 U3 → `- [x]`)

RED (1), GREEN (1), TRIANGULATE (2), REFACTOR (1) — all U3 lines checked.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED | `src/lib/timer/plan.test.ts` | `Failed to resolve import "./plan"` — Test Files 1 failed (1) | 3/3 pass (Clásico 2 rondas exact 4-phase array 85 s; contiguous indices; 1 ronda → no descanso) |
| GREEN | `types.ts` + `plan.ts` (Clásico) | (same run) | same run |
| TRIANGULATE-1 | `plan.test.ts` (+7 tests) | 7 failed with `compilePlan: modo no soportado aún: tabata/personalizado` (genuine branch-missing RED; Clásico 3 stayed green) | 10/10 pass (Tabata 170 s exact; largo replaces/never stacks; 1 tabata sin largo; Personalizado mixed 115 s; no global rest after final block; no stacking at boundary; block independence; multi-tabata block with own largo — 225 s) |
| TRIANGULATE-2 | `configSchemas.test.ts` | `Failed to resolve import "./configSchemas"` — Test Files 1 failed | 21/21 pass (0/negative/non-numeric/non-integer × Clásico+Tabata; Spanish messages; bounds 3600 s / 50; missing field; blocks min 1; descanso global same rules; nested block issue path; discriminated union ×3 modes + unknown mode) |
| REFACTOR | `src/lib/timer/purity.test.ts` (approval-style guard, written first and passing) + helper extraction | — | 37/37 across the three U3 files; full suite 97/97 |

Safety net: full `pnpm test` baseline before any edit → 60/60 passing (5 files). No pre-existing failures.

Final verification on the branch: `pnpm test` → **Test Files 8 passed (8), Tests 97 passed (97)** · `pnpm lint` clean · `pnpm exec tsc --noEmit` exit 0.

### Files changed

- `src/lib/timer/types.ts` — design §3.1 verbatim: as-const `PHASE_KIND`/`MODE`/`SESSION_STATUS`, flat interfaces (`ClasicoValues`, `TabataValues`, `BlockDef`, config union, `ScheduledPhase`, `PhasePlan`), plus the trivial engine-side interfaces (`SessionState`, `SessionView`, `Clock`) — no logic, U4 owns `engine.ts`/`clock.ts` behaviors.
- `src/lib/timer/plan.ts` — pure `compilePlan(config): PhasePlan` per §3.2: seed builders per mode (`clasicoSeeds`, `tabataSeeds`, `personalizadoSeeds`) + `withOffsets` (contiguous indices, cumulative ACTIVE-time offsets) + shared `interleaveWorkRest` alternation primitive (rest only between consecutive work units, never trailing).
- `src/lib/validation/configSchemas.ts` — zod 4 schemas with Spanish messages: `clasicoValuesSchema` (4 fields), `tabataValuesSchema` (6 spec fields; inherited `rondas` optional-vestigial), `blockSchema` (discriminated on `tipo`), `personalizadoValuesSchema` (`descansoGlobalS` + `blocks` min 1), config wrappers + `sessionConfigSchema` (discriminated on `mode`), inferred form types for U5/U6. **Documented bounds**: durations 1..3600 s (`MAX_PHASE_SECONDS`), counts 1..50 (`MAX_COUNT`).
- Tests: `plan.test.ts` (10), `configSchemas.test.ts` (21), `purity.test.ts` (6).

### Label scheme (design §3.2 "labels carry context")

| Context | Labels |
| --- | --- |
| Clásico mode | "Preparación" · "Trabajo" · "Descanso" |
| Tabata mode | "Preparación" · "Tabata N · Trabajo" · "Descanso" · "Descanso largo" |
| Personalizado block N | "Bloque N · Preparación" · "Bloque N · Trabajo" · "Bloque N · Descanso" · "Bloque N · Tabata M · Trabajo" · "Bloque N · Descanso largo" · "Descanso global" (between blocks, unprefixed) |

All seven design example strings are produced and asserted exactly ("Tabata 2 · Trabajo" in Tabata mode, "Bloque 2 · Trabajo" in Personalizado).

### Deviations / decisions

- **`TabataValues.rondas` is vestigial** (design §3.1 mandates `extends ClasicoValues`; the Tabata spec defines six values): plan compilation uses `rondasPorTabata` exclusively; `tabataValuesSchema` validates the six spec fields and accepts `rondas` as optional passthrough. U5 note: when constructing a `TabataConfig` typed as `TabataValues`, supply `rondas: rondasPorTabata` or a documented cast.
- **Engine-side interfaces landed in U3** (`SessionState`/`SessionView`/`Clock` in `types.ts`): trivial no-logic declarations, part of §3.1; U4 remains the owner of `engine.ts`/`clock.ts` behavior.
- **Purity guard is a source-scan test** (`purity.test.ts`, disk-read like U2's `globals.test.ts`): asserts no React/framework imports and no `window`/`document`/`navigator` tokens in `types.ts`, `plan.ts`, `configSchemas.ts` — enforces the framework-free contract structurally.
- Fixture typing: `as const` made `blocks` readonly (incompatible with `BlockDef[]`); fixtures are explicitly typed as `TabataConfig`/`PersonalizadoConfig` instead.

### Remaining tasks

U4–U13 all unchecked (57 tasks). Next unit: **U4 — Timer core II: engine + clock (HARD GATE core) — PR 4** (first unchecked: `- [ ] RED: src/lib/timer/engine.test.ts`).

### Workload / PR boundary

- PR 3 = U3 only, branch `u3-timer-plan` → `main` (stacked-to-main chain, user-confirmed; no push/PR by this executor — orchestrator owns it).
- Authored lines = 945 (implementation 406: types 118 + plan 174 + configSchemas 114; tests 539: plan.test 290 + configSchemas.test 202 + purity 47). Above the ~300 estimate and the 400-line authored budget; auto-chain delivery path is already user-confirmed and the per-unit forecast for U3 was "Low risk". Tests dominate the diff (63%) and are spec-scenario assertions mandated by strict TDD; no honest way to shrink further without dropping spec coverage. Reported for the orchestrator's size check — `size:exception` available if the reviewer wants the unit split, though slicing the plan compiler from its schema tests would separate colocated verification.

### Structured status consumed

- `applyState: ready` (15/71 complete), `actionContext.mode: repo-local`, edit roots `[workspace]`, no warnings. Attempt token authority: u3-1789125840-3888 (never written to any repo file).

---

## U4 — Timer core II: engine + clock (HARD GATE core) — PR 4

**Branch**: `u4-timer-engine` (from `main` @ 406a2f1). Strict TDD active (`pnpm test` = vitest run). Attempt authority: u4-1789131053-21812 (never written to any repo file).

### Completed tasks (tasks.md checkboxes updated 5/5 U4 → `- [x]`)

RED (1), GREEN (1), TRIANGULATE (2), REFACTOR (1) — all U4 lines checked.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED | `src/lib/timer/engine.test.ts` (ciclo básico: 4 tests) | `Error: Failed to resolve import "./clock"` → Test Files 1 failed | 4/4 pass (startSession compila/ancha/retiene; vista inicial preparación; pausa congela; reanudar completa 20 s después exacto) |
| GREEN | `clock.ts` + `engine.ts` | (mismo run) | (mismo run) |
| TRIANGULATE-1 (HARD GATE) | +6 tests (cinco scenarios + pausa tardía) | Pasaron al primer run tras GREEN — uniformidad estructural (una sola fórmula; sin ramas por escenario). **Chequeo de mutación** como evidencia de dientes: romper `>= totalActiveMs` → `>` y `ceil` → `floor` ⇒ **5 tests fallan** (frontera de completado, elapsed exacto, idempotencia, redondeo ×2); revertido → 19/19 | 19/19 pass |
| TRIANGULATE-2 | +9 tests (deriva 85 s / displaySeconds / guardas) | (incluido arriba en la mutación) | 19/19 pass |
| REFACTOR | extracción `findPhaseAt` + pureza ampliada | — | suite completa **120/120** (9 archivos); `pnpm lint` limpio; `pnpm exec tsc --noEmit` exit 0 |

Safety net: `pnpm test` baseline en `main` antes de editar → **97/97** (8 archivos). Sin fallos preexistentes.

### Files changed

- `src/lib/timer/clock.ts` — `Clock` re-exportado (fuente única en `types.ts` §3.1), `systemClock: Clock = () => Date.now()` (reloj de pared que avanza durante el sleep del dispositivo — decisión §3.3; `Date.now` es ECMAScript, no API de navegador), `createFakeClock(startMs?)` con `now()/advance(ms)/set(ms)`.
- `src/lib/timer/engine.ts` — `startSession` (compila el plan internamente vía `compilePlan`, ancla `runningSince`, deriva `totalActiveMs`, retiene `config`), `pauseSession` (pliega `now − runningSince` en `accumulatedActiveMs`), `resumeSession` (re-ancla), `computeView` (aritmética del ancla §3.3 + `findPhaseAt` extraída en REFACTOR), `displaySeconds = ceil(remainingMs/1000)` (§3.4).
- `src/lib/timer/engine.test.ts` — 19 tests: las siete scenarios de Wall-Clock Truth + Session Controls aritmética, literales con FakeClock.
- `src/lib/timer/purity.test.ts` — PURE_MODULES + `engine.ts` + `clock.ts` (guardián de "sin React / sin APIs de navegador" sobre todo el núcleo).

### Contratos documentados en engine.ts (decisiones fijadas)

1. `startSession` compila el plan **internamente** (el estado nace coherente: plan + total + config de la misma fuente).
2. `pauseSession` sobre paused/completed y `resumeSession` sobre running/completed → **no-op con la MISMA referencia** (identidad estructural; nunca lanza — observadores del controlador a salvo de pulsaciones duplicadas).
3. `computeView` con `elapsed ≥ totalActiveMs` incluso con status "paused" (pausa tardía) → **vista completada**: la verdad de reloj de pared gana; una sesión terminada no se congela (testeado).
4. La vista completada reporta `elapsedActiveMs = totalActiveMs` **exactamente** (los "totales configurados" del spec "Session completes while suspended"; el sobrepaso de reloj es latencia de detección, no actividad — testeado exacto).

### Mapeo spec → tests (timer-correctness)

| Scenario | Test |
| --- | --- |
| Pause freezes the countdown | "pausar congela fase y restante…" (vista idéntica tras +35 s de reloj) |
| Resume continues the same phase | "reanudar continúa… exactamente 20 s después (reloj de pared)" (44_999 ms → 1 ms restante; 45 s → descanso) |
| Return from background mid-phase | "background 5 s… → trabajo con exactamente 15 s restantes" (exacto; ±1 s es tolerancia de pantalla) |
| Return from tab switch across a phase boundary | "cambio de pestaña 50 s… → trabajo FINAL con exactamente 15 s" (index 3, nextPhase null) |
| Sleep/resume across multiple boundaries | "sleep 120 s… → posición exacta" (Tabata 180 s, cruza 6 fronteras: elapsed 155 s → fase 7 "Tabata 2 · Trabajo", 25 s) |
| Session completes while suspended | "suspensión más allá del fin… idempotente" (completed, phase null, elapsed = 85_000 = totales configurados; misma vista en 400 s y 604_800 s) |
| Paused sessions do not consume time while suspended | "pausada 2 min suspendida →… exactamente 20 s" (+edge estructural: pausa en el anclaje exacto acumula 0) |
| Full-session drift is imperceptible | "deriva imperceptible" (transiciones observadas EXACTAMENTE en [10_000, 40_000, 55_000, 85_000]; elapsed al completar == totalActiveMs) |
| — (§3.4) | displaySeconds: valor completo a la entrada (30), 0 exactamente en la frontera; integración a la sesión de 85 s |

(Stop y "No cues are owed during suspension"/music/copy son de U7/U11/U13 según la matriz de cobertura.)

### Deviations / decisions

- `createFakeClock` vive en `clock.ts` de producción (mandato explícito del tasks.md U4) y no en `src/test/fakes.ts` (§11.1 decía que FakeClock aterrizaría ahí): la nota de U1 ya anticipaba que fakes.ts aterriza con la unidad que lo necesite; el tasks artifact es la autoridad del contenido de U4. Los demás fakes (`stubAudioContext`, stubs de navigator) siguen planificados en `src/test/fakes.ts` (U10/U13).
- Los tests TRIANGULATE pasaron al primer run tras GREEN (uniformidad estructural del motor — la afirmación central del diseño §3.3); para que la evidencia TDD no sea una tautología se ejecutó un **chequeo de mutación** documentado arriba (5 fallos con `>=`→`>` y `ceil`→`floor`, revertido).
- `Clock` se re-exporta desde `clock.ts` (`export type { Clock }` con fuente única en `types.ts`); evita duplicar la definición pidiéndola también en clock.ts (el prompt del parentId la mencionaba en ambos).
- `compilePlan` NO se re-exporta desde engine.ts: plan.ts sigue siendo su único hogar (§3.2); consumidores importan directo.

### Remaining tasks

U5–U13 sin marcar (46 tareas). Next unit: **U5 — Config screens: Clásico / Tabata — PR 5** (primer sin marcar: `- [ ] RED: src/components/forms/ClasicoConfigScreen.test.tsx`).

### Workload / PR boundary

- PR 4 = U4 only, branch `u4-timer-engine` → `main` (stacked-to-main, user-confirmed; sin push/PR por este ejecutor — el orquestador los posee).
- Authored lines ≈ 660 (implementación 253: engine 156 + clock 42 + purity 8 + artifacts; tests 406: engine.test 353 + purity entries). Por encima del presupuesto de 400: los tests son 61% del diff y son la matriz HARD GATE mandatoria del spec (7 scenarios literales + guardas + deriva); no hay forma honesta de recortar sin perder cobertura del HARD GATE. El riesgo "High" ya estaba previsto en el forecast por-unit y la ruta auto-chain está resuelta; se reporta para el chequeo de tamaño del orquestador (`size:exception` disponible si el reviewer quiere dividir, aunque separar el motor de su matriz de verificación rompería la co-localización).

### Structured status consumed

- `applyState: ready` (20/71 complete), `actionContext.mode: repo-local`, edit roots `[workspace root]`, no warnings. Review Workload Forecast: decisión ya resuelta esta sesión (auto-chain, stacked-to-main) — sin bloqueo de puerta.

---

## U5 — Config screens: Clásico / Tabata (PR 5)

**Branch**: `u5-config-screens` (from `main` @ f0b1cf4). Strict TDD active (`pnpm test` = vitest run). Attempt authority: u5-1789131871-8855 (never written to any repo file).

### Completed tasks (tasks.md checkboxes updated 5/5 U5 → `- [x]`)

RED (1), GREEN (2), TRIANGULATE (1), REFACTOR (1) — all U5 lines checked.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED | `ClasicoConfigScreen.test.tsx` + `TabataConfigScreen.test.tsx` | `Failed to resolve import "./ClasicoConfigScreen"` / `"./TabataConfigScreen"` — Test Files 2 failed | both files green after GREEN+TRIANGULATE below |
| GREEN (support units first) | `zodResolver.test.ts`, `duration.test.ts`, `DurationField.test.tsx` | batch-2 RED: Test Files 5 failed (imports) | all green |
| GREEN | `ClasicoConfigScreen.tsx` + `clasico/page.tsx` + resolver/duration/ui/sessionStore/copy | (incluido arriba) | 4 clases inválidas de trabajo (0, −5, «abc», 3.5) bloquean con mensaje español; válidos → `start` exacto + `/sesion`; resumen 1:25 → 0:40 → «—» |
| TRIANGULATE | `TabataConfigScreen.tsx` + `tabata/page.tsx` | (incluido arriba) | 6 campos × clase 0 + 3 clases extra (no-numérico/decimal/negativo) bloquean; config exacta 10/22/10/2/3/45 arranca; resumen 2:50 → 1:00 |
| GREEN home | `home/HomeScreen.test.tsx` | `Failed to resolve import "./HomeScreen"` | tarjetas verbatim Clásico/Tabata/Personalizado navegan a sus rutas |
| REFACTOR | auditoría §2.3 (grep `use client`) | — | exactamente 3 entradas cliente de ruta (`HomeScreen`, `ClasicoConfigScreen`, `TabataConfigScreen`); las 3 `page.tsx` nuevas son servidor; suite completa **162/162** (15 archivos), `pnpm lint` limpio, `tsc --noEmit` exit 0, `pnpm build` verde (9 rutas, +`/clasico` +`/tabata`) |

Safety net: baseline `pnpm test` en `main` antes de editar → **120/120**. Sin fallos preexistentes.

Fix-up intermedio (RED honesto): tras el primer GREEN, RHF con resolver valida de forma asíncrona → los asserts síncronos fallaban; se envolvieron en `waitFor` (tests), y el stepper desde NaN se fijó a `min` exacto (impl, documentado).

### Files changed

- `src/components/ui/{button,input,label}.tsx` — patrones shadcn escritos a mano, SIN radix ni cva (const objects; fallback pre-autorizado: CLI alpha inutilizable — U1/U2). Primary = acento + glow §9.1.
- `src/components/forms/ValidatedNumberInput.tsx` — base compartida: label + input numérico (draft local; «abc»/vacío → `NaN` al formulario) + error español `role="alert"`; slots para componer steppers.
- `src/components/forms/DurationField.tsx` — stepper de segundos enteros: −/+ clamp a [min,max] (defaults 1..3600 del schema), NaN → recupera `min`; texto tecleado SIN clamp (zod reporta límites).
- `src/components/forms/{Clasico,Tabata}ConfigScreen.tsx` — RHF + `zodResolver` local sobre `configSchemas`; resumen vivo vía `compilePlan` (puro) + `totalPlanMs`; «Iniciar» → `sessionStore.start(config)` + `router.push("/sesion")`.
- `src/app/page.tsx` (shell servidor + HomeScreen), `src/app/clasico/page.tsx` y `src/app/tabata/page.tsx` (shells servidor con encabezado/metadata en español).
- `src/components/home/HomeScreen.tsx` — tarjetas de modo verbatim + descripciones; iconos lucide; slot de rutinas rápidas stub (comentario) hasta U9; nudge de instalación hasta U13.
- `src/stores/sessionStore.ts` — **SEAM U5→U7** (ver decisiones).
- `src/lib/validation/zodResolver.ts` — adaptador zod→RHF mínimo (ver decisiones).
- `src/lib/timer/duration.ts` — `formatDurationMs` (m:ss / h:mm:ss, reutilizable por U8) + `totalPlanMs`.
- `src/components/shared/copy.ts` — bloque `CONFIG_COPY` (iniciar, duración total, 7 etiquetas de campo, descripciones) + `HOME_COPY` (subtítulo + 3 descripciones de modo). Auditoría de copy existente sigue verde.
- `src/app/page.test.tsx` — smoke U1 actualizado con mock de `useRouter` (la portada ahora monta entrada cliente; el propósito del smoke — cadena vitest+RTL+jest-dom + título — se conserva).
- Tests nuevos: los 6 archivos listados en la tabla.

### Spec → tests (timer-modes / ui-design)

| Scenario | Test |
| --- | --- |
| Valid configuration starts a session | Clásico «valores válidos… config exacta» (5/25/10/3) + push /sesion |
| Invalid values block the start | it.each 4 clases (0/−5/abc/3.5) — mensaje español visible, `start` NUNCA llamado |
| Valid Tabata configuration | Tabata «valores válidos… config exacta» (10/22/10/2/3/45) |
| Mode Selection: all modes reachable | HomeScreen 3 tarjetas verbatim → /clasico, /tabata, /personalizado (ruta la completa U6) |
| Copy audit (parcial) | copy.test.ts de U2 re-escanea CONFIG_COPY/HOME_COPY (allowlist segundo plano) — verde |

### Decisions / deviations

- **`zodResolver` local** (`src/lib/validation/zodResolver.ts`) en lugar de `@hookform/resolvers`: el paquete NO está en el set de dependencias aprobado (U1) y el orquestador pidió mantener deps al mínimo. Misma forma de llamada (`resolver: zodResolver(schema)`), soporta rutas planas (U5) y anidadas `blocks.0.values.x` (contrato para U6, testeado). Tipo de retorno síncrono `(values) => ResolverResult` — asignable al `Resolver` de RHF.
- **Seam elegido**: `src/stores/sessionStore.ts` como contrato mínimo (variable de módulo) — `start(config)` retiene la config pendiente; U7 lo reemplaza por el store zustand real con el motor U4. Descartada la alternativa sessionStorage (tasks.md fija literalmente `sessionStore.start`). La pantalla navega tras `start` (mock de tests = contrato U7).
- **`rondas` vestigial (flag U3)**: al construir `TabataConfig` se fija `rondas: rondasPorTabata` (submit y resumen) — documentado en pantalla y tests; la compilación usa exclusivamente `rondasPorTabata`.
- **«Guardar rutina»**: no se renderiza nada (U9 lo añade) — decisión pedida y documentada por el orquestador.
- **Stepper desde NaN** → recupera `min` (no min+1): comportamiento documentado y testeado.
- **FireEvent, no user-event**: `@testing-library/user-event` no está en el set de deps; `fireEvent.click` sobre el botón submit dispara `submit` en jsdom (verificado con probe antes de escribir los tests).
- Advisory typos «unknown word» del harness sobre español: falsos positivos de cspell, consistentes con unidades previas; sin acción.

### Remaining tasks

U6–U13 sin marcar (41 tareas). Next unit: **U6 — Personalizado builder — PR 6** (primer sin marcar: `- [ ] RED: src/components/builder/PersonalizadoBuilder.test.tsx`).

### Workload / PR boundary

- PR 5 = U5 only, branch `u5-config-screens` → `main` (stacked-to-main, user-confirmed; sin push/PR por este ejecutor — el orquestador los posee).
- Authored lines ≈ 720 (implementación ≈ 370: screens 2×~150, fields ~90, ui ~90, resolver/duration/sessionStore/copy ~120; tests ≈ 350: 6 archivos). Por encima del estimado ~300 y del presupuesto 400: los tests son el 49% y son los escenarios literales del spec timer-modes (4+9 clases inválidas + config exacta + resumen compilePlan); la ruta auto-chain está resuelta y el forecast por-unidad era «Medium». Se reporta para el chequeo de tamaño del orquestador (`size:exception` disponible si el reviewer quiere dividir, aunque separar las pantallas de sus tests de spec rompería la co-localización). Dentro del presupuesto del intento (1500).

### Structured status consumed

- `applyState: ready` (25/71 complete), `actionContext.mode: repo-local`, edit roots `[workspace root]`, no warnings. Review Workload Forecast: decisión ya resuelta esta sesión (auto-chain, stacked-to-main) — sin bloqueo de puerta.

---

## U6 — Personalizado builder (PR 6)

**Branch**: `u6-builder` (from `main` @ 29707a1). Strict TDD active (`pnpm test` = vitest run). Attempt authority: u6-1789133346-28569 (never written to any repo file).

### Completed tasks (tasks.md checkboxes updated 4/4 U6 → `- [x]`)

RED (1), GREEN (1), TRIANGULATE (1), REFACTOR (1) — all U6 lines checked.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED (todo el archivo, 14 tests) | `src/components/builder/PersonalizadoBuilder.test.tsx` | `Error: Failed to resolve import "./PersonalizadoBuilder"` — Test Files 1 failed, no tests ran (módulos inexistentes = RED genuino para los 4 ciclos) | 14/14 pass |
| GREEN (fix intermedio honesto) | mismo archivo | tras el primer GREEN: 13/14 — React crash «Objects are not valid as a React child {type, message}»: `fieldErrorsByIndex` entregaba objetos de error donde DurationField espera strings | extracción de `.message` por campo → 14/14 |
| GREEN (tipado) | — | TS: `BlockFormValues[]` ≠ `BlockDef[]` (rondas vestigial opcional) → cast único documentado en el límite de render | `tsc --noEmit` exit 0 |
| TRIANGULATE | incluido en el archivo RED (reorden→compilePlan, descanso global 0, config exacta, shell de ruta) | (mismo run RED) | `Subir bloque 2` + Iniciar ⇒ `compilePlan(config)` primer trabajo = 45 s «Bloque 1 · Trabajo»; descanso global 0 ⇒ mensaje español y sin start; config exacta con `rondas: 2` vestigial fijado; `/personalizado` renderiza h1 + constructor |
| REFACTOR | auditoría de composición (grep) | — | solo `PersonalizadoBuilder` importa react-hook-form (los 4 hijos son presentacionales con callbacks); `BlockCard` reutiliza `DurationField`/`ValidatedNumberInput` (10 usos); `page.tsx` queda servidor (grep `use client`: 12 archivos, ninguno es `src/app/personalizado/page.tsx`) |

Safety net: baseline `pnpm test` en `main` antes de editar → **162/162** (15 archivos). Sin fallos preexistentes.

Verificación final en la rama: `pnpm test` → **Test Files 16 passed (16), Tests 176 passed (176)** · `pnpm lint` limpio · `pnpm exec tsc --noEmit` exit 0 · `pnpm build` verde (10 rutas estáticas, +`/personalizado` 2.63 kB).

### Files changed

- `src/app/personalizado/page.tsx` — shell servidor: h1 verbatim «Personalizado», descripción, metadata; completa «All modes reachable» (HomeScreen ya enlazaba la ruta desde U5).
- `src/components/builder/PersonalizadoBuilder.tsx` — única entrada cliente de la ruta: RHF + `zodResolver` sobre `personalizadoValuesSchema`; operaciones estructurales (añadir/quitar/reordenar) reescriben `blocks` vía `setValue` con ids estables; resumen vivo `compilePlan` + `totalPlanMs`; «Iniciar» → `sessionStore.start(config)` + `/sesion`.
- `src/components/builder/BlockList.tsx` — lista ordenada, clave React = `block.id`; estado vacío en español.
- `src/components/builder/BlockCard.tsx` — tarjeta por bloque: header «Bloque N · {Tipo}», campos por tipo reutilizando U5; ids de input únicos `bloque-{id}-{campo}`.
- `src/components/builder/AddBlockMenu.tsx` — dos botones «Añadir bloque Clásico/Tabata» (menú plano; drag-drop fuera de v1).
- `src/components/builder/ReorderControls.tsx` — subir/bajar con aria-label posicional + guardas disabled en extremos.
- `src/components/shared/copy.ts` — `BUILDER_COPY` (añadir/quitar/subir/bajar/vacío) + `CONFIG_COPY.campos.descansoGlobalS` + `CONFIG_COPY.descripcion.personalizado`. La auditoría de copy (allowlist segundo plano) re-escanea automáticamente y sigue verde.
- `src/components/builder/PersonalizadoBuilder.test.tsx` — 14 tests (tabla spec→tests abajo).

### Spec → tests (timer-modes)

| Scenario | Test |
| --- | --- |
| Empty sequence is rejected | «arranca con cero bloques…» + «rechaza iniciar con cero bloques» (mensaje «Añade al menos un bloque…», start/push NUNCA llamados) |
| Mixed sequence runs block by block (UI→plan) | resumen 2:00 = Tabata 60 + descanso global 20 + Clásico 40 (compilePlan vivo); «—» sin bloques |
| Block values are independent | dos Clásico: editar trabajo del bloque 2 a 45 no toca el 30 del bloque 1 (UI + config enviada) |
| Reordering changes execution order | «Subir bloque 2» + Iniciar ⇒ `compilePlan(config)` primer trabajo 45 s con label «Bloque 1 · Trabajo» (orden compilado, no solo visual) |
| Valid configuration / builder ops | añade Clásico+Tabata con sus campos; elimina (renumeración); guardas subir/bajar disabled en extremos; config exacta + `rondas: rondasPorTabata` vestigial + push /sesion |
| Descanso global = misma validación | 0 s ⇒ «El descanso global debe durar al menos 1 segundo», sin start |
| All modes reachable (cierre) | shell `/personalizado` renderiza h1 nivel 1 + constructor (home link existente de U5) |

### Decisions / deviations

- **Estado de bloques sin `useFieldArray`**: RHF `useFieldArray` secuestra la propiedad `id` de cada item (su clave interna colisiona con el `id` estable de `BlockDef`, design §3.1). Se gestionan las operaciones estructurales con `getValues("blocks")` + `setValue("blocks", …)` — los ids permanecen estables a través de añadir/quitar/reordenar y cada bloque conserva su estado bajo `blocks[i].values.*`.
- **Cast documentado único en el límite de render** (patrón U3 en `personalizadoSeeds`): `values.blocks as BlockDef[]` — el `rondas` vestigial de Tabata es opcional en el schema zod pero requerido en el tipo; el render no lee ese campo. Mismo cast en `BlockCard` (`values as TabataValues`) para los tres campos exclusivos de Tabata. La config de envío se normaliza en `toPersonalizadoConfig`, que fija `rondas: rondasPorTabata` (misma decisión que `TabataConfigScreen` en U5).
- **Errores anidados**: `zodResolver` (U5) ya anidaba rutas `blocks[i].values.campo`; el builder los aplana a `Partial<Record<BlockCampo, string>>` con un cast documentado (el tipado de RHF para arrays de uniones no modela el runtime del resolver).
- **clearErrors("blocks") tras cada operación estructural**: los errores viven por índice; reordenar/eliminar los dejaría desalineados con los bloques que quedan.
- **Defaults**: descanso global 20 s (escenario del spec); semillas de bloque = defaults de U5 (Clásico 10/30/15/2, Tabata 10/20/10/2/2/60). El builder arranca con CERO bloques (el escenario «Empty sequence» exige ver el rechazo).
- **`crypto.randomUUID` con fallback** a contador (`bloque-{Date.now()}-{n}`) — jsdom no garantiza `randomUUID`.
- **Menú plano, no dropdown**: dos botones visibles — simple y testeable (tasks: drag-drop NO requerido en v1; mismo espíritu para el menú). No se consumió ningún componente ui nuevo (button existente basta).

### Remaining tasks

U7–U13 sin marcar (37 tareas). Next unit: **U7 — Session store + active screen + controller — PR 7** (primer sin marcar: `- [ ] RED: src/stores/sessionStore.test.ts`).

### Workload / PR boundary

- PR 6 = U6 only, branch `u6-builder` → `main` (stacked-to-main, user-confirmed; sin push/PR por este ejecutor — el orquestador los posee).
- Authored lines ≈ 780 (implementación ≈ 425: builder 5 componentes + page + copy; tests ≈ 320 + artifacts ≈ 35). Por encima del estimado ~300 y del presupuesto 400: los tests son los escenarios literales del spec timer-modes (14 tests: vacío, validación×2, independencia, resumen×3, reorder-compilado, config exacta, shell). La ruta auto-chain está resuelta; forecast por-unidad «Medium». Se reporta para el chequeo de tamaño del orquestador (`size:exception` disponible si el reviewer quiere dividir, aunque separar el builder de sus tests rompe la co-localización). Dentro del presupuesto del intento (1500).

### Structured status consumed

- `applyState: ready` (30/71 complete), `actionContext.mode: repo-local`, edit roots `[workspace root]`, no warnings. Review Workload Forecast: decisión ya resuelta esta sesión (auto-chain, stacked-to-main) — sin bloqueo de puerta.

---

## U7 — Session store + active screen + controller (PR 7)

**Branch**: `u7-session` (from `main` @ 41db4e2). Strict TDD active (`pnpm test` = vitest run). Attempt authority: u7-1789135969-21677 (never written to any repo file).

### Completed tasks (tasks.md checkboxes updated 6/6 U7 → `- [x]`)

RED (1), GREEN (1), TRIANGULATE (2), REFACTOR (1) — all U7 lines checked.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED-1 | `src/stores/sessionStore.test.ts` | `Module "./sessionStore" has no exported member 'useSessionStore'` — 8/11 failed (el seam U5 no tiene store) | 11/11 pass |
| GREEN-1 | `sessionStore.ts` real (zustand efímero) | (mismo run) | (mismo run) |
| RED-2 | `src/components/timer/ActiveSessionScreen.test.tsx` | `Failed to resolve import "./ActiveSessionScreen"` — Test Files 1 failed | 9/9 pass tras GREEN-2 (fix intermedio honesto: `NextPhaseHint` partía «Siguiente: X» en dos nodos → un solo text run) |
| GREEN-2 | `TimeDisplay` + `PhaseRing` + `NextPhaseHint` + `Controls` + `ActiveSessionScreen` + `SESSION_COPY` | (mismo run) | (mismo run) |
| RED-3 | `src/features/session/SessionController.test.tsx` (ola 1: guarda, ticker, visibilidad, flash, completado, stop) | `Failed to resolve import "./SessionController"` — Test Files 1 failed | 13/13 pass (fix de fixture: fuga del spy de `refreshView` por `setState` que FUSIONA — `resetStore` restaura la acción real) |
| GREEN-3 | `useSessionController.ts` + `SessionController.tsx` + `src/app/sesion/page.tsx` | (mismo run) | (mismo run) |
| TRIANGULATE (tasks 3–5) | +6 tests (4 scenarios HARD GATE literales + shell chrome-minimal + copy honesto) | Pasaron al primer run — uniformidad estructural (el motor es la única fuente de verdad; el controlador solo re-computa). **Chequeo de mutación** como evidencia de dientes: eliminar el `refreshView()` del handler de `visibilitychange` ⇒ **6 tests fallan** (visibilidad inmediata, completado y 3 scenarios HARD GATE); revertido → 19/19 | 19/19 pass |
| REFACTOR | auditoría de delgadez + extracción | — | suite completa **215/215** (19 archivos); `pnpm lint` limpio; `pnpm exec tsc --noEmit` exit 0; `pnpm build` verde (+`/sesion` 2.48 kB) |

Safety net: baseline `pnpm test` en `main` antes de editar → **176/176** (16 archivos). Sin fallos preexistentes.

### Files changed

- `src/stores/sessionStore.ts` — **REEMPLAZO del seam U5**: store zustand EFÍMERO (§4.1) con `SessionState` + vista cacheada + reloj inyectado; acciones `start(config, clock?)/pause/resume/stop/refreshView` mapean 1:1 a `startSession/pauseSession/resumeSession/computeView` (el store NO hace aritmética). Export imperativo `start(config)` conservado — U5/U6 no cambian (sus mocks `{ start }` siguen válidos). Seam de completado para U8: `setOnComplete(cb)` + `SessionCompletionData { config, elapsedActiveMs, completedAt }`.
- `src/features/session/useSessionController.ts` — observadores extraídos como hooks reutilizables (REFACTOR task): `useIntervalDriver` (ticker 250 ms solo corriendo+y visible), `useVisibilityChange` (→ refreshView inmediato), `usePhaseFlash` (observador de índice de fase; gancho observable `data-flashing` + clase `phase-flash` para U10/U13), `useCompletionObserver` (exactly-once sobre la transición de status; dispara el seam con datos del motor). `useSessionController` compone todo.
- `src/features/session/SessionController.tsx` — única entrada cliente de `/sesion`: guarda (sin sesión → estado vacío español + `replace("/")`), flujo de descarte (diálogo → confirmar = `stop()` + `replace("/")`), render de la pantalla.
- `src/components/timer/ActiveSessionScreen.tsx` — presentación del `SessionView`: etiqueta de fase (h1), `TimeDisplay`, `PhaseRing` (progressbar semántico), `NextPhaseHint`, `Controls`; estado completado sin controles (U8 navega al resumen vía seam).
- `src/components/timer/{TimeDisplay,PhaseRing,NextPhaseHint,Controls,ConfirmStopDialog}.tsx` — m:ss mono con color por kind (§9.1: trabajo acento, descanso verde, preparación amarillo, largo/global azul); anillo conic-gradient puro (§9.3, sin lib); pista de siguiente; Pausar/Reanudar en el mismo botón + Detener; diálogo **escrito a mano** (decisión documentada: radix NO está en las deps aprobadas y tasks.md U7 permite el modal simple — `role="alertdialog"` + `aria-modal`).
- `src/app/sesion/page.tsx` — shell servidor (§2.3); chrome-minimal §2.4 vía `showNavFor` (U2).
- `src/components/shared/copy.ts` — bloque `SESSION_COPY` (controles, siguiente/última fase, completada, sin sesión, título/descripción/botones del descarte). La auditoría copy.test.ts lo re-escanea automáticamente (allowlist segundo plano).
- Tests nuevos: `sessionStore.test.ts` (11), `ActiveSessionScreen.test.tsx` (9), `SessionController.test.tsx` (19).

### Spec → tests (timer-correctness + workout-completion + ui-design)

| Scenario | Test |
| --- | --- |
| Pause freezes the countdown | Screen «Pausar congela la cuenta…» + store «pause pliega… congela la vista» |
| Resume continues the same phase | Screen «Reanudar continúa la misma fase…» (pausa 4 s suspendida no consume) |
| Stop ends the session immediately | Controller «confirmar descarta: store a cero, vuelta al inicio, sin resumen ni entrada» |
| Return from background mid-phase | Controller «5 s fuera → trabajo con 15 s» (literal spec) |
| Return from tab switch across a boundary | Controller «cambio de pestaña 50 s → trabajo FINAL con 15 s» (+ «Última fase») |
| Sleep/resume across multiple boundaries | Controller «sleep 120 s → posición exacta» (Tabata 170 s: 145 s → descanso 0:05) |
| Session completes while suspended (parte sesión) | Controller «dispara el seam onComplete UNA sola vez» (elapsedActiveMs = 85_000 = totales; el resumen/entrada son U8) |
| Paused sessions do not consume while suspended | Controller «pausada 2 min → sigue pausada con 20 s» |
| Copy does not overpromise | Controller «ningún texto del temporizador promete segundo plano» + copy.test.ts allowlist (automático sobre SESSION_COPY) |
| Manual Stop Discards (session-scoped) | Controller stop ×3 (confirmar/cancelar/en pausa) — sin entrada (onComplete NUNCA llamado), navegación a inicio |
| Timer screen chrome-minimal §2.4 | Controller «el shell de la ruta renderiza el controlador… sin navigation» + showNavFor U2 |

### Decisions / deviations

- **`Clock` es `() => number`; `FakeClock` es un objeto** `{now,advance,set}`: los tests inyectan el reloj al store con un adaptador trivial `asClock(fake) = () => fake.now()` (no se tocó clock.ts de U4). Documentado en ambos tests.
- **Diálogo de descarte a mano** (no radix, no shadcn add): radix no está en el set de deps; tasks.md U7 da a elegir. `role="alertdialog"`/`aria-modal`/aria-labelledby cubren la semántica.
- **El porcentaje del anillo** es la única aritmética fuera del motor — presentacional (restante/duración de valores YA computados por el motor); la verdad de tiempo/fase SIEMPRE es `computeView`.
- **Ticker re-anclado por render**: sin `useCallback` (disciplina react-19; compiler no activo), el intervalo se limpia/re-crea en cada render provocado por su propio tick — deriva ≈ latencia de render/tick, aceptable para un driver cosmético que jamás acumula (§3.5: nunca autoritativo).
- **refreshView en ambas direcciones del visibilitychange** (también al ocultar): recomputar es barato y correcto en cualquier estado; el HARD GATE es al retorno.
- **Guarda post-stop**: tras confirmar el descarte, la guarda del controlador también dispara `replace("/")` (doble con el handler — mismo destino, inofensivo).
- **Fuga de fixture descubierta y corregida**: `useSessionStore.setState({ refreshView: spy })` FUSIONA y el espía se fugaba a tests siguientes; `resetStore` restaura la acción real capturada al importar.

### Remaining tasks

U8–U13 sin marcar (31 tareas). Next unit: **U8 — Completion + history — PR 8** (primer sin marcar: `- [ ] RED: src/lib/storage/persisted.test.ts`). U8 cablea el seam: `sessionStore.setOnComplete(data => { historyStore.addEntry(...); router.push("/resumen"); })`.

### Workload / PR boundary

- PR 7 = U7 only, branch `u7-session` → `main` (stacked-to-main, user-confirmed; sin push/PR por este ejecutor — el orquestador los posee).
- Authored lines ≈ 1,415 (implementación ≈ 620: store 110 + controller 48 + hook 126 + pantalla 86 + 5 subcomponentes 193 + page 13 + copy 20 + comentarios; tests ≈ 765: 11+9+19 escenarios de spec; artifacts ≈ 30). Por encima del estimado ~350 y del presupuesto 400: los tests son el 54% y cubren los 4 scenarios HARD GATE literales en nivel de componente + exactamente-una-vez + ticker/visibilidad/flash + stop ×3 + guarda + copy (obligación de tasks.md U7). El forecast por-unidad era «High»; la ruta auto-chain está resuelta. Se reporta para el chequeo de tamaño del orquestador (`size:exception` disponible si el reviewer quiere dividir, aunque separar el controlador de sus scenarios HARD GATE rompería la co-localización del gate). Dentro del presupuesto del intento (1500).

### Structured status consumed

- `applyState: ready` (34/71 complete), `actionContext.mode: repo-local`, edit roots `[workspace root]`, no warnings. Review Workload Forecast: decisión ya resuelta esta sesión (auto-chain, stacked-to-main) — sin bloqueo de puerta.

## U8 — Completion + history (PR 8)

**Status: COMPLETE** (implementation by phase agent; orchestrator finished the cycle after the agent process errored post-implementation, pre-commit).

- Work found staged and green on inspection: 277/277 tests (25 files; +62 vs U7 baseline: query/filters/stats, persisted round-trip + corrupt-JSON defaults, completion wiring exactly-once, CompletionSummary 85s-active vs 115s-wall, HistoryScreen composing filters + Spanish labels).
- Orchestrator fixes before delivery: 3 zustand-persist generic errors in `persisted.test.ts` (explicit `<S, T>` at call sites — `S` is not inferable from args) + 1 unused-var lint (`set` → `_set` in a no-op creator). tasks.md U8 lines verified satisfied and checked (TRIANGULATE via test content inspection; REFACTOR via import graph).
- Evidence: `pnpm test` 25 files / 277 tests passed; `pnpm lint` clean; `tsc --noEmit` exit 0.

---

## U9 — Routines (PR 9)

**Branch**: `u9-routines` (from `main` @ 9b89e37). Strict TDD active (`pnpm test` = vitest run).

**Status: COMPLETE.** All 5 U9 task checkboxes marked `- [x]` in `tasks.md`.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED-1 | `src/stores/routinesStore.test.ts` | `Error: Failed to resolve import "./routinesStore"` — Test Files 1 failed, no tests ran | 17/17 pass (fix intermedio honesto: 3 fixtures — `setState` persiste el corte vacío al simular recarga, así que el disco se re-siembra tras limpiar memoria, patrón historyStore.test; y el aserto `readStored()).toBeNull()` tras remove era incorrecto — remove legítimamente reescribe SU clave) |
| GREEN-1 | `routinesStore.ts` + registro en `storeRehydrators.ts` | (mismo run) | historyStore + gate siguen verdes (27/27 en los 3 archivos) |
| RED-2 | `RoutinesScreen.test.tsx` | `Failed to resolve import "./RoutinesScreen"` — Test Files 1 failed | 7/7 pass (fix honesto: modo y fecha en elementos separados — un solo nodo de texto «Clásico · 12/2/2025» no matchea `getByText("Clásico")`) |
| GREEN-2 | `RoutineNameDialog` + `SaveRoutineDialog` + `RenameDialog` + `ConfirmDeleteRoutineDialog` + `RoutineCard` + `RoutinesScreen` + `rutinas/page.tsx` + `ROUTINES_COPY` | (mismo run) | (mismo run) |
| RED-3 | adiciones a `ClasicoConfigScreen.test` (+3), `TabataConfigScreen.test` (+1), `PersonalizadoBuilder.test` (+1), `HomeScreen.test` (+2, reescrito) | 6 failed: ×5 `Unable to find button "Guardar rutina"` + ×1 `Unable to find text "Rutinas guardadas"` — 39 preexistentes verdes | 52/52 en los 5 archivos de pantalla |
| GREEN-3 | botones «Guardar rutina» + `SaveRoutineDialog` en las 3 pantallas; slot de rutinas rápidas en `HomeScreen` | (mismo run) | (mismo run) |
| REFACTOR | auditoría de compartición + frontera (greps) | — | los DOS diálogos (guardar/renombrar) son cableados delgados sobre `RoutineNameDialog` (nombre/validación/rama de sobrescritura en UN solo lugar); `/rutinas/page.tsx` queda servidor (0 `use client`); `routinesStore` sin imports de React; copy.test re-escanea ROUTINES_COPY automáticamente |

Safety net: baseline `pnpm test` en `main` antes de editar → **277/277** (25 archivos). Sin fallos preexistentes.

Verificación final en la rama: `pnpm test` → **Test Files 27 passed (27), Tests 308 passed (308)** (+31 vs U8) · `pnpm lint` 0 errores (1 warning PREEXISTENTE de U8: `_set` en `persisted.test.ts`) · `pnpm exec tsc --noEmit` exit 0 · `pnpm build` verde (12 rutas estáticas; `/rutinas` 3.09 kB — antes placeholder).

### Spec → tests (routines)

| Scenario | Test |
| --- | --- |
| Save a Clásico routine | store «guarda con nombre y modo…» + Clásico «guarda la configuración actual con los valores exactos» |
| Empty name rejected | store «nombre vacío…» + Clásico «nombre vacío: error en línea y ninguna rutina creada» + Rename vacío (RoutinesScreen) |
| Duplicate names never silently overwrite | store «pide confirmación y NO toca la original» + «con overwrite EXPLÍCITO reemplaza…» + Clásico UI «confirmación EXPLÍCITA antes de sobrescribir» (original intacta hasta pulsar Sobrescribir) |
| Personalizado routine keeps the full sequence | store «save → load → compilePlan igualdad exacta incluido descanso global» (2 descansos globales de 20 s entre 3 bloques, rehydrate intermedio) + Builder «guarda la secuencia completa; el plan conserva el descanso global» |
| Start directly from the list | RoutinesScreen «Iniciar arranca… config exacta y navega a /sesion» + personalizado full-sequence + HomeScreen slot «arranca directamente con la config exacta» |
| Routines survive reload | store «round-trip: disco con rutinas + rehydrate()» + «registro en el gate» |
| Rename preserves configuration | store «renombrar cambia SOLO el nombre» + RoutinesScreen «renombrar cambia el nombre visible y conserva la config original» (iniciar tras renombrar entrega la original) |
| Delete removes only the routine | store «eliminar no toca las demás NI el historial» (memoria + clave de disco del historial byte a byte) + RoutinesScreen flujo cancelar/confirmar (aislamiento de UI) |

### Files changed

- `src/stores/routinesStore.ts` — store persistido v1: `save(config, name, {overwrite?})`/`rename`/`remove` con la unión `RoutineWriteResult` (saved / rejected-empty-name / rejected-duplicate-name / rejected-invalid-config / rejected-missing / **confirm-overwrite**). Aduana de config: `sessionConfigSchema.safeParse` antes de escribir (una config inválida en disco rebotaría al rehidratar y el fallback tiraría TODA la lista). `normalizeConfig` fija el `rondas` vestigial de Tabata a nivel config Y de bloque Personalizado (mismo criterio que las pantallas U5/U6 — sin cast).
- `src/stores/storeRehydrators.ts` — rehydrator de "tiptap.routines" registrado en el gate (§2.3).
- `src/components/routines/RoutineNameDialog.tsx` — diálogo COMPARTIDO (decisión de simplificación: modal a mano patrón U7 — radix NO está en las deps aprobadas y tasks.md U9 permite elegir el patrón simple; `role="dialog"` + `aria-modal`): nombre + validación en línea + **rama explícita de sobrescritura**; mapea `RoutineWriteResult` → UI.
- `src/components/routines/{SaveRoutineDialog,RenameDialog,ConfirmDeleteRoutineDialog}.tsx` — cableados delgados: save evalúa `getConfig()` AL CONFIRMAR (valores actuales; null si el formulario es inválido → mensaje en línea); rename nunca ofrece sobrescritura (pisar a otra rutina perdería su config; la spec solo exige la rama al guardar); delete usa alertdialog a mano (patrón ConfirmStopDialog).
- `src/components/routines/{RoutinesScreen,RoutineCard}.tsx` — única entrada cliente de /rutinas: lista (nombre, MODE_LABEL verbatim, fecha `Intl "es"`), Iniciar directo (`sessionStore.start(routine.config)` + `/sesion`), Renombrar/Eliminar con diálogos; estado vacío español.
- `src/app/rutinas/page.tsx` — shell servidor (reemplaza el placeholder U2).
- `src/components/shared/copy.ts` — bloque `ROUTINES_COPY` + `HOME_COPY.rutinasTitulo`; la auditoría de copy re-escanea automáticamente (allowlist segundo plano).
- `src/components/forms/{Clasico,Tabata}ConfigScreen.tsx`, `src/components/builder/PersonalizadoBuilder.tsx` — botón «Guardar rutina» (outline, NO submit) + `SaveRoutineDialog` con `getConfig` de los valores actuales.
- `src/components/home/HomeScreen.tsx` — slot de rutinas rápidas: lista con nombre + modo + icono play; arranque directo; oculto sin rutinas.
- Tests: `routinesStore.test.ts` (17), `RoutinesScreen.test.tsx` (7), +3/+1/+1/+2 en las pantallas existentes.

### Decisions / deviations

- **Diálogos a mano (patrón U7), no radix**: documentado en cada componente — radix no está en el set de deps aprobado; tasks.md U9 da a elegir «hand-write dialog (radix) or reuse the U7 alert-dialog pattern — pick simpler». Semántica: `role="dialog"`/`alertdialog` + `aria-modal` + aria-labelledby/describedby.
- **`rejected-invalid-config` (extensión honesta del contrato RED)**: tasks.md pedía empty-name/duplicate/rename/delete/persistencia; se añade la aduana de config porque el fallback zod de `createValidatedPersist` descartaría TODA la lista si un registro inválido llegara a disco — la defensa es estructural. La UI lo muestra como error en línea («Revisa los valores…»).
- **Rename sin rama de sobrescritura**: renombrar al nombre de otra rutina → rechazo con mensaje; sobrescribir a otra rutina perdería SU config y la spec solo exige confirmación explícita al GUARDAR.
- **`rejected-missing` en rename** (id inexistente, p. ej. borrado en otra pestaña): el diálogo compartido cierra sin tocar nada — respuesta honesta documentada.
- **Guardar con formulario inválido no bloquea el botón**: abre el diálogo y el error aparece en línea al confirmar (getConfig → null o store → rejected-invalid-config). Misma honestidad que el resumen «—» de las pantallas.
- **Trim del nombre** en save/rename ("  Piernas  " → "Piernas"); colisión por igualdad exacta tras trim (case-sensitive).
- **overwrite conserva id y createdAt** (semántica de actualización de ESA rutina).
- **HomeScreen.test reescrito**: el archivo original no mockeaba `sessionStore` (la portada no lo importaba); ahora mockea `start` (contrato del slot) y resetea el store de rutinas; los 2 tests originales de tarjetas de modo se conservan idénticos en sustancia.

### Remaining tasks

U10–U13 sin marcar (22 tareas). Next unit: **U10 — Audio I: in-memory beeps — PR 10** (primer sin marcar: `- [ ] RED: src/lib/audio/cues.test.ts`).

### Workload / PR boundary

- PR 9 = U9 only, branch `u9-routines` → `main` (stacked-to-main, user-confirmed; sin push/PR por este ejecutor — el orquestador los posee).
- Diff: 21 archivos, 1695 inserciones / 26 eliminaciones (≈800 implementación + ≈800 tests + ≈75 artifacts). Por encima del presupuesto de 400 líneas — misma postura que U3–U8: los tests son ~47% y cubren los 8 escenarios literales del spec routines + persistencia + aislamiento; la ruta auto-chain está resuelta (forecast por-unidad «Medium»). Se reporta para el chequeo de tamaño del orquestador (`size:exception` disponible si el reviewer quiere dividir, aunque separar el store de sus tests de spec rompería la co-localización). Dentro del presupuesto del intento (2200).

### Structured status consumed

- `applyState: ready` (44/71 complete al iniciar), `actionContext.mode: repo-local`, edit roots `[workspace root]`, no warnings. Review Workload Forecast: decisión ya resuelta esta sesión (auto-chain, stacked-to-main) — sin bloqueo de puerta. Attempt authority: u9-1789156891-18801 (nunca escrito a ningún archivo del repo).

## U10 — Audio I: in-memory beeps (PR 10)

**Branch**: `u10-audio-beeps` (from `main` @ 2b861fe). Strict TDD active (`pnpm test` = vitest run). Attempt authority: u10-1789158512-13091 (never written to any repo file).

**Status: COMPLETE.** All 5 U10 task checkboxes marked `- [x]` in `tasks.md` (implementation tasks 56/71).

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED-1 | `src/lib/audio/cues.test.ts` | `Failed to resolve import "./cues"` — Test Files 1 failed, no tests ran | 11/11 pass (5 s → 3/2/1 + transición; 2 s spec «Short phase» → 2/1; 1 s y 3 s y 4 s; guard sub-segundo; duck events enmarcan cada cue ×4 casos) |
| GREEN-1 | `cues.ts` (planner puro + `BEEP` + `duckEventsFor`) | (mismo run) | (mismo run) |
| RED-2 | `src/lib/audio/context.test.ts` | `Failed to resolve import "./context"` — Test Files 1 failed | 7/7 pass (null sin global; singleton perezoso ×1 instancia; importar no construye; resume suspendido/corriendo/rechaza/no-op ×4) |
| GREEN-2 | `context.ts` | (mismo run) | (mismo run) |
| RED-3 | `src/lib/audio/beepSynth.test.ts` (+ `src/test/fakes.ts` stubAudioContext) | `Failed to resolve import "./beepSynth"` — Test Files 1 failed | 10/10 pass. Fix intermedio honesto ×2: (a) el stub carecía de `connect`/`disconnect` → `TypeError: osc.connect is not a function`; (b) el param `gain` carecía de `setValueAtTime`/ramps → `TypeError`; y 3 expectativas MÍAS con aritmética de ancla mal derivada (elapsed/500 ms) corregidas — la implementación siempre siguió la fórmula §6.2 |
| GREEN-3 | `beepSynth.ts` | (mismo run) | (mismo run) |
| RED-4 | `src/features/session/sessionAudio.test.tsx` | 9/9 failed — cero blips programados (el controlador no cableaba audio): `expected [] to equal [107, 108, …]` | 9/9 pass. Fix intermedio honesto: expectativa del cruce de frontera re-derivada (elapsed 10_500 → 126.5, no 127 — la implementación era correcta) |
| GREEN-4 | `useCueScheduler` en `useSessionController.ts` + señal de re-programación en `visibilitychange` | (mismo run) | (mismo run) |
| TRIANGULATE | `audioDegradation.test.tsx` (2 tests) + **chequeos de mutación** como evidencia de dientes | — | 2/2 pass. Mutación 1: quitar la guarda `typeof AudioContext === "undefined"` de `context.ts` ⇒ **2 tests fallan con `ReferenceError: AudioContext is not defined`** (revertido → verde). Mutación 2: quitar el bump `setRescheduleSignal` del retorno de visibilidad ⇒ **falla el test «retorno de visibilidad…»** (revertido → verde) |
| REFACTOR | `purity.test.ts` + auditoría de assets | — | `cues.ts` bajo PURE_MODULES (2 aserciones nuevas del guardián); cero assets de audio en el repo (find mp3/wav/ogg/m4a/flac/aac → vacío); `createOscillator` solo en `beepSynth.ts` (producción) y `fakes.ts` (test) |

Safety net: baseline `pnpm test` en `main` antes de editar → **308/308** (27 archivos). Sin fallos preexistentes.

Verificación final en la rama: `pnpm test` → **Test Files 32 passed (32), Tests 349 passed (349)** (+41 vs U9) · `pnpm lint` 0 errores (1 warning PREEXISTENTE de U8: `_set` en `persisted.test.ts`) · `pnpm exec tsc --noEmit` exit 0 · `pnpm build` verde (12 rutas estáticas).

### Files changed

- `src/lib/audio/cues.ts` — planificador PURO (§6.2): `CueEvent {atActiveMs, kind}`; `planPhaseCues(phase)` = countdown en S+D−k·1000 (k=1..min(3,⌈D/1000⌉)) + UNA transición en S+D, orden ascendente, guarda de cues antes de S; `BEEP` (const única: 880/1245 Hz, blip 80 ms, hueco 90 ms, duck 0.25/150 ms) compartida con el sintetizador y el duck; `duckEventsFor(cues)` + `cueWindowMs(kind)` — derivación pura de eventos de ducking para U11.
- `src/lib/audio/context.ts` — ciclo de vida §6.1: `getAudioContext()` singleton perezoso (nada en top-level — SSR seguro), `null` sin Web Audio, nunca cerrado; `resumeIfSuspended()` best-effort (try/catch, solo con state suspended).
- `src/lib/audio/beepSynth.ts` — capa impura DELGADA (§6.2): conversión ancla activo-ms → `ctx.currentTime` (`cueCtx = base + (cue.atActiveMs − elapsedActiveMs)/1000`, un par consistente por disparo), descarte de cues pasados (`≤ base`), envolvente osc/gain (sine, setValueAtTime 0.0001 → ramp pico 0.3 → ramp suelo), transición = otra frecuencia + DOBLE blip, auto-limpieza vía `onended`, `schedulePhaseCues` cancela-antes-de-derivar, `cancelScheduledCues()` best-effort, no-op total sobre null.
- `src/features/session/useSessionController.ts` — `useCueScheduler(rescheduleSignal)` (U10): disparadores §6.3 = identidad de `state` (arranque/pausa/reanudación/stop) + `phaseIndex` (frontera) + `status` (completado-en-suspensión) + señal bump SOLO al volver a visible; el cuerpo lee verdad FRESCA (`getState()`) para anclar; pausa/descarte → cancelación; completado → NADA (el cue de transición final ya programado suena en la frontera — cancelarlo cortaría el último beep); `resumeIfSuspended()` en cada programación (§6.1). `useVisibilityChange` del controlador ahora bumpa la señal.
- `src/test/fakes.ts` — NUEVO (§11.1): `stubAudioContext` a mano — registra osciladores (frecuencia/start/stop/cancel), gains (automatización/disconnect), `resume`, `advanceTime`, `blips()` resumen. U11/U13 extienden este archivo.
- `src/lib/timer/purity.test.ts` — `src/lib/audio/cues.ts` añadido a PURE_MODULES (el corte puro/impuro del audio queda guardado estructuralmente).
- Tests nuevos: `cues.test.ts` (11), `context.test.ts` (7), `beepSynth.test.ts` (10), `sessionAudio.test.tsx` (9), `audioDegradation.test.tsx` (2).

### Spec → tests (audio)

| Scenario | Test |
| --- | --- |
| Last-three-seconds convention | cues «5 s: countdown a los 3, 2, 1 + transición» + beepSynth «blips en tiempos EXACTOS» (107/108/109/110 s de contexto) + wiring «arrancar programa la primera fase» |
| Short phase | cues «fase de 2 s: beeps a los 2 y 1 s + transición» (+ 1 s y 3 s y 4 s y guard sub-segundo) |
| No Web Audio, no failure | context «null sin global» + beepSynth «no-op silencioso» + `audioDegradation.test.tsx` e2e: sesión 85 s COMPLETA con pausa/visibilidad/descarte → completada, UNA entrada, /resumen, sin crash (dientes probados por mutación de la guarda) |
| Duck and restore (base U11) | duckEventsFor: cada cue enmarcado con duckDown(0.25) antes y rampBack(1) tras su ventana; ventana de transición cubre el doble blip |
| (Diseño §6.3 re-schedule triggers) | wiring ×5: arranque/pausa-cancela/reanudación-reancla/cruce de frontera/retorno de visibilidad descartando pasado; ticker NO re-programa; completado NO cancela; stop cancela |

### Decisions / deviations

- **Ancla simplificada a (elapsedActiveMs ↔ ctx.currentTime)**: el diseño §6.2 describe el par wallMs↔ctxTime; como el tiempo activo y el del contexto avanzan 1:1 mientras la sesión corre, el wallMs intermedio es irrelevante para la conversión — cada disparo captura el par consistente en el momento del efecto. `schedulePhaseCues(phase, elapsedActiveMs)` documenta esto como el ancla del segmento.
- **El completado NO cancela** (extensión honesta del contrato leída de §6.3): «pause (cancel)» está explícito; el completado no lo está — cancelar cortaría el doble blip de transición FINAL que suena justo en la frontera de detección (≤250 ms de latencia del ticker). Test «completar NO cancela» fija la semántica; los nodos pendientes se limpian solos (onended) o al próximo arranque (cancela-antes-de-derivar).
- **Efecto sin cleanup**: devolver `cancelScheduledCues` del efecto cancelaría el cue final en la transición a «completed» (el cleanup del run anterior correría antes del no-op). La cancelación es explícita en las ramas pausa/descarte; el ticker jamás re-programa (deps = identidad de state/phaseIndex/status + señal).
- **Fakes en `src/test/fakes.ts`** (§11.1) como pedía el tasks.md; `createFakeClock` sigue en `lib/timer/clock.ts` (decisión U4, no revertida).
- **Stub aumentado durante GREEN-3**: el stub inicial omitía `connect/disconnect` y la automatización del AudioParam — dos TypeErrors honestos que el stub debía implementar; se documentó en la tabla de evidencia.
- **Chequeo de mutación doble** (patrón U4/U7): guarda de null en context.ts y bump de visibilidad — ambos probados con fallos reales y revertidos.
- Nota de herramienta: el chequeo LSP automático reportó `./context` como no resuelto varias veces tras crear `context.ts` — verificado falso tres vías: archivo en disco, `tsc --noEmit` exit 0 y la suite `context.test.ts` 7/7 en cada corrida (caché de LSP desactualizada; se disipó tras `touch`).

### Remaining tasks

U11–U13 sin marcar (15 tareas). Next unit: **U11 — Audio II: music import, storage, playback — PR 11** (primer sin marcar: `- [ ] RED: src/lib/storage/musicStore.test.ts`).

### Workload / PR boundary

- PR 10 = U10 only, branch `u10-audio-beeps` → `main` (stacked-to-main, user-confirmed; sin push/PR por este ejecutor — el orquestador los posee).
- Diff: 9 archivos (6 nuevos + 3 modificadas). Authored ≈ 1,050 líneas (implementación ≈ 480: cues 110 + context 45 + beepSynth 105 + wiring 90 + fakes 150; tests ≈ 570: 39 tests en 5 archivos). Por encima del presupuesto 400 — misma postura que U3–U9: los tests son el 54% y cubren los 3 escenarios literales del spec audio + los disparadores §6.3 + degradación e2e + mutaciones. Forecast por-unidad «Medium»; ruta auto-chain resuelta. Dentro del presupuesto del intento (2200). Se reporta para el chequeo de tamaño del orquestador.

### Structured status consumed

- `applyState: ready` (51/71 complete al iniciar), `actionContext.mode: repo-local`, edit roots `[workspace root]`, no warnings. Review Workload Forecast: decisión ya resuelta esta sesión (auto-chain, stacked-to-main) — sin bloqueo de puerta. Attempt authority: u10-1789158512-13091 (nunca escrito a ningún archivo del repo; el token sha256 no se reproduce).

## U11 — Audio II: music import, storage, playback (PR 11)

**Branch**: `u11-audio-music` (from `main` @ e633700). Strict TDD active (`pnpm test` = vitest run). Attempt authority: u11-1789160958-12475 (same open attempt across the agent-error recovery; the token is never written to any repo file).

**Status: COMPLETE.** All 6 U11 task checkboxes marked `- [x]` in `tasks.md` (implementation tasks 62/71).

### Incident note — agent error + orchestrator recovery

A previous executor process errored mid-unit (request u11-1789160958-12475, attempt 1). The work recovered/finished before this session:

- `musicStore.test.ts` + `db.ts` + `musicStore.ts` (+ fake-indexeddb suite) — RED line 1 complete.
- `settingsStore.ts` (+ tests, rehydrator registered in `storeRehydrators.ts`) — line 3 complete.
- `duckGain.ts` (+ 7/7 tests) — implemented by the orchestrator, which also fixed a units bug in the test's `makePhase` (`startOffsetS=2_000` meant 2,000,000 ms; intent [2000,4000) required `makePhase(2, 2, 1)`).

This session completed the remaining scope (lines 2, 4, 5, 6) starting from the green 378/378 baseline (32 files) and finished with everything in ONE commit on `u11-audio-music`.

### TDD Cycle Evidence

| Cycle | Test file | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| RED-1 | `src/lib/audio/musicPlayer.test.ts` (13 tests) | `Error: Failed to resolve import "./musicPlayer"` — Test Files 1 failed, no tests ran | 13/13 pass. Fix intermedio honesto ×2: (a) el stub inicial de fakes.ts no registraba `srcSets` (propiedad plana sin setter) → getter/setter; (b) `pause()` incondicional en el swap rompía cuentas exactas → pausa SOLO si hay URL saliente activa (semántica más limpia: nunca pausar lo que no suena) |
| GREEN-1 | `src/lib/audio/musicPlayer.ts` | (mismo run) | (mismo run) |
| RED-2 | `src/features/session/sessionMusic.test.tsx` (9 tests) | 9/9 failed — `expected "vi.fn()" to be called 1 times, but got 0 times` (el controlador no cableaba música) | 9/9 pass. Fix intermedio honesto ×2: (a) el finder del gain de duck era ambiguo (los envolventes de beeps TAMBIÉN conectan al destino) → finder semántico: el ÚNICO gain con automatización a 0.25; (b) el singleton `sharedDuckGain` persistía entre tests ligado al ctx anterior → `resetDuckGainForTests()` en beforeEach (misma convención de duckGain.test) |
| GREEN-2 | `useMusicDriver` + ducking emparejado en `useCueScheduler` (useSessionController.ts) | (mismo run) | (mismo run) |
| RED-3 | `src/components/settings/SettingsScreen.test.tsx` (9 tests) | `Failed to resolve import "./SettingsScreen"` — Test Files 1 failed | 9/9 pass. Fix intermedio honesto ×3: (a) el nombre de pista aparecía DUPLICADO en el DOM (fila de biblioteca Y opción del selector) → `getByText`/`findByText` veían multi-match y `waitFor` lo reintentaba hasta timeout — consultas `findAllByText`; (b) el mock de lista del test de quitar pisaba también la carga inicial → `mockResolvedValueOnce` + `mockResolvedValue`; (c) el campo `getObjectUrl` del fixture era un `Mock` sin parametrizar → TS2322 contra `Pick<MusicStore,"getObjectUrl">` → `Mock<(id: TrackId) => Promise<string>>` |
| GREEN-3 | `ui/toast.tsx` + `SettingsScreen` + `MusicLibrary` + `TrackAssigner` + `ajustes/page.tsx` + `AJUSTES_COPY` | (mismo run) | (mismo run) |
| REFACTOR | auditorías grep (ver abajo) | — | IDB estrictamente detrás de `MusicStore` (solo `db.ts` + `musicStore.ts` tocan IndexedDB); UNA sola entrada cliente en /ajustes (`SettingsScreen`); el jugador posee exactamente UNA URL activa (aserción de ciclo de vida: revocadas = todas menos la vigente); suite completa **409/409** (38 archivos) · `pnpm lint` 0 errores (1 warning PREEXISTENTE U8 `_set`) · `tsc --noEmit` exit 0 · `pnpm build` verde (`/ajustes` 6.33 kB) |

Safety net: baseline `pnpm test` al iniciar → **378/378** (32 archivos, trabajo recuperado incluido). Sin fallos preexistentes.

### Files changed

Recuperados (commit junto con esta sesión — eran trabajo no versionado):

- `src/lib/storage/db.ts` — IndexedDB «tiptap-workout» v1 (`trackMeta` keyPath id + `trackBlobs` out-of-line), singleton perezoso, `resetMusicDbForTests`.
- `src/lib/storage/musicStore.ts` (+ `musicStore.test.ts` con fake-indexeddb) — pipeline §6.4 (puerta MIME → sonda de reproducibilidad con guardia de 10 s → escritura atómica en UNA transacción) + detección de cuota → `MusicImportError{quota|undecodable}`; huérfanos §7 (`removeTrack` limpia asignaciones vía `clearTrackAssignments`).
- `src/stores/settingsStore.ts` (+ tests) — persistido v1: las CINCO asignaciones por clase de fase, `notificationsOptIn` + `installNudgeDismissedAt` (U13), `clearTrack`.
- `src/stores/storeRehydrators.ts` — rehydrator «tiptap.settings» registrado en el gate (§2.3).
- `src/lib/audio/duckGain.ts` (+ 7 tests) — GainNode compartido + `scheduleDuckAutomation`/`cancelDuckAutomation` con la convención de ancla de beepSynth; nota de solape §6.3 (cancela-antes-de-derivar, pares huérfanos descartados).

De esta sesión:

- `src/lib/audio/musicPlayer.ts` — jugador de larga vida: UN elemento `<audio>` oculto creado+cableado UNA vez (`createMediaElementSource` → duckGain cuando hay Web Audio; sin Web Audio suena directo — degradación honesta); `retargetToPhase` (saliente para → entrante desde 0 con loop; sin asignación → silencio; misma pista → reinicio desde 0 sin churn de URLs); guardia de carreras por número de secuencia (el retarget tardío pierde y SU URL se revoca); `pauseMusic`/`resumeMusic` nativos (posición preservada); `stopMusic` idempotente; no-op total sin elemento; huérfana/IDB caído → silencio sin crash. **El jugador posee EXACTAMENTE UNA URL de objeto activa** (revoca la saliente TRAS el swap).
- `src/features/session/useSessionController.ts` — `useMusicDriver(rescheduleSignal)` (nuevo observador delgado): espejo de disparadores de useCueScheduler — arranque/cambio de fase/retorno de visibilidad re-apuntan; pausa→`pauseMusic`, reanudación→`resumeMusic` (SIN re-apuntar: distinción por transición de status previa pausa + misma fase); completado y descarte→`stopMusic`. `useCueScheduler` ahora empareja `scheduleDuckAutomation` junto a `schedulePhaseCues` (mismo disparador, mismo ancla — el emparejamiento cue↔duck es estructural) y `cancelDuckAutomation` junto a las cancelaciones.
- `src/components/settings/SettingsScreen.tsx` — única entrada cliente de /ajustes: carga de biblioteca (efecto + señal de recarga), handlers importar/quitar, toasts de error; la importación NUNCA toca el reproductor (estructural).
- `src/components/settings/MusicLibrary.tsx` — picker File API (input `accept="audio/*"` oculto + botón accesible), lista nombre+tamaño (`Intl.NumberFormat("es")`), quitar con `aria-label` único por pista.
- `src/components/settings/TrackAssigner.tsx` — las CINCO clases de fase con select nativo (ui/select de U8): «Ninguna» (=null) o pista; escribe directo al settingsStore persistido.
- `src/components/ui/toast.tsx` — **pila de toasts mínima inline** (decisión documentada: sonner NO está en el set de deps aprobado — `role="status"` + `aria-live="polite"`, auto-descarte 6 s).
- `src/app/ajustes/page.tsx` — shell servidor (reemplaza placeholder U2): h1 + descripción + SettingsScreen; U13 añade notificaciones/instalación.
- `src/components/shared/copy.ts` — bloque `AJUSTES_COPY` (textos de error EXACTOS del spec audio); copy.test lo re-escanea automáticamente (allowlist segundo plano sigue verde).
- `src/test/fakes.ts` — `stubAudioElement` (registra srcSets/pausas/plays/removeAttribute + getter/setter de src) junto al `StubMediaElementSource` ya recuperado.
- Tests nuevos de esta sesión: `musicPlayer.test.ts` (13), `sessionMusic.test.tsx` (9), `SettingsScreen.test.tsx` (9).

### Spec → tests (audio + timer-correctness + local-data)

| Scenario | Test |
| --- | --- |
| Import persists across reload | musicStore (recuperado, fake-indexeddb round-trip) + TrackAssigner «el selector refleja la asignación persistida» (settingsStore real) |
| Assignment per phase kind | player «arranca la pista asignada desde 0 con loop» + ajustes «asignar a Trabajo persiste; Ninguna desasigna» (5 selects) |
| Loop during a long phase | player `loop=true` + controlador «loop: dentro de la fase NO se re-apunta» (el elemento loopea; el orquestador no interfiere) |
| Transition switches tracks | player «cambio de fase: para la saliente, arranca la entrante desde 0 y revoca SOLO la URL vieja» + controlador «cruzar una frontera re-apunta» |
| Pause and resume with the timer | controlador «pausar pausa; reanudar REANUDA sin re-apuntar» + player «pausa/reanudación preservan la posición del elemento (nativa)» |
| Duck and restore | controlador «el arranque programa la automatización del duck junto a los cues» (baseline 1 → ducks 0.25 → ramps 1, EXACTOS en el reloj del contexto; duckGain.test 7/7 del bloque recuperado) |
| Quota exceeded | ajustes «cuota: toast español visible y biblioteca intacta» (texto exacto del spec) + musicStore.test recuperado (sin archivo parcial) |
| Undecodable file | ajustes «indescodificable: toast español visible y la importación se rechaza» + musicStore.test recuperado |
| Music follows the recomputed phase | controlador «suspensión que cruza fronteras: re-apunta a la fase RECOMPUTADA» (index 3, no la que sonaba) + «completada en suspensión → stopMusic» |
| Running sessions unaffected (import) | ajustes «importar (éxito o fallo) NUNCA toca el reproductor» (espías del player a cero) |
| Stop discards | controlador «detener confirmado detiene la música» |

### Decisions / deviations

- **`retargetToPhase(phase)` sin `elapsedActiveMs`**: el prompt del orquestador decía «API roughly» con elapsed; la automatización de ducking vive en `useCueScheduler` emparejada con los cues (mismo disparador, mismo ancla — SIEMPRE juntos, haya o no música), así que el jugador no necesita el ancla. Documentado como desviación menor de la firma «aproximada».
- **Misma pista re-apuntada → reinicio desde 0 sin churn de URLs** (sin re-fetch ni revocación): el swap de URL solo ocurre cuando cambia la pista. La spec exige «arranca desde 0» en cada fase — se cumple seek-eando a 0.
- **Suspensión con la MISMA fase → re-apunta igualmente** (reinicia desde 0): «the music playing is that of the recomputed current phase» — recomputar y re-apuntar SIEMPRE es el comportamiento simple y honesto; preservar posición SOLO existe en pausa/reanudación explícitas del temporizador (spec distingue ambos caminos).
- **Completado NO re-apunta**: la rama completed del driver hace `stopMusic` (camino de completado) — y NO cancela la automatización de duck pendiente (el doble blip de transición final ya programado suena hasta el final, misma decisión de U10 para los cues).
- **Toasts mínimos inline, no sonner** (documentado en `ui/toast.tsx`): sonner no está en el set de deps aprobado; el componente da la semántica accesible (`role="status"` + `aria-live="polite"`) con 30 líneas.
- **`pause()` condicional en el swap** (solo si hay URL saliente): nunca pausar lo que no suena — hace las cuentas de pausa exactas y testeable el contrato «la saliente se detiene».
- **Carreras resueltas por secuencia**: un retarget tardío (el usuario cambió de fase mientras se buscaba el blob) se descarta y SU URL se revoca — el vigente siempre es el último.
- **Fixtures**: `vi.fn` sin parámetros tipa `mock.calls` como tuplas vacías (TS) → generic explícito `vi.fn<(phase: …) => Promise<void>>`; el repo no honra prefijo `_` en no-unused-vars (lección U8 re-confirmada).
- **Multi-match de texto**: el nombre de pista vive en dos sitios legítimos (fila + opción del selector) — `findAllByText` es la consulta correcta; el síntoma fue confuso (waitFor reintenta los multi-match hasta el timeout y reporta «Unable to find»).

### Remaining tasks at U11 completion

En ese cierre, U12–U13 estaban sin marcar (9 tareas). U12 se completó en la sección siguiente; U13 es ahora la próxima unidad, con 5 tareas pendientes.

### Workload / PR boundary

- PR 11 = U11 only, branch `u11-audio-music` → `main` (stacked-to-main, user-confirmed; sin push/PR por este ejecutor — el orquestador los posee).
- Diff de esta sesión + trabajo recuperado en UN commit (contrato del intento). Authored ≈ 1,290 líneas (recuperadas ≈ 640: db/musicStore/settingsStore/duckGain+tests; esta sesión ≈ 650: player 200 + controller 120 + UI 260 + copy/toast 60 + fakes 50; tests 13+9+9 incluidos). Por encima del presupuesto 400 — misma postura que U3–U10: los tests cubren los 8 escenarios literales del spec audio + «Music follows the recomputed phase» del HARD GATE + carreras/degradación. Forecast por-unidad «High»; ruta auto-chain resuelta. Dentro del presupuesto del intento (2500). Se reporta para el chequeo de tamaño del orquestador.

### Structured status consumed

- `applyState: ready` (58/71 complete al iniciar el intento; el estado nativo listaba las 13 líneas restantes incluyendo U12/U13 — este ejecutor implementó SOLO las 4 de U11 bajo su slice asignado), `actionContext.mode: repo-local`, edit roots `[workspace root]`, no warnings. Review Workload Forecast: decisión ya resuelta esta sesión (auto-chain, stacked-to-main) — sin bloqueo de puerta.

---

## U12 — PWA I: manifest + service worker + offline smoke (three delivery PRs)

**Branch**: `u12-pwa` (from `main` @ `6b65f49`). Strict TDD remains active (`pnpm test` = Vitest run). Runtime attempt authority remains external and is not recorded here.

**Status: COMPLETE; delivery split pending.** The four U12 implementation checkboxes are complete in `tasks.md`; user declined the 789-line `size:exception`, so delivery is three chained review slices: **issue #12 manifest + assets (224 LOC)**, **issue #13 worker + production smoke (381 LOC)**, and **issue #14 no-SW degradation + U12 evidence (~202 LOC)**. GitHub issue and PR numbers share a sequence, so each PR number is recorded only after creation. U13 remains the only unfinished implementation unit.

### Delivery slices

- **PR 12 / issue #12 — manifest + launcher assets:** `src/app/manifest.ts`, `manifest.test.ts`, `scripts/generate-icons.mjs`, and the three PNGs. It is self-contained at 224 lines and deliberately makes no offline claim.
- **PR 13 / issue #13 — worker + production smoke:** `next.config.ts`, `src/app/sw.ts`, `/offline`, navigation prefetch posture, Playwright/Vitest configuration, and `tests/offline.spec.ts`. It is 381 lines and depends on PR 12 because the smoke exercises the manifest/icons.
- **PR 14 / issue #14 — no-SW degradation + evidence:** `capabilities.ts`, its persistence tests, U12 task state, and this evidence record. It is about 202 lines and completes U12's progressive-degradation proof.

The split was chosen rather than a `size:exception`; each reviewable behavior keeps its proof. The runtime U12 attempt remains one cohesive implementation objective and will be settled only after the complete three-slice delivery is committed.

### TDD and offline evidence

| Phase | Evidence |
| --- | --- |
| RED | The first production smoke exposed two actual App Router cache gaps: the worker did not yet control initial route warm-up, and the later `router.push("/clasico")` required a distinct RSC response. The test failed until both were covered. |
| GREEN | Added the Metadata API manifest, 192/512/maskable PNG assets, Serwist `defaultCache` worker and `/offline` fallback, production registration, no-service-worker detection, and the dedicated production Playwright runner. |
| TRIANGULATE | The smoke waits for service-worker control, warms document routes, `/manifest.webmanifest`, and the exact client-side Clásico transition before going offline. It proves hard navigations, an end-to-end offline workout and history entry, cached manifest/icons, a never-visited-route fallback, and zero failed requests. |
| REFACTOR | `reloadOnOnline: false` protects the non-persisted active workout from an automatic reconnect reload. Navigation links opt out of speculative prefetch because an offline fallback cannot satisfy uncached speculative RSC requests; explicit navigation remains covered by the smoke. |

### Final verification

- `pnpm test` → **40 test files / 418 tests passed**. jsdom prints existing `HTMLMediaElement.pause()` notices only.
- `pnpm lint` → no errors; one pre-existing warning in `src/lib/storage/persisted.test.ts:161` (`_set` unused), outside U12.
- `pnpm exec tsc --noEmit` → exit 0.
- `pnpm test:offline` → **1 Playwright production smoke passed**, after `next build && next start`.
- Icon inspection confirms deterministic RGBA PNGs at 192×192, 512×512, and 512×512 maskable. Generated `public/sw.js` remains ignored.

### Delivered files and decisions

- `src/app/manifest.ts` + `manifest.test.ts`: standalone Spanish identity, Gentleman colors, standard/maskable icons, and progressive mode shortcuts.
- `public/icons/*` + `scripts/generate-icons.mjs`: deterministic, dependency-free icon generation.
- `src/app/sw.ts`, `src/app/offline/page.tsx`, `next.config.ts`: Serwist default App Router caching, precached offline fallback, development disablement, and no forced reconnect reload.
- `tests/offline.spec.ts`, `playwright.config.ts`, `vitest.config.ts`: production-only R5 smoke, browser base URL, and Vitest isolation from Playwright specs.
- `src/lib/pwa/capabilities.ts` + test: lazy SSR-safe service-worker detection and online local persistence coverage without service-worker support.
- `src/components/layout/NavBar.tsx`: no speculative RSC prefetch while an offline fallback is active.

`@serwist/sw` v9.5.12 exposes the deprecated-but-supported `installSerwist` helper rather than the class named in the design sketch. It remains the exported installation API; TypeScript emits a deprecation hint only. No custom `NetworkFirst` rule was necessary: `defaultCache` already has the correct App Router document/RSC split, and the remaining issue was the evidence-driven warm-up order and exact client transition.

### Next unit

After PRs 12–14, U13 — PWA II: capability integrations (5 tasks) remains pending.
