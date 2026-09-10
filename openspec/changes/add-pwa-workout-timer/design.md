# Design — add-pwa-workout-timer

- **Change**: `add-pwa-workout-timer` — greenfield offline-first workout interval timer PWA ("Tip Tap Workout")
- **Phase**: design (technical decisions, architecture, data model, PWA/offline strategy)
- **Inputs**: `proposal.md`, `specs/` (9 domains, 40 requirements, 79 scenarios; `timer-correctness` is the HARD GATE), `exploration.md` (§4 tokens, §5 capability matrix, §6 constraints, R1–R6), `openspec/config.yaml` (strict TDD, Vitest planned, 400-line review budget, ask-on-risk), `openspec/context/workouts.md` (open decisions #1–#5), `preproposal.md` (confirmed product decisions — not reopened)
- **Skills applied**: `typescript` (as-const objects, flat interfaces, no `any`), `nextjs-15` (App Router conventions, manifest.ts, server/client discipline), `react-19` (named imports, ref-as-prop, no manual memoization), `gentle-ai` (SDD discipline, TDD, review-budget protection)

---

## 1. Decision summary (resolves the six open decisions)

| # | Decision | Choice | Key rationale |
| --- | --- | --- | --- |
| 1 | Service worker | **Serwist (`@serwist/next` + `@serwist/sw`)**, disabled in dev | Hand-rolling RSC/runtime caching rules for App Router re-implements what `defaultCache` already solves; R5 is closed by an explicit offline smoke test (§8.3), not by trust |
| 2 | Zustand persistence | **localStorage** for routines/history/settings (3 JSON stores), `version` + zod-validated `migrate`, `skipHydration` pattern | Text-only data ≪ 5 MB; sync storage avoids async hydration complexity; schema versioning is required because no schema is inherited (exploration §6.3) |
| 3 | User music storage | **IndexedDB** (`idb`), two object stores (`trackMeta`, `trackBlobs`), atomic single-transaction import | Listing never loads blobs; blobs are the only large data; IDB transactions abort atomically → "no partial file" scenario is structural |
| 4 | Web Audio | Single lazily-created `AudioContext`; beeps scheduled on the **audio clock** from a pure active-time cue planner; music via one long-lived `HTMLAudioElement` routed through a Web Audio **duck GainNode** (`createMediaElementSource`) | Streaming playback (no full-file PCM decode → memory-safe), precise gain-automation ducking, natural Media Session anchor (R2) |
| 5 | Timer engine | **Pure, framework-free state machine with injectable clock** (`type Clock = () => number`, default `Date.now`); display is always *derived* from wall-clock anchors, never accumulated ticks; `visibilitychange` triggers recompute | The HARD GATE scenarios are only testable (and only correct) when time is an injected input and state is anchor-based: backgrounding, sleep/resume, and paused-suspension all fall out of the arithmetic |
| 6 | History data model | Flat `HistoryEntry` (id, mode, completedAt, activeDurationMs, rounds?, tabatas?, bloques?) + pure `filterEntries`/`computeStats` | One shape serves record fields, composed filters, and stats; mode-appropriate effort counts per history spec |

Supporting architectural decisions:

- **Server/client boundary**: server components render layout, page shells, and static copy; every interactive/browser-API surface is a single client entry component per route (exploration §6.4).
- **Timer session state is ephemeral** (non-persisted store). Specs require wall-clock truth across backgrounding/tab-switch/sleep — not across page reloads. Reload mid-session discards the session (consistent with the honest-boundary posture; documented in §13).
- **Design tokens**: Tailwind v4 CSS-first `@theme` in `globals.css`, shadcn semantic vars aliased to Gentleman hex values, dark-only.
- **Testing additions** (dev-only, justified): `fake-indexeddb` (jsdom has no IDB), `@playwright/test` (service workers/CacheStorage cannot run in jsdom at all) for the offline smoke test.

---

## 2. System architecture

### 2.1 Repository layout (single Next.js app, `src/` dir)

```text
.
├── next.config.ts                 # withSerwist wrapper (+ optional reactCompiler)
├── vitest.config.ts               # jsdom, RTL, @ alias
├── playwright.config.ts           # offline smoke test, chromium-only, prod build
├── public/icons/                  # icon-192.png, icon-512.png, icon-maskable-512.png
├── src/
│   ├── app/
│   │   ├── layout.tsx             # server: <html lang="es">, dark theme, fonts, AppShell
│   │   ├── page.tsx               # server shell + client HomeScreen
│   │   ├── clasico/page.tsx       # server shell + <ClasicoConfigScreen/>
│   │   ├── tabata/page.tsx        # server shell + <TabataConfigScreen/>
│   │   ├── personalizado/page.tsx # server shell + <PersonalizadoBuilder/>
│   │   ├── sesion/page.tsx        # server shell + <ActiveSessionScreen/>
│   │   ├── resumen/page.tsx       # server shell + <CompletionSummary/>
│   │   ├── rutinas/page.tsx       # server shell + <RoutinesScreen/>
│   │   ├── historial/page.tsx     # server shell + <HistoryScreen/>
│   │   ├── ajustes/page.tsx       # server shell + <SettingsScreen/>
│   │   ├── offline/page.tsx       # lightweight SW fallback page (precache)
│   │   ├── manifest.ts            # Metadata API manifest (§8.1)
│   │   └── globals.css            # Tailwind v4 @theme + shadcn semantic vars (§9)
│   ├── components/
│   │   ├── ui/                    # shadcn/ui generated (§9.3 inventory)
│   │   ├── layout/                # AppShell, NavBar (bottom tab bar mobile-first)
│   │   ├── timer/                 # ActiveSessionScreen, TimeDisplay, PhaseRing, Controls, NextPhaseHint
│   │   ├── forms/                 # DurationField (stepper), ValidatedNumberInput
│   │   ├── builder/               # BlockCard, BlockList, AddBlockMenu, ReorderControls
│   │   ├── history/               # FiltersBar, StatsCards, EntryList
│   │   ├── routines/              # RoutineCard, SaveRoutineDialog, RenameDialog
│   │   ├── settings/              # MusicLibrary, TrackAssigner, InstallCard, NotificationsCard
│   │   └── shared/                # StoreHydrationGate, EmptyState, Copy constants
│   ├── lib/
│   │   ├── timer/                 # PURE engine (no React, no browser APIs)
│   │   │   ├── types.ts           # as-const objects + flat interfaces (§3.1)
│   │   │   ├── plan.ts            # compilePlan(config): PhasePlan
│   │   │   ├── engine.ts          # start/pause/resume/computeView (clock-injected)
│   │   │   └── clock.ts           # systemClock, FakeClock (test)
│   │   ├── audio/
│   │   │   ├── context.ts         # getAudioContext() singleton, resume-on-gesture
│   │   │   ├── cues.ts            # planPhaseCues(phase) — PURE active-time planner
│   │   │   ├── beepSynth.ts       # oscillator scheduling on ctx clock + Web-Audio-absent no-op
│   │   │   ├── duckGain.ts        # shared music GainNode + automation events
│   │   │   └── musicPlayer.ts     # HTMLAudioElement + createMediaElementSource wiring
│   │   ├── pwa/
│   │   │   ├── capabilities.ts    # detection registry + per-capability no-op wrappers
│   │   │   ├── wakeLock.ts        # acquire/release/re-acquire-on-visible controller
│   │   │   ├── mediaSession.ts    # metadata + play/pause/stop handlers
│   │   │   ├── vibration.ts       # vibrateOnTransition()
│   │   │   ├── notifications.ts   # gesture-gated permission + hidden-completion notify
│   │   │   ├── badging.ts         # set/clear (+paused marker)
│   │   │   └── install.ts         # beforeinstallprompt capture, appinstalled, iOS guidance
│   │   ├── storage/
│   │   │   ├── db.ts              # openDB("tiptap-workout") via idb
│   │   │   ├── musicStore.ts      # list/import/remove/getObjectUrl (quota+decode errors)
│   │   │   └── persisted.ts       # createValidatedPersist() helper (version+migrate+zod)
│   │   └── validation/
│   │       ├── configSchemas.ts   # zod per mode, Spanish messages
│   │       └── persistedSchemas.ts# zod for the three persisted store shapes
│   ├── stores/
│   │   ├── sessionStore.ts        # EPHEMERAL: engine wrapper + view cache (§4.2)
│   │   ├── routinesStore.ts       # persisted v1
│   │   ├── historyStore.ts        # persisted v1 + filter/stats selectors
│   │   └── settingsStore.ts       # persisted v1 (assignments, opt-ins, nudge state)
│   ├── features/session/
│   │   ├── SessionController.tsx  # effects orchestrator: ticker, visibility, audio, PWA, completion
│   │   └── useSessionController.ts
│   └── test/
│       ├── setup.ts               # jest-dom, cleanup, navigator stubbing helpers
│       └── fakes.ts               # FakeClock, stubAudioContext, stubNavigator caps
└── (tests colocated: src/**/*.test.ts(x))
```

`public/sw.js` is a **build artifact** (Serwist `swDest`), gitignored; source is `src/app/sw.ts`.

### 2.2 Route map (Spanish, ASCII-only path segments)

| Route | Surface | Type |
| --- | --- | --- |
| `/` | Mode selection (Clásico / Tabata / Personalizado), quick routines, install nudge | shell (server) + `HomeScreen` (client) |
| `/clasico`, `/tabata` | Mode configuration forms (RHF + zod) | client |
| `/personalizado` | Sequence builder (blocks: add/remove/reorder + descanso global) | client |
| `/sesion` | Active timer (single mode-agnostic surface; plan already compiled) | client |
| `/resumen` | Completion summary (renders newest history entry) | client |
| `/rutinas` | List / start / rename / delete routines | client |
| `/historial` | Entries + period/type filters + stats | client |
| `/ajustes` | Music library + phase assignments, notifications opt-in, install, about | client |
| `/offline` | Static SW fallback | server |

Display labels keep accents (`Clásico`); URL segments and enum ids don't (`clasico`). `MODE_LABEL: Record<ModeId, string>` maps ids → verbatim Spanish names (ui-design spec).

### 2.3 Server/client boundary (deliberate)

- **Server**: `layout.tsx`, all `page.tsx` shells (headings, static Spanish copy, metadata), `/offline`, `manifest.ts`. No browser API access, no storage reads.
- **Client**: exactly one feature component per route owns interactivity; it may compose child client components. Browser APIs (audio, wake lock, storage, media session) exist only under `src/lib/*` + `features/session/*`, all imported exclusively by client components.
- **Hydration gate**: persisted Zustand stores use `skipHydration: true`; `<StoreHydrationGate>` (client, mounted in layout) calls `persist.rehydrate()` in an effect and renders children only when hydrated — data-dependent screens show skeletons meanwhile. This prevents SSR/CSR markup mismatch on localStorage-backed state.

### 2.4 Layout shell

`AppShell` = top header (brand "Tip Tap Workout", mono accent) + bottom tab bar on mobile (Inicio · Rutinas · Historial · Ajustes) that collapses into the header on wide screens. Timer route (`/sesion`) renders chrome-minimal (full-screen timer) — the active screen opts out of the tab bar via route group check.

---

## 3. Timer engine — HARD GATE core (open decision #5)

### 3.1 Types (`lib/timer/types.ts`, per typescript skill: as-const objects, flat interfaces)

```ts
export const PHASE_KIND = {
  preparacion: "preparacion",
  trabajo: "trabajo",
  descanso: "descanso",
  descansoLargo: "descansoLargo",
  descansoGlobal: "descansoGlobal",
} as const;
export type PhaseKind = (typeof PHASE_KIND)[keyof typeof PHASE_KIND];

export const MODE = {
  clasico: "clasico",
  tabata: "tabata",
  personalizado: "personalizado",
} as const;
export type ModeId = (typeof MODE)[keyof typeof MODE];

export interface ClasicoValues {
  preparacionS: number; trabajoS: number; descansoS: number; rondas: number;
}
export interface TabataValues extends ClasicoValues {
  rondasPorTabata: number; tabatas: number; descansoLargoS: number;
}
export interface BlockDef {
  id: string;                 // stable uuid for React keys + reorder
  tipo: typeof MODE.clasico | typeof MODE.tabata;
  values: ClasicoValues | TabataValues;
}
export interface ClasicoConfig { mode: typeof MODE.clasico; values: ClasicoValues; }
export interface TabataConfig  { mode: typeof MODE.tabata;  values: TabataValues; }
export interface PersonalizadoConfig {
  mode: typeof MODE.personalizado;
  descansoGlobalS: number;
  blocks: BlockDef[];
}
export type SessionConfig = ClasicoConfig | TabataConfig | PersonalizadoConfig;

export interface ScheduledPhase {
  index: number;            // 0..n-1
  kind: PhaseKind;
  durationMs: number;       // whole seconds * 1000
  startOffsetMs: number;    // cumulative ACTIVE-time offset (excludes pauses)
  label: string;            // Spanish display label, e.g. "Tabata 2 · Trabajo"
}
export type PhasePlan = readonly ScheduledPhase[];

export const SESSION_STATUS = { running: "running", paused: "paused", completed: "completed" } as const;
export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export interface SessionState {
  status: SessionStatus;
  plan: PhasePlan;
  totalActiveMs: number;          // sum of durations
  runningSince: number | null;    // wall-clock ms anchor of current running segment (null ⇒ paused/completed)
  accumulatedActiveMs: number;    // active ms from completed segments (excludes all pause time)
  config: SessionConfig;          // retained for summary/effort counts
}

export interface SessionView {
  status: SessionStatus;
  phase: ScheduledPhase | null;   // null when completed
  nextPhase: ScheduledPhase | null;
  remainingMs: number;            // in-phase remaining (frozen while paused)
  elapsedActiveMs: number;        // session active elapsed (summary source)
}

export type Clock = () => number; // ms; default Date.now (wall clock, survives device sleep)
```

### 3.2 Plan compiler — `compilePlan(config): PhasePlan` (pure)

Flattens any mode config into an ordered phase list in **active-time coordinates**:

- **Clásico**: `preparación` once → rounds of `trabajo` with `descanso` between consecutive `trabajo` only; no trailing `descanso`.
- **Tabata**: `preparación` once → per tabata: rondas of `trabajo` with short `descanso` between; after the final `trabajo` of a non-final tabata → `descanso largo` (replaces, never stacks on, the short rest); after the final tabata → end.
- **Personalizado**: blocks flattened with each block following its own mode's rules (Tabata blocks include their own `descanso largo`), `descanso global` between consecutive blocks only, never after the final block, no block-internal trailing rest.

Labels carry context (`"Preparación"`, `"Trabajo"`, `"Descanso"`, `"Descanso largo"`, `"Descanso global"`, `"Tabata 2 · Trabajo"`, `"Bloque 2 · Trabajo"`). Every sequence scenario in `timer-modes` is a direct unit assertion against this function's output (exact kind/duration/offset arrays).

### 3.3 Engine — pure transitions, injectable clock (open decision #5)

```ts
export function compilePlan(config: SessionConfig): PhasePlan;
export function startSession(config: SessionConfig, now: number): SessionState;
export function pauseSession(state: SessionState, now: number): SessionState;   // running → paused
export function resumeSession(state: SessionState, now: number): SessionState;  // paused → running
export function computeView(state: SessionState, now: number): SessionView;
```

Arithmetic (the whole correctness story):

```ts
elapsedActiveMs = accumulatedActiveMs + (runningSince !== null ? now - runningSince : 0)
// running: find plan[i] with startOffsetMs ≤ elapsed < startOffsetMs+durationMs
//          remainingMs = phaseEnd − elapsed  (≥ ceil-truncated for display)
// elapsed ≥ totalActiveMs ⇒ view.status = "completed", phase = null, remaining = 0
// paused:  view computed from accumulatedActiveMs alone (frozen — runningSince is null)
```

Why this satisfies the HARD GATE structurally:

- **No tick accumulation anywhere.** Display is a pure function of `(state, now)`. Any re-render with a fresh `now` — ticker, `visibilitychange`, focus — yields wall-clock truth. Backgrounding/tab-switch/sleep scenarios reduce to "call `computeView` with a later `now`".
- **`Date.now` default clock**: wall-clock advances through device sleep (timer throttling never affects it), matching "sleep/resume consumed real time". `performance.now` is avoided as default precisely because OS-sleep behavior is not guaranteed uniform across engines.
- **Paused sessions consume nothing while suspended**: `runningSince === null` means suspension time never enters the arithmetic — the "paused 2 minutes → still 20 s" scenario is structural, not a special case.
- **Drift over a session ≈ 0**: the only error source is clock reads; transitions are boundary comparisons, not summed ticks. "85 s session within 1 s" is satisfied by construction.
- **Completion is idempotent**: `computeView` reports completed for any `now` past the end; the controller fires completion effects exactly once on the status *transition* (§3.5).
- **Testability**: `createFakeClock()` lets unit tests express every spec scenario literally — `clock.advance(50_000)` then assert view.

### 3.4 Display rounding

`displaySeconds = Math.ceil(remainingMs / 1000)` — a phase shows its full value at entry and 0 exactly at its boundary. Countdown beeps are keyed to the same integer-second boundaries (remaining = 3, 2, 1).

### 3.5 React/session layer (effects orchestration, thin)

`sessionStore` (non-persisted Zustand) holds `SessionState` + cached `SessionView` + the injected `Clock`. Actions map 1:1 to engine functions; `refreshView()` recomputes the derived view.

`SessionController` (mounted only on `/sesion`) owns:

1. **Ticker** — `setInterval(250 ms)` while running and `document.visibilityState === "visible"`; dispatches `refreshView()`. Cosmetic driver only; never authoritative.
2. **`visibilitychange`** — immediate `refreshView()` (HARD GATE on return), wake-lock re-acquire, audio-context `resume()` attempt (iOS interruption recovery), cue re-schedule, music re-target to the recomputed phase (audio spec: "music follows the recomputed phase"; if recomputed as completed → completion path).
3. **Phase-index observer** — on `view.phase.index` change: fire transition effects (transition cue is pre-scheduled by the audio layer; here: vibration, visual flash class, music switch, badge refresh).
4. **Completion observer** — on status transition → completed (exactly once): `historyStore.addEntry(...)` → navigate `/resumen` → release wake lock, clear badge, stop music, drop media-session handlers. Summary data comes from the engine (`config` + measured `elapsedActiveMs`) and equals the new history entry.
5. **Stop** — `AlertDialog` confirmation ("¿Descartar la sesión?") → discard: no entry, no summary, all capability state released, navigate home. Stop while paused takes the same path.

Reload mid-session = session gone (accepted; §13). The store never persists.

---

## 4. State architecture & persistence (open decision #2)

### 4.1 Store inventory — what persists vs what is ephemeral

| Store | Backend | Persisted? | Contents |
| --- | --- | --- | --- |
| `sessionStore` | memory | **No** (deliberate) | `SessionState`, cached `SessionView`, injected clock |
| `routinesStore` | localStorage `tiptap.routines` | Yes, v1 | `routines: RoutineRecord[]` |
| `historyStore` | localStorage `tiptap.history` | Yes, v1 | `entries: HistoryEntry[]` (add-only on natural completion) |
| `settingsStore` | localStorage `tiptap.settings` | Yes, v1 | `assignments: Record<PhaseKind, TrackId \| null>`, `notificationsOptIn`, `installNudgeDismissedAt` |
| music library | IndexedDB `tiptap-workout` | Yes (not Zustand) | `trackMeta`, `trackBlobs` (§7) |

```ts
export interface RoutineRecord {
  id: string; name: string; mode: ModeId;
  config: SessionConfig;            // full Personalizado sequence preserved verbatim
  createdAt: number; updatedAt: number;
}
```

Rationale localStorage over IndexedDB for the JSON stores: data is text-only and tiny (a history of thousands of entries is well under 1 MB); sync storage keeps hydration simple; zustand `persist` natively wraps it. Async-storage complexity buys nothing at this scale.

### 4.2 Schema versioning + zod validation

All three persisted stores share one helper:

```ts
// lib/storage/persisted.ts
createValidatedPersist({ key, schema, version, migrations?, fallback })
```

- zustand `persist({ version: 1, migrate, partialize })`.
- `migrate` runs ordered step-migrations for `version < n`, then `schema.safeParse`; **parse failure (corrupt/unknown shape) → return zod-parsed defaults**, never crash, never throw into React (local-data spec: app keeps working).
- `partialize` persists only the data slice (no derived/UI flags).
- Future schema changes bump `version` and add one migration step each; `persistedSchemas.ts` is the single source of truth for on-disk shapes (export/import, if ever added, would reuse these schemas).

### 4.3 Hydration

`skipHydration: true` on all persisted stores + `StoreHydrationGate` (§2.3). Screens reading persisted data render a skeleton until `hasHydrated` flips true; writes before hydration are flushed by zustand persist.

---

## 5. History data model (open decision #6)

```ts
export interface HistoryEntry {
  id: string;                    // uuid
  mode: ModeId;                  // clasico | tabata | personalizado
  completedAt: number;           // epoch ms
  activeDurationMs: number;      // measured active time (elapsed − pauses)
  rounds?: number;               // Clásico: rondas; Tabata: TOTAL trabajo phases completed
  tabatas?: number;              // Tabata only (additional count, MAY per spec)
  bloques?: number;              // Personalizado: block count
}
```

Effort-count semantics: Clásico → configured `rondas`. Tabata → `rounds` = total completed trabajo phases (actual effort; e.g. 2 rondas × 2 tabatas = 4) plus `tabatas`. Personalizado → `bloques` = configured block count. Display strings: `"2 rondas"`, `"4 rondas · 2 tabatas"`, `"3 bloques"`.

Written exactly once per **natural** completion by the completion observer (§3.5). `activeDurationMs` is measured (`elapsedActiveMs` at completion, ≈ plan total ± detection latency ≤ 250 ms ⇒ within-1-s requirements hold). Manually stopped sessions never reach this code path.

Pure query layer (unit-tested against every history scenario):

```ts
export const PERIOD = { dias7: "dias7", dias30: "dias30", todo: "todo" } as const;
export const HISTORY_TYPE = { todas: "todas", ...MODE } as const;
export interface HistoryFilter { period: PeriodId; type: HistoryTypeId; }
export function filterEntries(entries: HistoryEntry[], filter: HistoryFilter, now: number): HistoryEntry[];
export interface HistoryStats { count: number; totalMs: number; avgMs: number; }
export function computeStats(filtered: HistoryEntry[]): HistoryStats;  // count ≥ 0; avg = total/count (0 when empty)
```

`filterEntries` composes period + type predicates (spec: filters compose). Stats always computed over the filtered set; Spanish labels `"X sesiones · tiempo total · duración media"`; durations formatted `mm:ss`/`h:mm:ss`; dates via `Intl.DateTimeFormat("es")`.

---

## 6. Audio architecture (open decision #4)

### 6.1 AudioContext lifecycle

- `getAudioContext(): AudioContext | null` — lazily created on first **user gesture** path (start/resume buttons, import, settings preview); `null` when `typeof AudioContext === "undefined"` (audio spec: no Web Audio ⇒ sessions still run; every consumer no-ops on `null`).
- `resumeIfSuspended()` called on session start, session resume, and visibility return (iOS interruption recovery), each best-effort `try/catch`.
- One context for the app's lifetime; never `close()`d.

### 6.2 Countdown beeps — pure planner + audio-clock scheduling

Two layers keep this testable and drift-free:

1. **`planPhaseCues(phase): CueEvent[]` (pure, active-time)** — for a phase `[S, S+D)`:
   - countdown cues at active-ms `S+D−k·1000` for `k = 1..min(3, ⌈D/1000⌉)` → last-3-seconds convention; a 2 s phase gets cues at remaining 2 and 1 (short-phase scenario verified exactly);
   - one **transition cue** at `S+D` (kind `"transition"`), acoustically distinct (different frequency + double blip) so it is "distinguishable from the countdown beeps".
2. **`beepSynth` (impure, thin)** — converts active-ms to `AudioContext.currentTime` via the session's current anchor (`wallMs ↔ ctxTime` pair captured when the segment last started/resumed/recomputed), then schedules oscillator/gain envelopes at exact context times. Web Audio's clock is immune to main-thread throttling while the page is live.

Re-schedule triggers (cancel pending nodes, re-derive from recomputed truth): session start, resume, pause (cancel — no cues owed while paused), phase change (schedule next phase's cues), visibility return (recompute; drop cues now in the past, schedule the recomputed phase's remaining cues). No bundled assets — oscillators only.

### 6.3 Music playback + ducking

- **One long-lived hidden `<audio>` element**, its `createMediaElementSource` node created once and connected `→ duckGain (GainNode) → musicMaster (GainNode) → destination`.
- Phase change (including recomputed phase after suspension): outgoing stops (`pause`, src swap), incoming phase's assigned track (if any) is fetched from IndexedDB → object URL → `el.src = url; el.loop = true; el.play()` from 0. Unassigned phase ⇒ silence except beeps. Object URLs revoked after swap.
- Pause/resume with the timer: `el.pause()` / `el.play()` — position preserved by the element (spec: "resumes from where it paused").
- **Ducking = gain automation on `duckGain`** (works identically for streamed media and synthesized beeps because both live in the graph): each cue emits `setValueAtTime(duckLevel)` slightly before and `linearRampToValueAtTime(1)` slightly after the cue window (~duck to 25 %, 150 ms pad each side). Cue → duck-event derivation is pure (`duckEventsFor(cues)`) and unit-tested; only the `GainNode` calls are thin.
- Rejected alternatives: full-file `decodeAudioData` playback (PCM memory ≈ tens of MB per track — unnecessary when streaming works), and `HTMLAudioElement.volume` JS-ramped ducking (setTimeout drift; not spec-grade).

### 6.4 Music import pipeline + failure surfacing (feeds §7)

```ts
export const MUSIC_IMPORT_ERROR = { quota: "quota", undecodable: "undecodable" } as const;
export interface MusicImportError extends Error { code: MusicImportErrorCode; }
export function importTrack(file: File): Promise<TrackMeta>;  // throws MusicImportError
```

Steps: (1) reject non-`audio/*` MIME → `undecodable`; (2) **playability probe** — object URL + detached `Audio` element awaiting `loadedmetadata` (ok) vs `error` (undecodable) with a 10 s timeout guard — validates the browser can actually play the file without decoding PCM; (3) single IDB transaction writes `trackMeta` + `trackBlobs` (atomic — quota rejection aborts both, "no partial file recorded" is structural); (4) quota detection (`QuotaExceededError` / code 22 / quota-named `DOMException`) → `code: "quota"`.

UI: errors surface as Spanish sonner toasts — quota: "No hay espacio suficiente en el dispositivo para esta canción"; undecodable: "El archivo no se pudo leer como audio" — library untouched, running sessions unaffected (import happens on `/ajustes`, never touches session state).

---

## 7. Music storage — IndexedDB design (open decision #3)

Database `tiptap-workout` v1 (via `idb`), **two object stores** so listing never touches blobs:

| Store | Key | Value |
| --- | --- | --- |
| `trackMeta` | `id` (uuid) | `TrackMeta { id, name, mime, sizeBytes, importedAt }` |
| `trackBlobs` | `id` | `Blob` (original file bytes) |

```ts
export interface MusicStore {
  list(): Promise<TrackMeta[]>;
  importTrack(file: File): Promise<TrackMeta>;        // §6.4 pipeline
  removeTrack(id: string): Promise<void>;             // also clears any settings assignment (orphan cleanup)
  getObjectUrl(id: string): Promise<string>;          // fetch blob → object URL (revoked by player after swap)
}
```

- Persistence across reloads is inherent (IDB) — audio spec scenario.
- Assignments (phase kind → track id) live in `settingsStore` (localStorage), never in the music stores — deleting a track clears its assignment; deleting a routine/history never touches music (isolation scenarios).
- Quota posture: v1 accepts a visible error on quota (spec-mandated); no eviction/LRU in scope.

---

## 8. PWA layer

### 8.1 Manifest & install

- `app/manifest.ts` (Metadata API): `name: "Tip Tap Workout"`, `short_name: "Tip Tap"`, `start_url: "/"`, `display: "standalone"`, `background_color/theme_color: "#1a1218"/"#f095c8"`, icons 192 + 512 + `maskable` 512 (committed PNGs in `public/icons/`), `shortcuts` → `/clasico`, `/tabata`, `/personalizado` ("Clásico", "Tabata", "Personalizado") — SHOULD-requirement; platforms without support simply ignore them.
- `install.ts`: capture `beforeinstallprompt` (preventDefault; store the event behind a tiny module store so `InstallCard` can offer "Instalar app" and call `prompt()`); `appinstalled` → stop offering (pwa spec). iOS Safari (no `navigator.standalone`, iOS UA, not installed) → dismissible instructions card: Compartir → "Añadir a pantalla de inicio"; dismissal timestamp persisted in `settingsStore`; card never blocks anything.
- Serwist also injects `register: false` script handling — SW registration happens automatically in production builds (next step); nothing manual in app code.

### 8.2 Service worker — Serwist (open decision #1)

**Choice: `@serwist/next`.** Next.js 15 App Router emits three cache-relevant classes: content-hashed static assets (`/_next/static/**`, next/font files — safely `CacheFirst`), **RSC payloads** (dynamic — must NOT be precache-keyed naively by URL; they need runtime rules), and HTML documents. `@serwist/next`'s `defaultCache` already encodes the correct strategies for App Router (documents and RSC/data requests `NetworkFirst` with offline cache fallback; static/image assets `CacheFirst`). Hand-rolling this means owning build-id-aware invalidation and RSC fetch semantics — pure R5 exposure for zero benefit. Serwist is the actively maintained Workbox successor with first-class Next.js support (the exploration's candidate; confirmed here).

