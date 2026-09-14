# Proposal — add-pwa-workout-timer

- **Change**: `add-pwa-workout-timer` — greenfield offline-first workout interval timer PWA ("Tip Tap Workout")
- **Phase**: proposal (product intent, scope, and acceptance direction; no design decisions are made here)
- **Inputs**: `exploration.md` (feasibility, PWA capability matrix, risks R1–R6), `preproposal.md` (confirmed product decisions — not reopened), `openspec/config.yaml`, `openspec/context/workouts.md`
- **Decision provenance**: all four pre-proposal questions (music source, UI language, branding, skin scope) were confirmed by the user in the pre-proposal round. This proposal derives from those answers and does not reopen them.

## Why

This project builds **Tip Tap Workout** as a web-native successor to the existing Flutter app of the same name (<https://github.com/Daryhen-Dev/flutter_crono>): a workout interval timer that lives on the phone's home screen, works fully offline, and keeps 100% of its data on the device — now with zero backend and zero native packaging.

Two motivations, both confirmed:

1. **Practical**: the user needs the timer feature set (interval modes, routines, history, audio cues) available anywhere, including gyms with no connectivity, with local-only persistence matching the Flutter app's fully-local behavior.
2. **Learning goal (why this project exists)**: exercise real PWA capabilities on the modern web platform — installability, offline caching, Wake Lock, Media Session, Vibration, Notifications, and app badging — including deliberate, well-understood degradation on iOS. The platform divergence documented in exploration §5 is a subject of study, not a blocker.

Exploration's verdict stands behind this: the timer feature set is 100% web-feasible (§8); every PWA capability is a progressive enhancement with a defined fallback (§5.8).

## What Changes

Greenfield: the repository gains an entire installable web app. There is no existing behavior to preserve. User-visible result:

1. **Installable app "Tip Tap Workout"** — web app manifest (name, start URL, standalone display, 192px + 512px icons including a maskable variant, launcher shortcuts where supported), installable in-browser where the platform allows (Chromium-family prompt; iOS uses the manual Share → Add to Home Screen flow, which the UI explains), plus a service worker so the app loads and runs fully offline after first visit.
2. **Three timer modes** — UI copy entirely in Spanish; mode names keep Clásico / Tabata / Personalizado:
   - **Clásico**: preparation, work, and rest phases with configurable rounds.
   - **Tabata**: preparation, work/rest rounds per tabata, multiple tabatas, and long rest between tabatas.
   - **Personalizado**: a sequence builder combining Clásico and Tabata blocks, each block with independent values, plus a global rest between blocks.
3. **Timer controls and correctness** — pause, resume, and stop in every mode. Correctness is defined by **wall-clock truth**: after backgrounding, tab switching, or device sleep/resume, the app must show the phase and remaining time implied by real elapsed time, never by counted ticks. This is a product-level requirement (exploration R1 / §6.1); the timestamp-based mechanism that satisfies it is a design topic.
4. **Honest background behavior** — the app does not promise to keep timing audibly or visibly while the browser has suspended it. If the user backgrounds the app mid-workout and returns, the timer reflects true elapsed time (the workout progressed in wall-clock terms). This boundary is stated deliberately because native-app-style background execution is not achievable on the web.
5. **Completion summary** — a naturally completed workout records a local summary (mode, rounds/blocks, total duration) and a history entry. Default direction for spec: manually stopped workouts are discarded rather than recorded as partials.
6. **Audio** — countdown beeps generated in-memory via Web Audio (no audio assets ship with the app). Phase music comes from **user-provided audio files**, imported via the File API and stored locally (IndexedDB); music is assigned per phase, loops during its phase, pauses and resumes with the timer, and its volume ducks under countdown beeps. No bundled tracks, therefore no licensing exposure.
7. **Routines** — any mode configuration can be saved as a named routine and started directly later.
8. **History** — a log of completed sessions (timer type, rounds/blocks, duration, date), filterable by period and timer type, with summary stats (session count, total time, average duration).
9. **PWA capability layer** — each capability is a progressive enhancement with defined degradation (exploration §5):
   - **Offline caching** (service worker): the app is fully usable offline.
   - **Wake Lock**: the screen stays on during an active workout while the app is foregrounded; re-acquired on visibility changes; silently skipped where unsupported.
   - **Media Session**: lock-screen / hardware media controls map to pause/resume/stop while phase music is actually playing.
   - **Vibration**: on phase transitions where supported (Android-family); always paired with a beep and a visual change so transitions are never missed.
   - **Web Notifications**: available in installed-app contexts, permission requested from a user gesture; in-app UI remains the authoritative record of completion.
   - **App badging** (Chromium-family): capability demo (e.g., active/paused session flag).
10. **Single visual skin** — "Classic" skin styled with the Gentleman design tokens (single dark theme; exploration §4). Cyber Grid and Terminal skins are deferred.
11. **Everything local** — no backend, no accounts, no sync, no analytics. All data stays in browser storage on the device.

## Scope Boundaries and Non-Goals (v1)

Explicit non-goals (each stays out of v1 even though related):

- **GPS / running / location features** — confirmed exclusion; not partially built.
- **Additional timer skins** (Cyber Grid, Terminal) — a future change, not a v1 switch.
- **Bundled or licensed music** — the app ships no audio files of any kind (eliminates exploration risk R6).
- **Light mode** — single dark theme only.
- **Backend, accounts, sync, or sharing** — no network dependence beyond serving the app itself.
- **Data export/import** — out of v1 acceptance scope; the history data model may anticipate it but nothing ships.
- **i18n infrastructure** — Spanish copy only; no multi-language machinery.
- **Background-execution guarantees** — no attempt to keep the timer running (audio, notifications, or UI) while the platform has suspended the page; recomputation on return is the promise (see What Changes #4).
- **Native packaging** — this is a PWA, not a wrapper store build.

## Affected Areas

Greenfield — every area is new. The spec phase will formalize these as capability deltas:

| Area | Content |
| --- | --- |
| App scaffold | Next.js 15 App Router + TypeScript strict + Tailwind CSS v4 + shadcn/ui + pnpm; Vitest + React Testing Library + jsdom installed during apply (config: scaffold is RED-exempt, followed by a runner smoke test) |
| Timer engine | Client-side state machine for the three modes; timestamp-based correctness across pause/resume/stop and background suspension |
| Audio | Web Audio beep generation + gain-ducking; user-music import (File API), storage (IndexedDB), per-phase looped playback tied to timer state |
| Persistence | Routines, history, and settings via Zustand persistence (backend choice and schema versioning: design); music files in IndexedDB |
| PWA layer | Manifest + install affordances, service worker (Serwist is the candidate; confirm in design), capability integrations with per-platform degradation |
| UI surfaces (Spanish) | Mode configuration screens, Personalizado sequence builder, active-timer screen, completion summary, routines manager, history with filters/stats |
| Design system | Gentleman tokens mapped to Tailwind v4 `@theme` (dark-only) |
| Testing | Vitest + RTL from the first post-scaffold work unit; strict TDD per `openspec/config.yaml` |

## Risks

Product-level risks carried from exploration, plus how this proposal shapes them:

- **R1 Background timer suspension (top risk)** — shaped into two product requirements: wall-clock correctness on return (What Changes #3) and the explicit no-background-execution boundary (#4). Spec must include acceptance scenarios for returning from background mid-phase; design owns the timestamp-based engine; verify proves it with a TDD'd timer engine.
- **R2 Media Session anchor** — mitigated by the confirmed music decision: sustained audio exists whenever phase music plays, so lock-screen controls arise naturally. Residual degradation: beep-only sessions (no music imported) may not surface lock-screen controls; accepted for v1. A silent-audio-anchor workaround is a design option, not a requirement.
- **R3 iOS degradation** — no vibration, no badging, manual install, notifications gated on install, and 7-day eviction of script-writable storage for non-installed apps. Product answer: expectation-setting UI (an install nudge on iOS) and capability-aware behavior, not platform-fighting. Promoting install on iOS also protects the user's local data.
- **R4 Scaffold vs review budget** — the apply scaffold plus features cannot land as one unit under the 400-line budget. Tasks must be chunked into budget-sized units; `ask-on-risk` pauses the flow if a unit cannot be sized down. `size:exception` is never inferred.
- **R5 Serwist ↔ App Router caching** — RSC payload / runtime caching rules need design validation and an offline-navigation smoke test before any offline-first claim is treated as done.
- **R6 Music licensing** — resolved by decision: no bundled tracks, so the licensing gate is eliminated entirely.
- **New — IndexedDB quota for user music** — imported audio files are stored locally; large libraries can hit storage quota (notably on iOS). v1 acceptance requires graceful, visible failure on import (clear error, no silent data loss), not unlimited storage.

## Rollback

Greenfield with no released users and no migrations:

- Code: every delivery unit lands as reviewable commits; rollback of a unit or the whole change is `git revert` / branch removal.
- Data: only developer-device local storage exists; there is no production data-loss surface.
- Artifacts: `openspec/` artifacts (exploration, pre-proposal, proposal, and downstream) survive any code rollback and remain the record of decisions.

## Success Criteria

Product-level acceptance direction (the spec phase turns these into concrete scenarios):

1. **Feature completeness**: Clásico, Tabata, and Personalizado are each configurable, runnable, controllable (pause/resume/stop), and completable with a summary — in Spanish, Gentleman-styled, on the single Classic skin.
2. **Timestamp correctness (hard gate)**: for every mode and control path, displayed phase and remaining time equal wall-clock truth after backgrounding, tab switching, or sleep/resume; drift over a full session is imperceptible. This gates the change — exploration's top technical risk.
3. **Audio reliability**: countdown beeps fire on all supported platforms without any bundled assets; imported phase music loops per phase, pauses/resumes with the timer, and ducks under beeps; failed imports fail visibly.
4. **Routines**: any configuration can be saved, listed, and started directly.
5. **History**: completed sessions are recorded with type, rounds/blocks, duration, and date; filters by period and type work; stats show session count, total time, and average duration.
6. **PWA behaviors**: the app installs (in-browser prompt where available; manual path explained on iOS), loads and runs fully offline after first load (smoke-tested — R5), keeps the screen on during workouts via Wake Lock where supported, and every capability degrades without breaking the core timer loop.
7. **Local-only guarantee**: no bundled audio, no backend, no network calls carrying user data; all data remains in browser storage.
8. **Delivery discipline**: work units stay within the 400-line review budget; strict TDD is enforced from the first unit after the runner smoke test.

## Open Items Handed Downstream (not product questions)

- Exact acceptance scenarios per mode, control, and edge case — **spec**.
- Whether manually stopped sessions write any history record (default direction: no) — **spec**.
- Serwist vs hand-rolled service worker; Zustand persistence backend and schema versioning; Web Audio scheduling approach; timer engine internals; history data model — **design** (open decisions #1–#5 in `openspec/context/workouts.md`).
- Offline-navigation smoke test definition — **design/verify**.
