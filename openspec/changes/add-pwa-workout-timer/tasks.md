# Tasks — add-pwa-workout-timer

- **Change**: `add-pwa-workout-timer` — greenfield offline-first workout interval timer PWA ("Tip Tap Workout")
- **Phase**: tasks (implementation breakdown)
- **Direct input**: `design.md` §12 work-unit breakdown (U1–U13) — honored 1:1; testing strategy §11; contracts appendix; rollout hooks §14
- **Spec coverage**: all 9 domains (40 requirements, 79 scenarios) mapped per unit below; `timer-correctness` is the HARD GATE
- **TDD mode**: strict RED→GREEN→TRIANGULATE→REFACTOR with colocated tests for every unit after U1 (`openspec/config.yaml`); U1 is RED-exempt scaffold and MUST end with a runner smoke test
- **Orchestrator notes honored**: dev-only stack additions `@playwright/test` (service workers cannot run in jsdom) and `fake-indexeddb` (jsdom lacks IndexedDB) are carried explicitly in U1; U1 must flip `testing.installed: true` in `openspec/config.yaml` with actual evidence

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | ≈3,950 authored (design §12 sum) + generated scaffold/shadcn/icon files; raw total well over 4,000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (U1) → PR 2 (U2) → PR 3 (U3) → PR 4 (U4) → PR 5 (U5) → PR 6 (U6) → PR 7 (U7) → PR 8 (U8) → PR 9 (U9) → PR 10 (U10) → PR 11 (U11) → PR 12 (U12) → PR 13 (U13) |
| Delivery strategy | auto-chain (user-confirmed) |
| Chain strategy | stacked-to-main (user-confirmed) |

```text
Decision needed before apply: RESOLVED this session
Chained PRs: YES — 13 PRs, one per unit, each targeting the previous branch (stacked-to-main)
Generated-file diffs (U1 create-next-app, U2 shadcn components): scaffold-diff accepted — light review on generated output; formal review focus on configuration and authored code. NOT a size:exception.
Baseline: repo has remote (github.com:Daryhen-Dev/workouts) and zero commits — apply starts with a baseline commit of .gitignore/openspec/ on main, then PR 1 branches from it.
400-line budget risk: High (authored ≈3,950 total; per-unit 300–350)
```

Rationale: total change is ≈10× the 400-line budget, and every adjacent unit pair sums to 550–650+ authored lines, so no pairing fits. Each unit is an autonomous slice (clear start state, finished state, colocated verification, `git revert`-able rollback) and maps to exactly one chained PR. Delivery decisions confirmed by the user: stacked-to-main chain with scaffold-diff acceptance; `size:exception` remains available per-unit if apply projections overrun.

### Per-unit budget risk

| Unit | Est. lines | Unit-alone PR risk | Notes |
| ------ | ----------- | -------------------- | ------- |
| U1 Scaffold | ~150 authored | Medium | RED-exempt; raw diff inflated by create-next-app/shadcn generated files |
| U2 Tokens + shell | ~250 | Medium | shadcn generated components add to raw diff |
| U3 Plan compiler | ~300 | Low | pure module + tests |
| U4 Engine + clock | ~350 | High | HARD GATE test matrix can inflate |
| U5 Config screens | ~300 | Medium | two screens + form components |
| U6 Builder | ~300 | Medium | builder components |
| U7 Session store + screen | ~350 | High | controller orchestration breadth |
| U8 Completion + history | ~350 | High | store + query layer + 2 screens |
| U9 Routines | ~300 | Medium | store + screens + dialogs |
| U10 Audio I (beeps) | ~300 | Medium | pure planner dominates |
| U11 Audio II (music) | ~350 | High | IDB + player + ajustes UI |
| U12 PWA I (manifest+SW) | ~300 | Medium | icons are binaries (no line cost); smoke spec |
| U13 PWA II (capabilities) | ~350 | High | 6 modules + wiring + degradation smoke |

### Dependency order

