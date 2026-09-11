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
