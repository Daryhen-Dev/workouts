# Tip Tap Workout

**Tip Tap Workout** is a Spanish-language, offline-first interval timer PWA for phone-friendly training. It combines configurable **Clásico**, **Tabata**, and **Personalizado** workouts with local routines, completion history, synthesized countdown cues, user-imported music, and browser capabilities that enhance the experience without becoming requirements for the timer to work.

The core design principle is simple: **time comes from wall-clock anchors, not accumulated UI ticks**. When the browser resumes after a hidden tab, backgrounding, or device sleep, the app recomputes the workout state from elapsed time instead of trusting a delayed interval callback.

> **Privacy by design:** there are no accounts, backend, analytics, cloud sync, or bundled music. Workout data stays in the browser on the device.

## Contents

- [Quick start](#quick-start)
- [What you can do](#what-you-can-do)
- [Timing and session behavior](#timing-and-session-behavior)
- [Offline use, installation, and browser capabilities](#offline-use-installation-and-browser-capabilities)
- [Local data and privacy](#local-data-and-privacy)
- [Architecture](#architecture)
- [Routes](#routes)
- [Development and verification](#development-and-verification)
- [Implemented scope and traceability](#implemented-scope-and-traceability)
- [Platform boundaries and non-goals](#platform-boundaries-and-non-goals)
- [License](#license)

## Quick start

### Prerequisites

- **Node.js 22.13.0 or later.** The `pnpm@11.26.0` entry resolved in the lockfile requires Node.js `>=22.13`.
- **pnpm 11.x.** The project declares the compatible range `^11.3.0`; the lockfile resolves pnpm 11.26.0.

### Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
pnpm build
pnpm start
```

The service worker is intentionally disabled during development. Use the production build when validating offline behavior. In deployment, serve the app over HTTPS; browser installation, service-worker, notification, and similar PWA APIs require a secure context (localhost is suitable for local development).

## What you can do

### Configure three workout modes

| Mode | What it supports |
| --- | --- |
| **Clásico** | One preparation phase, configurable work/rest rounds, and no trailing rest after the final work phase. |
| **Tabata** | Preparation, configurable work/rest rounds per tabata, multiple tabatas, and long rests between tabatas. A long rest replaces the short rest at an inter-tabata boundary. |
| **Personalizado** | An ordered sequence of independent Clásico and Tabata blocks. Blocks can be added, removed, reordered, and separated by a configurable global rest. |

All three modes validate values before a workout starts and show a live compiled duration. The UI is intentionally Spanish-only and uses the labels **Clásico**, **Tabata**, and **Personalizado** verbatim.

### Run, pause, resume, or discard a session

- Pause freezes active workout time; resume continues from the same active-time position.
- A visible phase flash accompanies genuine phase transitions.
- A manual stop asks for confirmation, discards the in-progress workout, returns home, and does **not** create a completion summary or history record.
- Natural completion creates exactly one history entry and opens the summary screen.
- The active session is deliberately memory-only. Reloading the page or restarting the browser discards an in-progress workout.

### Save routines and inspect history

- Save a valid configuration from any of the three modes as a named routine.
- Start routines directly from the routines list or the quick-routines area on Home.
- Rename and delete routines.
- Duplicate routine names require explicit overwrite confirmation; nothing is silently overwritten.
- Review completed workouts by the last 7 days, last 30 days, or all time, optionally filtered by timer type.
- View statistics for the filtered history: session count, total active time, and average active duration.

A natural-completion entry records the mode, completion timestamp, active duration, and mode-specific effort data:

| Mode | Recorded effort data |
| --- | --- |
| Clásico | Configured round count |
| Tabata | Total completed work rounds and tabata count |
| Personalizado | Configured block count |

### Use countdown cues and your own music

- Countdown beeps are synthesized in the browser; no beep files are shipped.
- A phase gets cues for its final three seconds, or for every second when the phase is shorter than three seconds, plus a distinct transition cue at the boundary.
- Import browser-playable `audio/*` files from Settings.
- Assign music independently to preparation, work, rest, long-rest, and global-rest phases.
- When the browser allows playback, assigned tracks are requested to loop during their phase, pause and resume with the workout, and switch to the phase recomputed after the page becomes visible again.
- When a Web Audio context is available and resumes successfully, music is ducked around countdown and transition cues.
- Playback, audio-context recovery, and ducking are best-effort browser enhancements. Autoplay policy or platform audio failures can suppress them; workout timing is never derived from audio playback.
- Invalid/undecodable files and storage-quota failures are surfaced to the user. Music metadata and blobs are written atomically so a failed import does not leave a partial track behind.

## Timing and session behavior

The timer engine in [`src/lib/timer/`](src/lib/timer/) is pure and accepts the current time as an input. It does not depend on React or browser APIs.

```text
session state + current wall-clock time
                │
                ▼
         computed session view
         ├─ current phase
         ├─ remaining time
         ├─ next phase
         └─ completion state
```

This model has important consequences:

- Returning from a hidden tab, backgrounded browser, or device sleep recomputes the phase and remaining time immediately.
- Paused time is excluded from active workout duration.
- The 250 ms browser interval is a visual refresh driver only; it never accumulates workout time.
- A completed session reports its configured active duration, not elapsed pause or suspension time.

> **Honest browser boundary:** Tip Tap Workout does not promise that a browser will keep executing JavaScript, playing audio, or displaying notifications while it is suspended in the background. It promises correct wall-clock recomputation when execution resumes.

## Offline use, installation, and browser capabilities

### Offline PWA behavior

Production builds use Serwist to generate a service worker from [`src/app/sw.ts`](src/app/sw.ts). It precaches build assets and uses Next.js-aware runtime caching, with `/offline` as a document fallback.

The intended workflow is:

1. Visit the app and the routes you plan to use while online.
2. Let the service worker become active and cache the visited journey.
3. Use the warmed experience when connectivity is unavailable.

The browser smoke test exercises a real warmed offline journey: import a WAV file, assign it to work phases, save a Personalizado routine, take the browser offline, start that routine from Routines, complete it, and verify the summary and exactly one history entry.

This is deliberately more precise than claiming that every route works offline before it has ever been visited.

### Installation

The manifest provides standalone display, Spanish metadata, 192 px and 512 px icons, a maskable icon, and optional shortcuts for all three timer modes.

- Browsers that emit `beforeinstallprompt` can show the in-app install action.
- Recognized iPhone, iPad, and iPod user agents receive manual **Add to Home Screen** guidance.
- Installation affordances depend on browser and platform support; user-agent variants outside that detection are not guaranteed to receive the iOS guidance.

### Progressive browser capabilities

Every optional browser integration is isolated behind a lazy, SSR-safe adapter. Missing support and expected permission or promise-rejection paths are handled as best-effort enhancements; they do not define workout timing. Browser-specific synchronous failures are not a cross-platform guarantee, so no optional API should be treated as required for the core workflow.

| Capability | Implemented behavior | Fallback or boundary |
| --- | --- | --- |
| Service Worker | Production caching and offline fallback page. | Browsers without service-worker support still run the app online. |
| Screen Wake Lock | Requested during running and paused sessions, reacquired after a visible return or unexpected release, and released when the session ends. | Unsupported/rejected requests are silent no-ops. |
| Vibration | A short double-pulse pattern runs on real phase transitions. | The visual flash and audio cues remain when vibration is unavailable. |
| App Badging | A generic active-session badge is set for running and paused sessions, then cleared on completion, discard, or unmount. | No badge is shown where the API is unavailable. The badge does not distinguish paused state. |
| Media Session | Play, pause, and stop controls are registered only while the current phase has assigned music. | Beep-only workouts may not expose lock-screen controls. OS-level stop discards immediately because it cannot answer the in-app confirmation dialog. |
| Notifications | Permission is requested only from an explicit Settings gesture. A best-effort completion notification is attempted only when the document is hidden. | Summary and history remain the authoritative completion record; absence, denial, or errors do not affect the workout. |
| Install prompt | Captures a compatible browser's deferred install prompt. | The prompt is platform-dependent; iOS uses manual guidance. |

## Local data and privacy

All application data is local to the browser.

| Data | Storage | Notes |
| --- | --- | --- |
| Routines | `localStorage` (`tiptap.routines`) | Named mode configurations, including full Personalizado block sequences. |
| History | `localStorage` (`tiptap.history`) | Natural-completion records and filterable statistics source. |
| Settings | `localStorage` (`tiptap.settings`) | Music assignments, notification opt-in, and install-guidance state. |
| Music metadata and blobs | IndexedDB database `tiptap-workout` | Metadata and audio blobs are stored separately so listing the library does not load track content. |
| Active workout | In memory only | Intentionally not persisted across reloads or browser restarts. |

The persisted JSON stores use schema validation and versioned persistence, with migration support for future schema changes. The current persisted schemas are version 1 and define no migration steps yet. Corrupt or unknown persisted data falls back to safe defaults instead of crashing the app.

### What local-only means—and does not mean

- There is no account, backend, analytics, cloud sync, remote user-data service, or sharing workflow.
- User music is imported from the device; the project ships no bundled or licensed tracks.
- Browser data can still be cleared, evicted, corrupted, or limited by storage quota.
- There is currently no export/import backup feature.

## Architecture

```text
src/
├── app/                 Next.js routes, metadata, manifest, service-worker source
├── components/          UI for forms, timer, routines, history, settings, and shell
├── features/session/    React effects orchestration for an active workout
├── lib/
│   ├── timer/           Pure plan compiler, clock, engine, and duration helpers
│   ├── audio/           Cue planning, synthesized beeps, ducking, and music playback
│   ├── history/         Completion-entry creation and filter/statistics functions
│   ├── pwa/             SSR-safe progressive browser-capability adapters
│   ├── storage/         IndexedDB music store and validated persistence helpers
│   └── validation/      Zod schemas and form resolver
├── stores/              Ephemeral session state plus persisted routines/history/settings
└── test/                Shared test setup and browser-capability fakes

tests/
└── offline.spec.ts      Chromium production-build offline smoke test
```

### Core boundaries

| Layer | Responsibility |
| --- | --- |
| `src/lib/timer/` | Compile a configuration into phases and derive a session view from state plus a supplied clock value. |
| `src/stores/sessionStore.ts` | Hold ephemeral session state and map actions to the pure timer engine. |
| `src/features/session/` | Coordinate UI refresh, visibility recovery, completion, audio, Wake Lock, vibration, badging, Media Session, and notifications. |
| `src/lib/storage/` + `src/stores/` | Keep durable browser data validated, versioned, and separated from the ephemeral workout. |
| `src/lib/pwa/` | Isolate platform-dependent behavior. Unsupported and expected failure paths are best effort; no optional API should be treated as a prerequisite for the core workflow. |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Mode selection, quick routines, and eligible install guidance. |
| `/clasico` | Clásico configuration form. |
| `/tabata` | Tabata configuration form. |
| `/personalizado` | Custom sequence builder. |
| `/sesion` | Active workout screen with pause, resume, and discard controls. |
| `/resumen` | Latest natural-completion summary. |
| `/rutinas` | Saved routines: start, rename, and delete. |
| `/historial` | Completion history, filters, and statistics. |
| `/ajustes` | Music library, phase assignments, notifications, installation, and app settings. |
| `/offline` | Service-worker fallback document. |

## Development and verification

### Available commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server. |
| `pnpm build` | Create a production build, including service-worker generation. |
| `pnpm start` | Serve an existing production build. |
| `pnpm lint` | Run ESLint. |
| `pnpm test` | Run the Vitest unit and component suite. |
| `pnpm test:offline` | Run the Chromium production-build offline smoke test. |
| `pnpm exec tsc --noEmit` | Run a TypeScript type check. |

The offline test starts a fresh `pnpm build && pnpm start` through Playwright. If Chromium is not already available locally, install it before running the test:

```bash
pnpm exec playwright install chromium
pnpm test:offline
```

### Archived verification evidence

The implementation's OpenSpec evidence is archived under [`openspec/changes/archive/2026-09-13-add-pwa-workout-timer/`](openspec/changes/archive/2026-09-13-add-pwa-workout-timer/). It preserves planning, tasks, verification, sync, and archive records; the application code itself remains in its normal repository paths.

The archived final verification report recorded the following at the verified implementation checkpoint:

| Check | Recorded result |
| --- | --- |
| Overall verdict | **PASS WITH WARNINGS**; 0 blockers and 0 critical findings |
| OpenSpec coverage | 40/40 requirements and 79/79 structural scenarios |
| Vitest | 54 test files and 549 tests passed |
| ESLint | Passed with 0 errors and 1 existing unused-variable warning in `src/lib/storage/persisted.test.ts` |
| TypeScript | Passed with `tsc --noEmit` |
| Browser smoke | 1 Chromium production/offline journey passed |
| Diff hygiene | `git diff --check` passed |

The archived report's two non-blocking assertion-quality warnings concern implementation-facing `data-flashing` assertions in session and vibration tests. The report treats them as checks of the visible transition effect, but still implementation-facing; they did not open a correction.

Those results are historical evidence for the archived implementation checkpoint, not a substitute for rerunning the commands above on a later revision.

## Implemented scope and traceability

The archived OpenSpec change synchronizes nine canonical specification domains. Together they account for **40 requirements** and **79 structural scenarios**.

| Domain | Requirements | Structural scenarios |
| --- | ---: | ---: |
| Audio | 5 | 11 |
| History | 4 | 8 |
| Local data | 2 | 2 |
| PWA | 10 | 16 |
| Routines | 4 | 8 |
| Timer correctness | 3 | 12 |
| Timer modes | 7 | 14 |
| UI design | 2 | 3 |
| Workout completion | 3 | 5 |
| **Total** | **40** | **79** |

The canonical specifications live in [`openspec/specs/`](openspec/specs/). The archived proposal, design, tasks, verification report, sync report, and archive report remain together as an audit trail.

## Platform boundaries and non-goals

The following boundaries are intentional:

- No native app wrapper or store packaging.
- No accounts, backend, sync, sharing, analytics, or remote user-data service.
- No GPS, location, running-tracker features, or data export/import.
- No bundled music, streaming integration, or audio catalog.
- No light mode, alternate visual skins, or i18n framework; the app has one dark, Spanish-language interface.
- No promise of unrestricted background execution. Browser suspension can pause JavaScript and audio; the timer corrects itself from wall-clock time when it resumes.
- No persistence of an active workout across a page reload.
- No guarantee that installation, notifications, Wake Lock, vibration, app badging, or Media Session are available on every browser or platform.

## License

`package.json` declares `"license": "ISC"` and contains `"private": "true"` in its metadata, but this repository currently has no standalone `LICENSE` file or copyright notice. Treat it as not distribution-ready under a complete repository-level license grant until an owner adds one.