```ts
// src/app/sw.ts
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "@serwist/sw";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: SerwistManifest };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST.filter((e) => !e.url.startsWith("/sw.js")),
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: defaultCache,
  fallbacks: { entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }] },
});
serwist.addEventListeners();
```

- `next.config.ts`: `withSerwist({ swSrc: "src/app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development" })` — dev stays uncached (no dev-server poisoning); offline behavior is validated against production builds only.
- Strategy consequences: online visits stay fresh (NetworkFirst for documents/RSC); offline visits serve the warmed shell; every route is warmed on first visit per-route (client-side nav caches RSC at runtime). If the smoke test (§8.3) exposes an uncached RSC case, the fix is one explicit `NetworkFirst` runtime rule for same-origin data requests — the smoke test exists precisely to force that discovery (R5 closed by evidence, not assumption).
- No-SW browsers: Serwist registration is feature-gated; app remains fully functional online with localStorage+IDB persistence (pwa spec scenario).

### 8.3 Offline-navigation smoke test — definition (R5 gate)

New file `tests/offline.spec.ts` (Playwright, chromium-only, dev-only dependency; jsdom cannot host service workers or CacheStorage at all). Runs via **`pnpm test:offline`** (separate from the TDD `pnpm test` loop), against a production build (`playwright.config.webServer` runs `pnpm build && pnpm start`):