- Linear apply order: **U1 → U2 → U3 → U4 → U5 → U6 → U7 → U8 → U9 → U10 → U11 → U12 → U13** (design §12).
- Hard edges: U3→U4→U7; U5/U6 need U2+U3; U8–U11, U13 need U7; U12 needs U1 (Playwright) and, for its full-session smoke steps, U5/U7/U8 behavior; U13 needs U11 (`settingsStore` fields).
- `ask-on-risk` trigger: any unit projected to exceed 400 authored lines, or any PR whose raw diff (including generated files) would balloon — pause and ask before proceeding; do not shrink tests/docs to fit.

---

## U1 — Scaffold (RED-exempt) — PR 1

**Contents**: Next.js 15 app, pnpm, TS strict, Tailwind v4, App Router, `src/` dir; shadcn init; runtime + dev deps; Vitest/RTL/jsdom + **fake-indexeddb + @playwright/test** (dev-only); `vitest.config.ts`, `playwright.config.ts`, `src/test/setup.ts`.
**Acceptance hooks**: `openspec/config.yaml` scaffold rule (RED-exempt + runner smoke); enables every later unit. No spec scenarios directly.

- [x] Scaffold the app with `pnpm create next-app` (TypeScript strict, Tailwind v4, App Router, `src/` directory, pnpm) and verify `pnpm build` and `pnpm dev` succeed on the fresh template. <!-- sdd-owner: implementation -->
- [x] Run `shadcn` init (CSS-variables wiring only); the 14-component inventory (design §9.3) is added per-unit as consumed so generated code lands with its consumer. <!-- sdd-owner: implementation -->
- [x] Install runtime deps: `zustand`, `react-hook-form`, `zod`, `@serwist/next`, `@serwist/sw`, `idb`, `lucide-react`. <!-- sdd-owner: implementation -->
- [x] Install dev-only deps — explicit orchestrator carry-over: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, **`fake-indexeddb`** (jsdom has no IndexedDB — music-store tests), **`@playwright/test`** (jsdom cannot host service workers — offline smoke). <!-- sdd-owner: implementation -->
- [x] Create `vitest.config.ts` (jsdom environment, `@` → `src/` alias, setup file) and `src/test/setup.ts` (jest-dom, RTL cleanup, navigator-stubbing helper starting point); add script `"test": "vitest run"` (non-watch, CI-safe). <!-- sdd-owner: implementation -->
- [x] Create `playwright.config.ts` (chromium-only, `webServer` running `pnpm build && pnpm start`) and script `"test:offline": "playwright test"` (the spec file itself lands in U12). <!-- sdd-owner: implementation -->
- [x] React Compiler decision stays inside this unit: enable `experimental.reactCompiler` in `next.config.ts`; on any tooling conflict drop the flag and keep the no-manual-memoization discipline (design §13); record the outcome. <!-- sdd-owner: implementation -->
- [x] Runner smoke test: add one trivial passing test proving `pnpm test` executes `vitest run` (e.g. `src/app/page.test.tsx` asserting the template renders); capture the command output as evidence. <!-- sdd-owner: implementation -->
- [x] Update `openspec/config.yaml` non-destructively (extend, do not rewrite): `testing.installed: true`, `status: installed`, and the actual runner evidence its `install_note` requires. <!-- sdd-owner: implementation -->

## U2 — Tokens + shell — PR 2

**Contents**: `src/app/globals.css` (@theme + shadcn aliases), `src/app/layout.tsx`, fonts, `src/components/layout/AppShell.tsx` + `NavBar.tsx`, `src/components/shared/StoreHydrationGate.tsx`, `src/components/shared/copy.ts`.
**Acceptance hooks**: ui-design — "Tokens drive the theme", "Single skin, no switcher"; copy foundation for the "Copy audit" scenario.

