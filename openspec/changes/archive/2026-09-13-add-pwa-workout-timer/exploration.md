# Exploration — add-pwa-workout-timer

- **Change**: `add-pwa-workout-timer` — new offline-first workout interval timer PWA
- **Phase**: explore (read-only; no production code)
- **Repo state at exploration**: greenfield. Only `.git/`, `.gitignore`, `.pi/` (local runtime state), and `openspec/` exist. No `package.json`, no source, no tests. Scaffold happens in the apply phase.
- **Evidence provenance** (important — there is no codebase to inspect):
  - Reference-app features: orchestrator-verified from the README of <https://github.com/Daryhen-Dev/flutter_crono> ("Tip Tap Workout", Flutter). Treated as authoritative external evidence, NOT as code inspection of this repo.
  - Stack/scope/design tokens: orchestrator-provided decisions, cross-checked against `openspec/context/workouts.md` and `openspec/config.yaml` (consistent).
  - Browser-support statements: general web-platform knowledge at exploration time, expressed as broad/partial/unsupported with representative versions. Exact version floors should be re-verified against MDN/caniuse during design or apply before being quoted in user-facing docs.

## 1. Product scope (already decided — do not reopen)

- New web app (conceptual port of the Flutter app; no code reuse). Learning goal: real PWA capabilities and reach.
- **In scope (v1)**: full timer feature set (all three modes), routines, history, local persistence, audio cues, PWA capabilities below, three-domain visual design per tokens in §4.
- **Out of scope (v1)**: GPS running / any location features. No backend, no accounts, no sync — 100% local data (mirrors the Flutter app's fully-local behavior).

## 2. Feature inventory from the reference app (README-verified)

These define the functional baseline the spec phase will formalize.

| Area | Reference behavior |
| --- | --- |
| Clásico mode | Preparation, work, rest phases; configurable rounds |
| Tabata mode | Prep, work/rest rounds per tabata, multiple tabatas, long rest between tabatas |
| Personalizado mode | Sequence builder combining Clásico and Tabata blocks; each block has independent values; global rest between blocks |
| Controls (all modes) | Pause, resume, stop |
| Completion | Local workout summary recorded when finished |
| Audio | Selectable work/rest music, looped per phase, pauses/resumes with the timer; countdown beeps generated in memory (not files); music volume ducks during beeps |
| Skins | Classic, Cyber Grid, Terminal |
| Routines | Save configs as reusable routines; start a saved routine directly |
| History | Interval workout history: type, rounds/blocks, duration, date; filter by period and timer type; session summary, total time, average duration |
| Persistence | 100% local (Flutter used SharedPreferences; web equivalent is browser storage) |

## 3. Target stack & constraints

Decided stack (from context/config; consistent with injected `nextjs-15` and `react-19` skill guidance):

- **Next.js 15, App Router, TypeScript strict** — server components by default; the timer app is interaction-heavy so most timer/UI code will be `"use client"` components. Manifest can be delivered via `app/manifest.ts` (Metadata API) or `public/manifest.webmanifest`; Serwist integrates via a `next.config` wrapper (candidate, design decides).
- **React 19** — named imports only; `ref` as a prop (no `forwardRef`); no manual `useMemo`/`useCallback` (compiler handles it); browser APIs (audio, wake lock, vibration) only in client components.
- **Tailwind CSS v4 + shadcn/ui** — Tailwind v4's CSS-first `@theme` maps cleanly to the design tokens in §4.
- **Zustand (+ persist middleware)** — client state + local persistence; backend choice (localStorage vs IndexedDB) is a recorded open decision in `openspec/context/workouts.md`.
- **React Hook Form + zod** — configuration forms (mode editors, routine builder).
- **pnpm**; **Vitest + React Testing Library + jsdom** planned, installed during apply (strict TDD becomes enforceable after the runner smoke test; scaffold itself is RED-exempt per `phase_rules`).
- **Serwist** is the service-worker candidate (actively maintained Workbox fork with Next.js App Router support); confirm vs hand-rolled SW in design.

## 4. Design system tokens (exact, extracted from gentlemanprogramming.com)

Single dark theme only (`color-scheme: dark`); no light mode in v1.

**Backgrounds** (dark→less dark): base `#1a1218` · surface-dim `#20161e` · surface-0 `#241822` · surface-1/overlay `#342230`

**Text**: primary `#f6eff3` · subtext1 `#a78e9b` · subtext0 `#76616b`

**Accents**: pink `#f095c8` (primary accent; glow shadow `#f095c84d`) · green `#b4e7c7` · yellow `#e0c27a` · red `#ff718f` · blue `#a9c7ee` · mauve `#d7a0b8` · pink-bright `#ffb1dd` · peach `#f2b86d` · teal `#c4daf6`

**Fonts**: mono — JetBrains Mono / Iosevka Term; sans — Inter

**Shapes & treatments**: radii 8/12/16px; pills `999px`; cards = surface-dim bg + overlay border, hover → accent border + `translateY(-2px)`; primary button = accent bg + base text + pink glow; hero-style radial glows `#f095c838` and `#b4e7c71f`.

## 5. PWA capability assessment (the learning goal)

All of these require a secure context (HTTPS or localhost). Each is a progressive enhancement: the timer must be fully usable without every capability.

### 5.1 Installability (manifest, icons, shortcuts)

- **Support**: broad — Chromium desktop/Android and Samsung Internet support in-browser install prompts; Firefox desktop supports menu-driven install; iOS Safari requires the manual Share → "Add to Home Screen" flow (no `beforeinstallprompt` event there).
- **Constraints**: Chrome's install criteria need manifest with name, start_url, display standalone, and 192px + 512px icons (the historical requirement of a fetch-handling service worker has been relaxed in Chromium, but we ship a SW anyway for offline). Provide a `maskable` icon variant for Android adaptive launchers; iOS crops its own rounded square. Manifest `shortcuts`: supported on Chromium desktop/Android (long-press launcher; max ~4 shown on Android); not available on iOS Safari or Firefox.
- **Degradation**: iOS users get a manual-install path and no launcher shortcuts; app remains installable-or-bookmarkable everywhere.

### 5.2 Offline-first service worker caching

- **Support**: service workers are supported in all current major browsers (Chrome/Edge/Firefox; Safari including iOS home-screen web apps).
- **Constraints**:
  - **iOS ITP 7-day eviction**: Safari deletes script-writable storage (IndexedDB, Cache Storage, service worker registrations) after 7 days without user interaction unless the app is installed to the home screen. For a 100%-local-data app this argues for actively promoting install on iOS. localStorage is not subject to that cap (subject to ~5MB quota).
  - Next.js App Router emits hashed build assets (safe to precache) plus RSC payloads (need runtime caching rules) — a Serwist-vs-hand-rolled decision for design, with a smoke test for offline navigation in apply.
  - A SW cannot keep the timer alive in the background (see §6, background throttling).
- **Degradation**: without SW support (rare today), the app still runs online and persists data via browser storage.

### 5.3 Wake Lock (screen stays on during workout)

- **Support**: good — Chrome/Edge (desktop + Android) since 84; Safari 16.4+ (macOS and iOS, including home-screen web apps); Firefox shipped on desktop (122+).
- **Constraints**: secure context only; lock auto-releases when the page is hidden, the screen locks, or the OS dims — the standard pattern is to re-acquire on `visibilitychange`. Only held while the app is foregrounded; there is no cross-tab/background wake lock.
- **Degradation**: feature-detect `navigator.wakeLock`; silently skip. Screen may dim mid-workout on old browsers; audio/vibration/visual transitions still cover phase changes.

### 5.4 Media Session API (lock-screen controls)

- **Support**: good — Chromium, Firefox 82+, Safari 15+ (iOS 15.4+ incl. installed web apps).
- **Constraints**: the OS media UI appears while the page is **actually playing audio**. A beep-only app (Web Audio oscillators, per the decided audio baseline) may not surface lock-screen controls, since there is no sustained media playback to anchor the session. The known workaround is a silent/quiet looping `<audio>` anchor element kept playing during a session; if real music is added (open question §7.1), Media Session works naturally during phases. Action handlers (play/pause/stop/previoustrack/nexttrack) can map to timer pause/resume/stop/skip controls.
- **Degradation**: no lock-screen controls; in-app controls remain the authority.

### 5.5 Vibration API (phase transitions)

- **Support**: partial — Android Chrome/Edge/Firefox and Samsung Internet support `navigator.vibrate`; **iOS Safari does not support it at all** (browser or installed PWA); desktop is a non-event.
- **Constraints**: requires prior user activation in some browsers; patterns ignored when the page is hidden on some platforms.
- **Degradation**: feature-detect and no-op; pair every vibration with an audio beep and a visual phase flash so transitions are never missed.

### 5.6 Web Notifications

- **Support**: broad on desktop (Chrome/Edge/Firefox/Safari); **iOS Safari only for home-screen-installed web apps since iOS 16.4**, and the permission prompt must come from a user gesture.
- **Constraints**: requesting permission outside a gesture fails on iOS; delivering a "workout finished" notification from the background is best-effort because mobile browsers suspend JS in background tabs (§6). Foreground notifications should be suppressed in favor of in-app UI.
- **Degradation**: in-app summary + history log remain the record of completion.

### 5.7 App Badging (`navigator.setAppBadge`)

- **Support**: partial — Chromium desktop/Android and Samsung Internet; **not supported in Firefox or any Safari** (macOS/iOS) at exploration time.
- **Constraints**: badge lifetime is browser-managed; cleared via `clearAppBadge`/`setAppBadge(0)`. Use cases here are modest (e.g., flagging an active/paused session); treat it as a capability demo.
- **Degradation**: feature-detect and no-op.

### 5.8 Platform matrix summary (for expectation-setting)

| Capability | Chromium | Firefox | iOS Safari (installed PWA) |
| --- | --- | --- | --- |
| Install prompt | ✅ automatic | ✅ menu-driven | ⚠️ manual A2HS only |
| Offline (SW caching) | ✅ | ✅ | ✅ (7-day eviction if uninstalled) |
| Manifest shortcuts | ✅ | ❌ | ❌ |
| Wake Lock | ✅ | ✅ (desktop) | ✅ 16.4+ |
| Media Session | ✅ | ✅ (partial handlers) | ✅ 15.4+ (needs playing audio) |
| Vibration | ✅ Android | ✅ Android | ❌ |
| Web Notifications | ✅ | ✅ | ✅ 16.4+ installed only |
| App Badging | ✅ | ❌ | ❌ |

**Net assessment**: the timer feature set is 100% feasible with no platform gaps. The PWA learning goal is best exercised on Chromium/Android (all capabilities); iOS is a deliberately degraded-but-usable target (no vibration, no badging, manual install, notifications gated on install).

## 6. Cross-cutting technical constraints

1. **Background timer correctness (highest technical risk)**: mobile browsers throttle/suspend timers in background tabs; a tick-counting timer drifts or stalls. The timer engine must schedule from wall-clock timestamps (`Date.now`/`performance.now`), recompute elapsed state on `visibilitychange`/resume, and correct drift. This is recorded as open decision #3 in `openspec/context/workouts.md` and must be a first-class design topic.
2. **Audio architecture**: countdown beeps generated in memory map cleanly to Web Audio oscillators (no assets needed); ducking is Web Audio gain automation (works for generated and file audio alike). Phase music requires audio assets we do not currently have → open question §7.1.
3. **Persistence**: Zustand persist default is localStorage (~5MB — ample for text-only routines/history); schema versioning + zod migration hooks needed because the Flutter app has no exportable schema to inherit. IndexedDB remains the alternative (open decision #2).
4. **Client-heavy App Router**: nearly all interactive surfaces are client components; server components can still provide static shells (history shell, layout) — keep the boundary deliberate in design.
5. **Review budget**: 400 changed lines per delivery unit (`openspec/config.yaml`). The scaffold (create-next-app + Tailwind v4 + shadcn/ui init + Serwist + Vitest) plus features cannot land as one unit — tasks must be chunked, and delivery strategy is `ask-on-risk`.
6. **Secure context**: every capability in §5 requires HTTPS (or localhost in dev).

## 7. Open product questions — for the orchestrator's pre-proposal round (do NOT decide here)

1. **Phase music**: the Flutter app bundles music files we do not have. Options: (a) Web Audio generated beeps only; (b) user-provided audio files (File API, stored locally); (c) bundle CC0-licensed tracks. Note the interaction with §5.4: option (a) needs the silent-audio-anchor pattern to exercise lock-screen controls; options (b)/(c) make Media Session natural. Any bundling must respect licenses (human-controlled gate if provenance is unclear).
2. **UI language**: Spanish (matching the Flutter app) or English.
3. **App name/brand** for the new PWA.
4. **Timer skins**: Classic only in v1, or port all three (Classic, Cyber Grid, Terminal).

## 8. Feasibility verdict per feature area

| Feature | Web feasibility | Notes |
| --- | --- | --- |
| Clásico / Tabata / Personalizado timers | ✅ full | pure client state machine; Personalizado is the most complex (nested block sequencing) |
| Pause / resume / stop + summary | ✅ full | timestamp-based engine (§6.1) |
| Beeps + ducking | ✅ full | Web Audio API, no assets |
| Phase music | ⚠️ blocked on Q1 | needs asset decision |
| Skins | ✅ full | CSS theming over one component tree; scope gated on Q4 |
| Routines | ✅ full | persisted config schemas (RHF + zod) |
| History + filters + stats | ✅ full | client-side query over persisted records |
| 100% local data | ✅ full | browser storage; see §5.2/§6.3 for platform caveats |

## 9. Risks / unknowns for downstream phases

- **R1 Background suspension** (§6.1) — the Flutter app runs as a native process; the web app does not. Design must own drift-free resumption and "recomputed after backgrounding" behavior; verify with a TDD'd timer engine.
- **R2 Media Session anchor** — lock-screen controls may not appear with beep-only audio; needs the silent-anchor pattern or a music decision (Q1) — design/apply risk.
- **R3 iOS degradation** — no vibration/badging, manual install, notification gate, 7-day storage eviction if not installed; set expectations in UI copy (a "install me" nudge) rather than fighting the platform.
- **R4 Scaffold + review budget** — the apply phase's scaffold step will be large; must be split into work units under 400 lines each; `ask-on-risk` triggers if a unit cannot be sized down.
- **R5 Serwist ↔ App Router precache** — RSC payload/runtime caching rules need validation (offline navigation smoke test) before relying on offline-first claims.
- **R6 Music licensing** — never bundle audio of unknown provenance; CC0 verification is a human-controlled gate.

## 10. Next steps (non-binding, for the orchestrator)

1. Run the pre-proposal round on the four open questions in §7 (they gate proposal/spec content: music scope, copy language, branding/manifest strings, skin scope).
2. Proceed to proposal once §7 is answered; spec then formalizes modes/controls/history as acceptance scenarios; design owns the timer engine, storage schema/versioning, Serwist integration, and the capability-degradation matrix in §5.