1. **Warm**: load `/` and every route (`/clasico`, `/tabata`, `/personalizado`, `/rutinas`, `/historial`, `/ajustes`) online; assert `navigator.serviceWorker.ready` resolves and each page renders its Spanish heading.
2. **Cut the network**: `context.setOffline(true)`.
3. **Hard navigation offline**: reload `/` → app loads (document from SW cache). URL-navigate to each route → loads.
4. **Client-side navigation offline**: click through home → mode config → start.
5. **Full offline session**: configure Clásico `preparación 1 s, trabajo 2 s, descanso 1 s, 1 ronda`; start; let it complete (~3 s real time); assert `/resumen` shows mode + rondas + duration and the history list contains exactly one entry.
6. **Assets offline**: fetch `/manifest.webmanifest` and both icons → 200 from cache.
7. **No leaked network failures**: no unhandled request failures beyond expected none.

Pass ⇒ offline-first claims in the pwa spec are verified; failure ⇒ add the explicit runtime rule (§8.2) and re-run. Verify phase executes this and records output.

### 8.4 Capability integrations — degradation matrix as code

`capabilities.ts` exposes detection helpers evaluated lazily on the client (never at module top-level — SSR safe):

```ts
export function hasServiceWorker(): boolean { return typeof navigator !== "undefined" && "serviceWorker" in navigator; }
export function hasWakeLock(): boolean      { return typeof navigator !== "undefined" && "wakeLock" in navigator; }
export function hasMediaSession(): boolean  { return typeof navigator !== "undefined" && "mediaSession" in navigator; }
export function hasVibration(): boolean     { return typeof navigator !== "undefined" && "vibrate" in navigator; }
export function hasNotifications(): boolean { return typeof window !== "undefined" && "Notification" in window; }
export function hasBadging(): boolean       { return typeof navigator !== "undefined" && "setAppBadge" in navigator; }
```