- [x] RED: `src/components/layout/AppShell.test.tsx` — brand "Tip Tap Workout" renders, bottom tabs Inicio/Rutinas/Historial/Ajustes render, `color-scheme: dark` is declared, and no theme/skin switcher control exists anywhere. <!-- sdd-owner: implementation -->
- [x] RED: `src/components/shared/StoreHydrationGate.test.tsx` — skeleton renders until a dummy persisted store reports hydrated, then children render. <!-- sdd-owner: implementation -->
- [x] GREEN: `globals.css` with the exact Gentleman `@theme` tokens and shadcn semantic aliases from design §9.1 (`--color-base: #1a1218`, accent `#f095c8`, radii, dark-only) plus `:root { color-scheme: dark }`; fonts via `next/font/google` Inter + JetBrains_Mono (Iosevka Term as local fallback only). <!-- sdd-owner: implementation -->
- [x] GREEN: server `layout.tsx` (`<html lang="es">`, fonts, AppShell, hydration gate) + `AppShell`/`NavBar` (mobile bottom tab bar collapsing into the header on wide screens; `/sesion` chrome-minimal opt-out) + client `StoreHydrationGate` calling `persist.rehydrate()` in an effect. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: `copy.ts` with `MODE_LABEL` mapping ids → verbatim Spanish names (Clásico, Tabata, Personalizado) and centralized Spanish copy constants; copy spot-check test asserts verbatim mode names and a background-promise string allowlist extended by later units. <!-- sdd-owner: implementation -->
- [x] REFACTOR: enforce the §2.3 server/client boundary — shells stay server components; interactivity lives in single client entry components. <!-- sdd-owner: implementation -->

## U3 — Timer core I: types + plan compiler — PR 3

**Contents**: `src/lib/timer/types.ts`, `src/lib/timer/plan.ts`, `src/lib/validation/configSchemas.ts`. Pure — no React, no browser APIs.
**Acceptance hooks**: timer-modes — "Two-round sequence", "Single-round session has no rest phase", "Two tabatas with long rest", "Long rest replaces short rest", "Mixed sequence runs block by block", "Block values are independent", "No rest stacking at block boundaries", "No global rest after the final block" (plan-level reorder and empty-sequence schema rejection included).

- [x] RED: `src/lib/timer/plan.test.ts` — Clásico (10/30/15, 2 rondas) produces the exact phase kind/duration/offset array totaling 85 s; 1 ronda produces no descanso at all. <!-- sdd-owner: implementation -->
- [x] GREEN: `src/lib/timer/types.ts` exactly per design §3.1 (as-const `PHASE_KIND`/`MODE`/`SESSION_STATUS`, flat interfaces, `Clock`) + `src/lib/timer/plan.ts` `compilePlan` for Clásico. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: Tabata (10/20/10/2 rondas/2 tabatas/60 largo) → exact 170 s sequence; descanso largo replaces (never stacks on) short rest; Personalizado mixed blocks with descanso global between consecutive blocks only, never after the final block, no block-internal trailing rest; block value independence; contextual labels ("Tabata 2 · Trabajo", "Bloque 2 · Trabajo", "Descanso largo", "Descanso global"). <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: `src/lib/validation/configSchemas.ts` (zod, Spanish messages) — rejects zero, negative, non-numeric, and non-integer durations/counts; Personalizado requires at least one block and validates descanso global under the same rules. <!-- sdd-owner: implementation -->
- [x] REFACTOR: shared block-flattening helpers; module stays pure and framework-free. <!-- sdd-owner: implementation -->

## U4 — Timer core II: engine + clock (HARD GATE core) — PR 4

**Contents**: `src/lib/timer/engine.ts`, `src/lib/timer/clock.ts` (`systemClock`, `createFakeClock`).
**Acceptance hooks**: timer-correctness — Wall-Clock Truth scenarios: "Return from background mid-phase", "Return from tab switch across a phase boundary", "Sleep/resume across multiple boundaries", "Session completes while suspended" (engine view), "Paused sessions do not consume time while suspended", "Full-session drift is imperceptible"; Session Controls arithmetic (pause freezes, resume continues).

