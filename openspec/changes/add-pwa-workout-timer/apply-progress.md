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