Every capability module wraps its browser API in detection + `try/catch` and is a **no-op** when absent/denied — the "all capabilities unavailable" scenario is a component test that deletes these globals and runs a full session. Matrix (exploration §5) encoded as: one capability = one small module + one controller integration + one stubbed test:

| Capability | Module | Behavior | Degradation (code-level) |
| --- | --- | --- | --- |
| Wake Lock | `wakeLock.ts` | request on session start (running **or paused**, per pwa spec); re-acquire on `visibilitychange`→visible if session in progress; catch `AbortError` (OS released) and re-request; `release()` on end/unmount | `hasWakeLock()` false → skip silently |
| Media Session | `mediaSession.ts` | on session start: metadata ("Tip Tap Workout — Clásico", artist "Entrenamiento") + handlers `play→resume`, `pause→pause`, `stop→stop` (OS stop discards immediately — the in-app confirmation cannot be answered from a lock screen; stop semantics stay consistent); clear handlers (`setActionHandler(name, null)`) on session end | no API / beep-only session → controls may not appear (accepted); in-app controls authoritative |
| Vibration | `vibration.ts` | `vibrate(TRANSITION_PATTERN)` on phase transitions, fired from the same orchestrator tick as the transition cue + visual flash — pairing is structural | `hasVibration()` false (iOS) → no-op, no error |
| Notifications | `notifications.ts` | permission requested **only** from the settings opt-in gesture (Switch); on completion, notify only when `document.visibilityState !== "visible"` (foreground ⇒ suppressed; in-app summary + entry are the record); denied → nothing changes | absent/denied → no-op |
| Badging | `badging.ts` | `setAppBadge()` on start, `setAppBadge("II")` when paused (MAY-distinguish), `clearAppBadge()` on completion **or stop** | Firefox/Safari → no-op |
| Install | `install.ts` | §8.1 | no `beforeinstallprompt` → card hidden; iOS → manual-path guidance |