- [x] RED: `src/lib/timer/engine.test.ts` with `createFakeClock` — `startSession` → `computeView` yields the running phase/remaining; pausing freezes remaining across clock advances; resuming continues the same phase to completion in wall-clock terms. <!-- sdd-owner: implementation -->
- [x] GREEN: `engine.ts` (`startSession`/`pauseSession`/`resumeSession`/`computeView`) implementing the §3.3 anchor arithmetic (`elapsedActiveMs = accumulatedActiveMs + (now − runningSince)`, boundary find, frozen-while-paused view) + `clock.ts`. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE — HARD GATE: all five suspension scenarios expressed literally with the fake clock: background 5 s mid-trabajo → 15 s remaining; tab-switch 50 s → final trabajo 15 s; sleep 120 s → exact schedule position; suspension past the end → completed view with `phase = null`; paused 2 min suspension → still 20 s. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: 85 s session stepped in 100 ms increments → every transition observed within 1 s of scheduled time, elapsed within 1 s of 85 s; completion idempotent for any later `now`; `displaySeconds = ceil(remainingMs/1000)` shows full value at phase entry and 0 at the boundary. <!-- sdd-owner: implementation -->
- [x] REFACTOR: extract the boundary-find helper; confirm zero React imports and zero browser APIs in the module. <!-- sdd-owner: implementation -->

## U5 — Config screens: Clásico / Tabata — PR 5

**Contents**: `src/app/page.tsx` + `HomeScreen`, `src/app/clasico/page.tsx`, `src/app/tabata/page.tsx`, config screens, `src/components/forms/DurationField.tsx`, `ValidatedNumberInput.tsx`.
**Acceptance hooks**: timer-modes — "Valid configuration starts a session", "Invalid values block the start", "Valid Tabata configuration", "Mode Selection: all modes reachable" (personalizado route completes in U6).

- [ ] RED: `src/components/forms/ClasicoConfigScreen.test.tsx` and `TabataConfigScreen.test.tsx` — trabajo set to 0 (and each other invalid class: negative, non-numeric, non-integer) shows a visible Spanish validation message and start does not fire; valid values fire start with the exact config. <!-- sdd-owner: implementation -->
- [ ] GREEN: screens with react-hook-form + zodResolver over `configSchemas`, `DurationField` stepper (whole seconds) and `ValidatedNumberInput`; "Iniciar" calls `sessionStore.start(config)` and navigates to `/sesion` (sessionStore mocked in tests — the mock encodes the contract implemented in U7). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: Tabata's six fields validate under the identical rules and start a session with exact values. <!-- sdd-owner: implementation -->
- [ ] GREEN: home surface — server `src/app/page.tsx` shell + client `HomeScreen` with mode cards labeled verbatim Clásico / Tabata / Personalizado, each navigating to its configuration screen (quick-routines slot stubbed until U9; install nudge until U13). <!-- sdd-owner: implementation -->
- [ ] REFACTOR: shared form-field components; each route keeps exactly one client entry component (§2.3). <!-- sdd-owner: implementation -->

## U6 — Personalizado builder — PR 6

**Contents**: `src/app/personalizado/page.tsx`, `src/components/builder/PersonalizadoBuilder.tsx`, `BlockCard.tsx`, `BlockList.tsx`, `AddBlockMenu.tsx`, `ReorderControls.tsx`.
**Acceptance hooks**: timer-modes — builder scenarios: "Mixed sequence runs block by block" (UI→plan), "Block values are independent", "Reordering changes execution order", "Empty sequence is rejected"; completes "All modes reachable".

- [ ] RED: `src/components/builder/PersonalizadoBuilder.test.tsx` — starting with zero blocks shows a visible Spanish error and no session starts. <!-- sdd-owner: implementation -->
- [ ] GREEN: builder state and UI — add a Clásico or Tabata block, remove a block, reorder (move up/down); each block's values are independent form state (two blocks with different trabajo values stay independent). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: reordering changes the compiled execution order (assert against `compilePlan` output at submit); descanso global field validates like all durations; "Iniciar" submits the full `PersonalizadoConfig` to `sessionStore.start` and navigates `/sesion`; route shell `src/app/personalizado/page.tsx` renders. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: reuse U5 field components inside `BlockCard`; keep builder components composable. <!-- sdd-owner: implementation -->

## U7 — Session store + active screen + controller — PR 7

**Contents**: `src/stores/sessionStore.ts` (ephemeral), `src/features/session/SessionController.tsx` + `useSessionController.ts`, `src/app/sesion/page.tsx`, `src/components/timer/ActiveSessionScreen.tsx`, `TimeDisplay`, `PhaseRing`, `Controls`, `NextPhaseHint`.
**Acceptance hooks**: timer-correctness — "Session Controls" (all three scenarios, component level), HARD GATE component scenarios (background/tab-switch/sleep/paused-suspension via injected clock), honest-boundary copy; workout-completion — "Manual Stop Discards the Session" scenarios (session-scoped part: no summary path, no entry, confirmation dialog).

