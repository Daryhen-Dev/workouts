# PWA Capability Layer Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists). Exploration §5 is the capability/degradation evidence base.

## Purpose

Define the progressive-enhancement PWA layer — manifest and installability, offline usability, Wake Lock, Media Session, Vibration, Notifications, and app badging — and the rule that every capability degrades without breaking the core timer.

## Requirements

### Requirement: Degradation Never Breaks the Core Timer

Every PWA capability in this specification is a progressive enhancement. The absence, denial, or failure of any subset of capabilities MUST NOT prevent configuring, running, controlling, completing, or recording a session in any mode.

#### Scenario: All capabilities unavailable

- GIVEN an environment where the install prompt, Wake Lock, Media Session, Vibration, Notifications, and badging are all unavailable, and the service worker cannot register
- WHEN the user runs a full Clásico session
- THEN the session completes with its summary and history entry.

### Requirement: Web App Manifest

The app MUST serve a web app manifest with name "Tip Tap Workout", a start URL, `display: standalone`, and icons of at least 192 px and 512 px, at least one of which declares the `maskable` purpose.

#### Scenario: Manifest is valid

- WHEN the manifest is fetched from the app URL
- THEN it declares the required name, start URL, standalone display, and both icon sizes with a maskable variant.

### Requirement: Install Affordance and iOS Manual Path

Where the platform fires `beforeinstallprompt` (Chromium-family browsers), the app MUST offer an in-app install affordance that triggers the platform install flow, and MUST stop offering it after a successful install. When running in an iOS Safari browser context (not installed to the home screen), the UI MUST present dismissible guidance explaining the manual Compartir → "Añadir a pantalla de inicio" path; guidance MUST NOT block any functionality.

#### Scenario: Chromium install flow

- GIVEN the app loaded in a Chromium-family browser that fires beforeinstallprompt
- WHEN the user uses the in-app install affordance
- THEN the platform install flow opens, and after a successful install the affordance no longer appears.

#### Scenario: iOS manual path explained

- GIVEN the app opened in iOS Safari (not installed)
- THEN install guidance explains the Share → Add to Home Screen steps and can be dismissed, with all features usable without installing.

### Requirement: Launcher Shortcuts

The manifest SHOULD declare launcher shortcuts that start timer modes where the platform supports them. Platforms without shortcut support MUST experience no error and no missing functionality.

#### Scenario: Shortcuts where supported, absent harmlessly elsewhere

- GIVEN the manifest declares mode shortcuts
- WHEN the app is installed on a platform with shortcut support
- THEN the launcher long-press lists the shortcuts; on a platform without support (e.g., iOS), no shortcuts appear and nothing breaks.

### Requirement: Offline Usability After First Load

After the first successful load of the app, with the network unavailable, the app MUST load and remain fully usable offline: all three timer modes configure and run, routines save and start, history lists and filters, and previously imported music plays. In environments without service worker support, the app MUST still function online with all data persisting locally.

#### Scenario: Full offline session after first load

- GIVEN the app has been loaded once online
- WHEN the device goes offline and the app is reloaded
- THEN the app loads, a Personalizado routine starts and completes, its summary shows, and its history entry is recorded — all with no network.

#### Scenario: No service worker support

- GIVEN a browser without service worker support
- WHEN the app is used online
- THEN all features work and saved data persists across reloads.

### Requirement: Wake Lock During Active Workout

While a session is in progress (running or paused) and the app is foregrounded, the app MUST hold a screen wake lock; on returning to the foreground via visibility change, it MUST re-acquire the lock if the session is still in progress. The lock MUST be released when the session ends (completion or stop). Where Wake Lock is unsupported, it MUST be skipped silently.

#### Scenario: Lock held, re-acquired, released

- GIVEN a running session in a supporting browser
- THEN a wake lock is held; after hiding and returning to the app mid-session, the lock is re-acquired; after the session ends, no lock remains.

#### Scenario: Unsupported platforms skip silently

- GIVEN a browser without Wake Lock support
- WHEN a full session runs
- THEN nothing fails and the session completes normally.

### Requirement: Media Session Controls While Music Plays

While phase music is actually playing, the app MUST expose Media Session metadata identifying the session and MUST map action handlers so play/pause toggles resume/pause and stop stops the session. In beep-only sessions (no music playing), lock-screen controls MAY be absent — an accepted degradation; in-app controls remain authoritative in all cases.

#### Scenario: Lock-screen pause pauses the timer

- GIVEN a running session with trabajo music playing on a supporting platform
- WHEN the user invokes pause from the OS media controls
- THEN the timer pauses and the music pauses with it; invoking play resumes both.

#### Scenario: Beep-only degradation

- GIVEN a running session with no music assigned
- THEN the session functions fully via in-app controls even if no OS media UI appears.

### Requirement: Vibration on Phase Transitions

Where the Vibration API is supported, every phase transition MUST trigger a vibration, and every vibration MUST be paired with the transition beep and a visible phase change so transitions are never missed. Where unsupported (notably iOS), it MUST be a no-op without errors.

#### Scenario: Paired cues on Android

- GIVEN a running session on an Android browser
- WHEN a phase transition occurs
- THEN the device vibrates, the transition beep sounds, and the phase display visibly changes.

#### Scenario: No-op on iOS

- GIVEN the same session on iOS
- THEN no vibration occurs, no error surfaces, and beep plus visual change still mark the transition.

### Requirement: Notifications in Installed Contexts

Notification permission MUST only be requested from a user gesture. In installed contexts, a workout-completed notification is best-effort; when a session completes while the app is foregrounded, the OS notification MUST be suppressed in favor of the in-app summary, which — with the history entry — remains the authoritative record of completion. Denied or unavailable permission MUST NOT reduce functionality.

#### Scenario: Permission only from a gesture

- GIVEN a fresh install where the user has not opted into notifications
- WHEN the app loads and a session runs
- THEN no permission prompt appears; only after the user taps the notifications opt-in does the prompt appear.

#### Scenario: Foreground completion suppresses the OS notification

- GIVEN notifications enabled and a session completing in the foreground
- THEN no OS notification is shown; the in-app summary and history entry record the completion.

### Requirement: App Badging

Where the badging API is supported (Chromium-family), the app MUST set a badge while a session is in progress and clear it when the session ends (completion or stop). The badge MAY distinguish a paused session. Where unsupported, badging MUST be a no-op without errors.

#### Scenario: Badge lifecycle on Chromium

- GIVEN a supporting browser
- WHEN a session starts
- THEN a badge appears; when the session is stopped or completes, the badge is cleared.

#### Scenario: No badge elsewhere

- GIVEN Firefox or Safari
- WHEN sessions run and end
- THEN no badge is set, nothing errors, and the sessions behave identically.