Secure context is a deployment precondition (HTTPS/localhost); noted for the rollout checklist, not code-gated.

---

## 9. Design system

### 9.1 Tokens → Tailwind v4 `@theme` (dark-only)

`globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-base: #1a1218;
  --color-surface-dim: #20161e;
  --color-surface-0: #241822;
  --color-surface-1: #342230;
  --color-text: #f6eff3;
  --color-subtext1: #a78e9b;
  --color-subtext0: #76616b;
  --color-accent: #f095c8;
  --color-accent-glow: #f095c84d;
  --color-success: #b4e7c7;   /* green */
  --color-warning: #e0c27a;   /* yellow */
  --color-danger: #ff718f;    /* red */
  --color-info: #a9c7ee;      /* blue */
  --color-mauve: #d7a0b8;
  --color-pink-bright: #ffb1dd;
  --color-peach: #f2b86d;
  --color-teal: #c4daf6;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui;
  --font-mono: var(--font-jetbrains), "Iosevka Term", monospace;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; /* pills: rounded-full (999px) */
}
:root { color-scheme: dark; }
```

shadcn semantic variables are aliased to the same hex values (`--background: #1a1218`, `--card: #20161e`, `--popover: #241822`, `--primary: #f095c8`, `--primary-foreground: #1a1218`, `--secondary/--accent: #342230`, `--muted: #241822`, `--muted-foreground: #76616b`, `--destructive: #ff718f`, `--ring: #f095c8`, `--radius: 12px`) so generated components inherit the skin without edits.