- [ ] RED: `src/stores/sessionStore.test.ts` — start/pause/resume/stop/refreshView map 1:1 to engine functions with an injected fake clock; cached `SessionView` updates on refresh; store is not persisted. <!-- sdd-owner: implementation -->
- [ ] GREEN: `sessionStore` (engine wrapper + view cache + injected `Clock`) + `src/app/sesion/page.tsx` shell + `ActiveSessionScreen` rendering phase label, `TimeDisplay` countdown, `PhaseRing` conic-gradient progress, `NextPhaseHint`, and `Controls` (pause/resume/stop). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE — HARD GATE at component level (fake clock through the store, `visibilitychange` fired): background 5 s → trabajo 15 s remaining; tab-switch 50 s → final trabajo 15 s; sleep 120 s → exact schedule position; paused-suspension return → still 20 s and still paused. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: `SessionController` — 250 ms ticker only while running and visible (fake timers); `visibilitychange` triggers immediate `refreshView()`; phase-index observer applies the visual transition flash class; completion observer fires exactly once on the status transition to completed (across re-renders); stop opens the `AlertDialog` "¿Descartar la sesión?" and confirming discards — store reset, navigate home, no summary, no entry. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: `/sesion` renders chrome-minimal (tab bar hidden per §2.4); timer-screen copy contains no background-execution promises (copy.ts allowlist). <!-- sdd-owner: implementation -->
- [ ] REFACTOR: controller stays a thin effects orchestrator (§3.5) — all arithmetic remains in the engine; observers extracted for reuse by U8/U10/U11/U13. <!-- sdd-owner: implementation -->

## U8 — Completion + history — PR 8

**Contents**: `src/lib/storage/persisted.ts`, `src/lib/validation/persistedSchemas.ts`, `src/stores/historyStore.ts`, `src/lib/history/query.ts`, `src/app/resumen/page.tsx` + `CompletionSummary`, `src/app/historial/page.tsx` + `HistoryScreen`/`FiltersBar`/`StatsCards`/`EntryList`.
**Acceptance hooks**: workout-completion — "Natural Completion Summary" (incl. "Paused time is excluded from duration"), "History Entry on Natural Completion", "Stopped session leaves no record" (cross-check); history — all scenarios (record fields, period filter ×2, type filter, filters compose, stats ×2); timer-correctness — "Session completes while suspended" full path; local-data — history survives reload.

- [ ] RED: `src/lib/storage/persisted.test.ts` — v1 round-trip via `createValidatedPersist`; corrupt/unknown JSON falls back to zod-parsed defaults without throwing; future version takes the ordered migration path. <!-- sdd-owner: implementation -->
- [ ] GREEN: `createValidatedPersist` (zustand persist with `version`, ordered `migrate`, safeParse fallback, `partialize`, `skipHydration: true`) + `persistedSchemas.ts` defining the full v1 on-disk shapes (routines, history, settings — including U11/U13 fields to avoid version churn). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: `src/lib/history/query.test.ts` — `filterEntries` narrows by period (últimos 7 días, últimos 30 días, toda la historia), by type (todas + each mode), and composes both; `computeStats` returns count/total/average and zeros for the empty set. <!-- sdd-owner: implementation -->
- [ ] RED→GREEN: `historyStore` (persisted v1, `addEntry` only) + completion-observer wiring in `SessionController`: natural completion (foreground detection or recomputed after suspension) adds exactly one entry with the history-spec fields (mode-appropriate effort counts, measured `activeDurationMs` within 1 s, completion date) and navigates to `/resumen`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: `/resumen` renders the newest entry — mode, rondas/bloques, total duration showing 85 s (not 115 s) when a 30 s pause occurred; `/historial` renders `FiltersBar`, `StatsCards` with Spanish labels ("X sesiones · tiempo total · duración media"), and `EntryList` with mm:ss/h:mm:ss durations and `Intl.DateTimeFormat("es")` dates; hydration skeletons show until `StoreHydrationGate` completes. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: all filtering/stats stay pure in `lib/history/query.ts`; screens only render selectors. <!-- sdd-owner: implementation -->

## U9 — Routines — PR 9

**Contents**: `src/stores/routinesStore.ts`, `src/app/rutinas/page.tsx`, `src/components/routines/RoutinesScreen.tsx`, `RoutineCard.tsx`, `SaveRoutineDialog.tsx`, `RenameDialog.tsx`; save hooks on the three config screens; HomeScreen quick-routines slot.
**Acceptance hooks**: routines — all scenarios ("Save a Clásico routine", "Empty name rejected", "Duplicate names never silently overwrite", "Personalizado routine keeps the full sequence", "Start directly from the list", "Routines survive reload", "Rename preserves configuration", "Delete removes only the routine"); local-data — routines part of "Everything survives a reload".

- [ ] RED: `src/stores/routinesStore.test.ts` — save/list with name + mode; empty name rejected; duplicate name never silently overwrites (explicit overwrite-confirm branch); rename preserves configuration; delete removes only the targeted routine; persistence round-trip across rehydrate. <!-- sdd-owner: implementation -->
- [ ] GREEN: `routinesStore` (persisted v1 via `createValidatedPersist`) + `/rutinas` screen (list with name and mode) + `SaveRoutineDialog`/`RenameDialog` with Spanish validation and explicit overwrite confirmation. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: "Guardar rutina" available on Clásico, Tabata, and Personalizado screens; a saved Personalizado routine round-trips the full sequence (save → load → `compilePlan` equality including descanso global); starting directly from the list calls `sessionStore.start(routine.config)` and navigates `/sesion` with exact values. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: delete isolation — deleting one routine leaves other routines and all history entries untouched (store-level assertion now; music-store isolation re-asserted in U11); HomeScreen quick-routines slot lists saved routines and starts them directly. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: share dialog/name-validation logic between save and rename. <!-- sdd-owner: implementation -->

## U10 — Audio I: in-memory beeps — PR 10

**Contents**: `src/lib/audio/context.ts`, `src/lib/audio/cues.ts`, `src/lib/audio/beepSynth.ts`, `stubAudioContext` in `src/test/fakes.ts`.
**Acceptance hooks**: audio — "Last-three-seconds convention", "Short phase", "No Web Audio, no failure"; duck-event foundation for U11's "Duck and restore".

- [ ] RED: `src/lib/audio/cues.test.ts` — `planPhaseCues` for a 5 s phase yields countdown cues at remaining 3, 2, 1 s plus a transition cue at the boundary; a 2 s phase yields cues at 2 and 1 s then the transition cue; `duckEventsFor` brackets every cue with duck-down and ramp-back events. <!-- sdd-owner: implementation -->
- [ ] GREEN: `cues.ts` (pure active-time planner) + `context.ts` (lazily created singleton `getAudioContext()`, `null` when Web Audio is absent, best-effort `resumeIfSuspended()`) + `beepSynth.ts` (active-ms → `AudioContext.currentTime` conversion via the session anchor, oscillator/gain envelope scheduling, cancel + re-schedule API, no-op on `null` context). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: `stubAudioContext` fakes — beeps scheduled at exact context-clock times; countdown and transition cues acoustically distinct (different frequency + double blip); cancellation on pause; re-schedule on resume and on visibility return, dropping cues now in the past. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: full session with `AudioContext` deleted completes normally with summary and history entry and no crash (audio "No Web Audio, no failure" scenario, end-to-end). <!-- sdd-owner: implementation -->
- [ ] REFACTOR: keep the pure-planner / impure-synth split strict; confirm zero bundled audio assets in the repo. <!-- sdd-owner: implementation -->

## U11 — Audio II: music import, storage, playback — PR 11

**Contents**: `src/lib/storage/db.ts`, `src/lib/storage/musicStore.ts`, `src/lib/audio/duckGain.ts`, `src/lib/audio/musicPlayer.ts`, `src/stores/settingsStore.ts`, `src/app/ajustes/page.tsx` + `MusicLibrary`/`TrackAssigner`, controller music wiring.
**Acceptance hooks**: audio — "Import persists across reload", "Assignment per phase kind", "Loop during a long phase", "Transition switches tracks", "Pause and resume with the timer", "Duck and restore", "Quota exceeded", "Undecodable file"; timer-correctness — "Music follows the recomputed phase"; local-data — music persistence and offline import.