Fonts: `next/font/google` `Inter` + `JetBrains_Mono` (build-time self-hosted ⇒ hashed static files ⇒ precached ⇒ offline-safe). Iosevka Term is not on Google Fonts — kept only as a local fallback in the chain.

Component treatments per exploration §4: cards = `surface-dim` bg + `surface-1` border, hover → accent border + `translateY(-2px)`; primary button = accent bg + base text + `box-shadow: 0 0 24px #f095c84d`; timer screen uses hero-style radial glows (`#f095c838`, `#b4e7c71f`); phase colors — trabajo = accent pink, descanso = green, preparación = yellow, largo/global = blue (accent-mapped labels).

### 9.2 Language posture

All app-authored copy Spanish, centralized in `components/shared/copy.ts` constants (audit-friendly: one file to review for the copy-audit scenario). Mode names verbatim via `MODE_LABEL`. Copy rules: no background-execution promises (timer-correctness spec) — e.g., about text: "El temporizador usa la hora del dispositivo: al volver a la app, el estado refleja el tiempo real transcurrido." No i18n machinery, no theme/skin switcher anywhere.

### 9.3 shadcn/ui inventory (14)

`button, card, input, label, select, dialog, alert-dialog, dropdown-menu, form (RHF), sonner (toasts), badge, separator, scroll-area, switch` (+ `skeleton` for hydration gates). Custom on top: `DurationField` (stepper input, whole seconds), `PhaseRing` (CSS conic-gradient progress ring — no chart lib), `BlockCard`/reorder list, `StatsCards`, `EmptyState`. lucide-react icons throughout.

---

## 10. Data flow (narrative + diagram)

**Configure → run → complete:**