- [ ] RED: `src/lib/storage/musicStore.test.ts` (fake-indexeddb) — import persists trackMeta + blob in a single transaction and `list()` returns metadata only; `getObjectUrl` resolves; simulated quota (injected `put` stub) throws `MusicImportError { code: "quota" }` leaving the library unchanged with no partial file; non-audio MIME, probe error, and 10 s probe timeout throw `{ code: "undecodable" }`. <!-- sdd-owner: implementation -->
- [ ] GREEN: `db.ts` (`openDB("tiptap-workout")` v1, stores `trackMeta` + `trackBlobs`) + `musicStore.ts` import pipeline (MIME check → playability probe → atomic single-tx write) + `duckGain.ts` (gain automation driven by `duckEventsFor`) + `musicPlayer.ts` (single long-lived audio element wired via `createMediaElementSource` → duckGain; loops per phase; pauses/resumes with the timer; on track switch stops outgoing, starts incoming from 0, revokes the swapped object URL). <!-- sdd-owner: implementation -->
- [ ] GREEN: `settingsStore` (persisted v1) with per-phase-kind assignments (all five kinds, `TrackId | null`), `notificationsOptIn`, and `installNudgeDismissedAt` (full v1 shape defined now for U13); `removeTrack` clears any assignment referencing the removed track (orphan cleanup). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: `/ajustes` — `MusicLibrary` (File API picker import, list, remove) and `TrackAssigner` (assign per phase kind); quota and undecodable failures surface as Spanish sonner toasts ("No hay espacio suficiente…", "El archivo no se pudo leer como audio"), library untouched, running sessions unaffected (import lives only on `/ajustes`). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: playback behavior — track loops through a phase longer than the track; phase change stops outgoing and starts incoming assigned music (unassigned → silence except beeps); pause/resume preserves playback position; countdown beeps duck and restore music volume; after suspension the music playing is that of the recomputed current phase (controller re-target on `visibilitychange`; completed → completion path). <!-- sdd-owner: implementation -->
- [ ] REFACTOR: keep IndexedDB strictly behind the `MusicStore` interface; the player owns exactly one active object URL. <!-- sdd-owner: implementation -->

## U12 — PWA I: manifest + service worker + offline smoke — PR 12

**Contents**: `src/app/manifest.ts`, `public/icons/` (192, 512, maskable-512), `src/app/sw.ts`, `next.config.ts` withSerwist, `src/app/offline/page.tsx`, `tests/offline.spec.ts`, `.gitignore` for `public/sw.js`.
**Acceptance hooks**: pwa — "Manifest is valid", "Full offline session after first load", "No service worker support", "Shortcuts where supported, absent harmlessly elsewhere"; local-data — "Offline end-to-end"; closes design risk R5 by evidence.

- [ ] RED (offline runner): write `tests/offline.spec.ts` per design §8.3 — warm `/` and every route online asserting `navigator.serviceWorker.ready` and each Spanish heading; then `context.setOffline(true)`; hard-navigate each route; client-side navigate home → config → start; run a full offline Clásico session (preparación 1 s, trabajo 2 s, descanso 1 s, 1 ronda) to completion asserting `/resumen` shows mode + rondas + duration and history contains exactly one entry; assert `/manifest.webmanifest` and both icons return 200 from cache; assert no unhandled request failures. <!-- sdd-owner: implementation -->
- [ ] GREEN: `src/app/manifest.ts` (name "Tip Tap Workout", short_name "Tip Tap", start_url "/", standalone, colors, 192 + 512 + maskable icons, shortcuts to `/clasico`, `/tabata`, `/personalizado`); commit the three PNG icons to `public/icons/`; `src/app/sw.ts` (Serwist + `defaultCache` + `/offline` document fallback, `sw.js` filtered from precache); `next.config.ts` wrapped with `withSerwist` (disabled in development); `src/app/offline/page.tsx`; gitignore the `public/sw.js` build artifact. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: run `pnpm test:offline` against the production build and record the output; if any route/RSC case is uncached, add the single explicit `NetworkFirst` runtime rule from design §8.2 and re-run until green (R5 closed by evidence, not assumption). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: no-service-worker browsers — `hasServiceWorker()` false skips registration (feature-gated) and the app remains fully functional online with localStorage + IndexedDB persistence (unit test). <!-- sdd-owner: implementation -->

## U13 — PWA II: capability integrations — PR 13

**Contents**: `src/lib/pwa/capabilities.ts`, `wakeLock.ts`, `mediaSession.ts`, `vibration.ts`, `notifications.ts`, `badging.ts`, `install.ts`, `src/components/settings/InstallCard.tsx`, `NotificationsCard.tsx`; controller + HomeScreen wiring; final copy audit.
**Acceptance hooks**: pwa — "All capabilities unavailable", "Chromium install flow", "iOS manual path explained", "Lock held, re-acquired, released", "Unsupported platforms skip silently", "Lock-screen pause pauses the timer", "Beep-only degradation", "Paired cues on Android", "No-op on iOS", "Permission only from a gesture", "Foreground completion suppresses the OS notification", "Badge lifecycle on Chromium", "No badge elsewhere"; timer-correctness — "Copy does not overpromise"; ui-design — "Copy audit" complete.

- [ ] RED: `src/lib/pwa/capabilities.test.ts` plus per-module tests — every capability module (wakeLock, mediaSession, vibration, notifications, badging, install) is a silent no-op (no throw) when its browser API global is deleted; detection helpers evaluate lazily and never touch `navigator`/`window` at module top level (SSR-safe). <!-- sdd-owner: implementation -->
- [ ] GREEN: `capabilities.ts` detection registry + six modules exactly per the design §8.4 matrix: wakeLock (request on start running-or-paused, re-acquire on visibility return, AbortError re-request, release on end/unmount); mediaSession (metadata "Tip Tap Workout — {Mode}", play/pause/stop handlers, cleared on session end); vibration (transition pattern); notifications (permission only from the settings gesture, notify only on hidden completion, denied → no-op); badging (set on start, "II" when paused, clear on completion or stop); install (capture `beforeinstallprompt` + `prompt()`, stop offering after `appinstalled`, dismissible iOS Compartir → "Añadir a pantalla de inicio" guidance persisted via `settingsStore`). <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: controller wiring — session start acquires lock + badge + media-session handlers; every phase transition fires vibration on the same orchestrator tick as the transition cue and visual flash (pairing is structural); completion and stop release everything (badge cleared on both); foreground completion suppresses the OS notification; `InstallCard` (home + ajustes) and `NotificationsCard` opt-in Switch request permission only from the gesture. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: full degradation smoke (component test) — delete every capability global and `AudioContext`, then run a complete Clásico session end to end: summary shows and exactly one history entry is recorded (pwa hard scenario + audio no-Web-Audio scenario, combined). <!-- sdd-owner: implementation -->
- [ ] REFACTOR: final copy audit — the `copy.ts` allowlist test covers every screen: Spanish-only app-authored strings, verbatim mode names, zero background-execution promises. <!-- sdd-owner: implementation -->

---

## Coverage matrix (unit → spec domains satisfied)

| Domain | Covered by |
| -------- | ----------- |
| timer-correctness (HARD GATE) | U3, U4 (all arithmetic), U7 (controls + component gate), U8 (suspended completion), U11 (music follows recomputed phase), U13 (copy boundary) |
| timer-modes | U3 (sequences), U5 (config screens), U6 (builder), U2 (verbatim labels) |
| audio | U10 (beeps), U11 (music, import, ducking) |
| history | U8 |
| routines | U9 |
| local-data | U8/U9/U11 (reload persistence), U12 (offline end-to-end) |
| pwa | U12 (manifest, offline, no-SW, shortcuts), U13 (capabilities, install, degradation) |
| ui-design | U2 (tokens, single skin), U13 (copy audit complete) |
| workout-completion | U7 (stop discards), U8 (summary + exactly-one-entry) |

All 40 requirements / 79 scenarios are covered by at least one unit's acceptance hooks.