1. Config screen: RHF form bound to zod schema (`configSchemas.ts`, Spanish messages). Invalid values block start (timer-modes spec). "Guardar rutina" opens `SaveRoutineDialog` (name required; collision → explicit overwrite confirm). "Iniciar" → `sessionStore.start(config, clock)`.
2. `start` compiles the plan, stores `SessionState`, navigates `/sesion`.
3. `SessionController` mounts: ticker + visibility listener begin; wake lock requested; badge set; media-session handlers registered; first phase cues scheduled; music for `phase.kind` starts (if assigned).
4. Every render: `view = computeView(state, clock.now())` — display, next-phase hint, ring progress derived.
5. Phase boundary: observer fires music switch + vibration + visual flash (cue was pre-scheduled).
6. Pause/resume: engine transitions; music pauses/resumes; cues cancelled/re-derived; duck gain untouched at rest level.
7. Backgrounding/return: `visibilitychange` → `refreshView()` (wall-clock truth), re-acquire wake lock, resume audio context, cancel/re-schedule cues, re-target music to recomputed phase — or complete.
8. Completion (foreground detection or recomputed): exactly once → `historyStore.addEntry` → `/resumen` (renders newest entry) → release lock/badge/handlers, stop music.
9. Stop (confirm) → discard everything session-tied; no entry.

```text
ConfigScreen (RHF+zod) ──start──▶ sessionStore ──▶ SessionController ──▶ ActiveSessionScreen
                                     │  ▲                │
                              engine │  │ refreshView    ├─▶ beepSynth (cues.ts planner + ctx clock)
                            (pure)   │  │ (ticker /      ├─▶ musicPlayer (audio el → duckGain)
                                      │  │  visibility)  ├─▶ wakeLock / badging / vibration /
                                      │  │               │    mediaSession / notifications
                                      ▼  │               └─▶ completion → historyStore ──▶ /resumen
                            computeView(state, now)   routinesStore / settingsStore (localStorage)
                                                            musicStore (IndexedDB)
```

---

## 11. Testing strategy (strict TDD; runner installed during scaffold)

### 11.1 Environments & fakes

- **Vitest + jsdom + RTL** (`pnpm test` = `vitest run`, CI-safe). `@vitejs/plugin-react` for TSX; `@/` alias; `setup.ts` = jest-dom + cleanup + navigator stub helpers.
- `src/test/fakes.ts`: `FakeClock` (`now()`, `advance(ms)`, `set(ms)`), `stubAudioContext` (records oscillator/gain calls; enough to assert scheduling), `stubbedNavigator` helpers (delete/define capability APIs).
- `fake-indexeddb` imported by music-store tests only (jsdom lacks IDB).
- Tests colocated (`*.test.ts(x)` next to sources) so every work unit ships its tests with the code.

### 11.2 Unit targets (pure / near-pure — the bulk of TDD evidence)

| Module | Key cases (spec mapping) |
| --- | --- |
| `plan.ts` | Clásico 2 rondas → exact 4-phase sequence/offsets totaling 85 s; 1 ronda → no descanso; Tabata 170 s; descanso largo replaces short rest (no stacking); Personalizado mixed blocks + descanso global placement; block independence; no global rest after final block; labels carry tabata/block context (timer-modes scenarios) |
| `engine.ts` + FakeClock | pause freezes remaining; resume finishes phase 20 s later; **all five HARD GATE scenarios**: background 5 s mid-trabajo → 15 s remaining; tab-switch 50 s across boundary → final trabajo 15 s; sleep 120 s → schedule position; suspension past end → completed + exactly-one-entry semantics at controller level; paused 2 min → still 20 s; 85 s session in 100 ms steps → transitions within 1 s, recorded duration within 1 s (timer-correctness) |
| `cues.ts` | last-3-seconds offsets; 2 s phase → 2 cues; transition cue present at boundary; duck events bracket cues (audio) |
| `stores` | history: add-only-on-completion shape, filterEntries period/type/composition, computeStats incl. empty set (history scenarios); routines: save/list/start-config fidelity, empty name, collision non-overwrite, rename preserves config, delete isolation (routines); settings assignment orphan cleanup |
| `persisted.ts` | v1 round-trip; corrupt JSON → defaults; future-version → migration path; no throw |
| `musicStore.ts` | import persists meta+blob; quota → `MusicImportError{quota}` + library unchanged (fake-indexeddb quota simulation via injected `put` stub); undecodable probe failure; remove clears assignment (audio/local-data) |
| `capabilities/*` | each module no-ops when its API is deleted; detection matrix (pwa degradation) |

### 11.3 Component targets (RTL + jsdom)

- Config screens: invalid values show Spanish messages and block start; valid starts session (timer-modes).
- Builder: add/remove/reorder changes plan order; empty sequence rejected with Spanish error.
- `ActiveSessionScreen` with FakeClock injected through the session store: renders phase/remaining; controls pause/resume/stop; stop confirmation dialog discards; transition visual flash class applied (timer-correctness, workout-completion).
- Completion summary content: mode/rondas/duration from entry; paused-time exclusion shown (85 s not 115 s).
- History screen: filters compose, stats follow filter changes, Spanish labels.
- **Degradation smoke**: delete all capability globals + `AudioContext` → full session flow completes with summary + entry (pwa hard scenario; audio no-Web-Audio scenario).
- Copy spot-checks: mode names verbatim; no background-promise strings from `copy.ts` allowlist.

### 11.4 Offline smoke

§8.3 — `pnpm test:offline`, Playwright/chromium, production build; the R5 evidence artifact for verify.

### 11.5 Not automated in v1

Real audio audibility, real vibration, real wake-lock OS behavior, iOS manual-install flow — covered by capability unit tests + a short manual checklist in verify (platform matrix rows), not by automation.

---

## 12. Work-unit breakdown (chunks ≪ 400 lines each; TDD order)

Hand-written lines are estimates excluding generated/scaffolded files; every unit after U1 is strict RED→GREEN.

| # | Unit | Contents | Key tests | Est. lines |
| --- | --- | --- | --- | --- |
| U1 | Scaffold (RED-exempt) | `create-next-app` (pnpm, TS strict, Tailwind v4, App Router, src/), shadcn init, deps (zustand, RHF, zod, @serwist/*, idb, lucide), Vitest+RTL+jsdom+fake-indexeddb+Playwright install, `vitest.config.ts`, `setup.ts` | runner smoke: one trivial passing test proving `pnpm test` executes vitest run | ~150 (configs) |
| U2 | Tokens + shell | `globals.css` @theme + shadcn vars, fonts via next/font, `AppShell`/NavBar, `StoreHydrationGate` | token render snapshot-ish assertions (dark scheme, no switcher) | ~250 |
| U3 | Timer core I — plan compiler | `types.ts`, `plan.ts` (+ zod `configSchemas`) | all sequence scenarios (§11.2 plan row) | ~300 |
| U4 | Timer core II — engine + clock | `engine.ts`, `clock.ts`/FakeClock | all HARD GATE arithmetic scenarios | ~350 |
| U5 | Config screens — Clásico/Tabata | forms, `DurationField`, navigation to `/sesion` | validation blocks start; valid starts | ~300 |
| U6 | Personalizado builder | `BlockCard`, reorder, descanso global | builder scenarios | ~300 |
| U7 | Session store + active screen | `sessionStore`, `SessionController` (ticker/visibility/completion observers, stop dialog) | component row of §11.3 incl. degradation smoke minus capabilities | ~350 |
| U8 | Completion + history | completion observer wiring, `resumen` screen, `historyStore` + filters/stats + `historial` screen | completion/history scenarios | ~350 |
| U9 | Routines | `routinesStore`, `rutinas` screens, save/rename/delete dialogs | routines scenarios | ~300 |
| U10 | Audio I — beeps | `context.ts`, `cues.ts`, `beepSynth.ts` | planner + stubbed-context scheduling | ~300 |
| U11 | Audio II — music | `db.ts`, `musicStore.ts`, import UI, `duckGain.ts`, `musicPlayer.ts`, assignments in `ajustes` | import/quota/undecodable, duck events, pause/resume | ~350 |
| U12 | PWA I — manifest + SW | `manifest.ts`, icons, `sw.ts`, Serwist config, `/offline`, Playwright offline spec | §8.3 smoke (executed at least once locally) | ~300 |
| U13 | PWA II — capabilities | `capabilities.ts` + 6 modules + `InstallCard`, wired into controller | per-capability no-op tests + full degradation smoke | ~350 |

Dependencies: U3→U4→U7; U5/U6 depend on U3 (schemas) and U2; U8–U13 depend on U7; U12 needs U1 (Playwright) only. This mapping is the direct input to the tasks phase; any unit threatening 400 lines triggers `ask-on-risk` before proceeding (config rule).

---

## 13. Design-level risks & mitigations

| Risk | Mitigation |
| --- | --- |
| **R5 residual** — defaultCache may miss an RSC/data case | §8.3 smoke test is the gate; fix path is a single explicit NetworkFirst rule (§8.2); offline claims not accepted until smoke passes in verify |
| **iOS 7-day storage eviction** — exploration §5.2 says localStorage escapes the cap; WebKit's documented behavior includes localStorage for **non-installed** sites (IndexedDB certainly capped) | Design does not depend on the distinction: install promotion on iOS (§8.1) is the primary defense; all localStorage stores are cheap to rebuild; verify re-checks MDN/WebKit docs during apply. Recorded as a correction note to exploration rather than silent reliance |
| Playwright + fake-indexeddb are stack additions | Dev-only, chromium-only spec, single file each; both directly serve spec scenarios (offline, quota) that jsdom cannot express. Flagged for orchestrator awareness in tasks |
| Media-element ↔ Web Audio coupling (ctx suspended = silent music) | ctx created/resumed on user gestures; visibility-return resume attempt; beep-only sessions unaffected |
| Object-URL leaks from music swaps | Player owns a single active URL; revoke-on-swap is part of `musicPlayer` contract and its tests |
| Stop via lock-screen (Media Session) bypasses confirmation | Documented behavior (§8.4): OS controls act immediately; consistent stop semantics; in-app stop still confirms |
| Session lost on reload mid-workout | Accepted, documented: specs demand wall-clock truth across suspension, not reload survival; honest-boundary copy covers it |
| React Compiler experimental friction at scaffold | Enable `experimental.reactCompiler` in U1; on conflict, drop the flag and keep the no-manual-memoization discipline (app scale makes re-render costs negligible) — decision stays within U1's budget |

---

## 14. Rollout & verification hooks

- Units U1→U13 land sequentially as reviewable commits (each with its tests); `git revert` per unit is the rollback unit (proposal).
- **HARD GATE evidence**: `engine.test.ts` + `ActiveSessionScreen` component tests enumerated in §11.2/§11.3 — verify re-runs `pnpm test` and maps results to the five timer-correctness scenarios by name.
- **Offline evidence**: `pnpm test:offline` output (§8.3) attached to verify.
- **Manual checklist for verify** (platform matrix rows): Android/Chromium (full capabilities), iOS Safari installed (no vibration/badge, manual install, notification gate), desktop Firefox (no badging/shortcuts).
- **Copy audit**: review `copy.ts` + screens for Spanish-only strings, verbatim mode names, zero background-execution promises.
- Update `openspec/config.yaml` `testing.installed: true` after U1 with actual runner evidence.

---

## Appendix — key contracts (condensed)

```ts
// lib/timer/clock.ts
export type Clock = () => number;
export const systemClock: Clock;                    // () => Date.now()
export function createFakeClock(startMs?: number): FakeClock;  // now(), advance(ms), set(ms)

// lib/timer/engine.ts  (all pure)
compilePlan(config: SessionConfig): PhasePlan
startSession(config: SessionConfig, now: number): SessionState
pauseSession(state: SessionState, now: number): SessionState
resumeSession(state: SessionState, now: number): SessionState
computeView(state: SessionState, now: number): SessionView

// lib/audio/cues.ts (pure)
interface CueEvent { atActiveMs: number; kind: "countdown" | "transition"; }
planPhaseCues(phase: ScheduledPhase): CueEvent[]
duckEventsFor(cues: CueEvent[]): DuckEvent[]       // { atCtxTime, duckTo, rampBackAt }

// lib/storage/musicStore.ts
interface TrackMeta { id: string; name: string; mime: string; sizeBytes: number; importedAt: number; }
importTrack(file: File): Promise<TrackMeta>         // throws MusicImportError { code: "quota" | "undecodable" }
list(): Promise<TrackMeta[]>; removeTrack(id): Promise<void>; getObjectUrl(id): Promise<string>

// stores (zustand)
sessionStore: start(config, clock?) / pause() / resume() / stop() / refreshView() — ephemeral
historyStore: addEntry(e) / selectFiltered(filter, now) — persisted v1
routinesStore: save/list/rename/remove — persisted v1 (collision → explicit confirm in UI)
settingsStore: assignments / opt-ins / nudge state — persisted v1

// lib/history/query.ts (pure)
filterEntries(entries, filter, now): HistoryEntry[]
computeStats(filtered): { count; totalMs; avgMs }
```
