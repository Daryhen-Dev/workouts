# Audio Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists).

## Purpose

Define the two audio systems: countdown beeps generated in memory via Web Audio (no shipped audio assets), and per-phase user-imported music (File API import, IndexedDB storage, looping playback tied to timer state), including ducking and visible failure on import errors.

## Requirements

### Requirement: In-Memory Countdown Beeps

The system MUST generate countdown beeps in memory via the Web Audio API and MUST NOT ship any audio files. During the final 3 seconds of every phase — of every phase kind, in every mode — one beep MUST sound per remaining second (for phases shorter than 3 s, one beep per second of the whole phase), and each phase transition MUST sound a transition cue distinguishable from the countdown beeps. If Web Audio is unavailable, sessions MUST still run correctly without beeps.

#### Scenario: Last-three-seconds convention

- GIVEN a running session in a trabajo phase with 5 s remaining
- THEN beeps sound at 3 s, 2 s, and 1 s remaining, and a distinguishable transition cue sounds at the phase change.

#### Scenario: Short phase

- GIVEN a 2 s phase
- THEN beeps sound at 2 s and 1 s remaining, followed by the transition cue.

#### Scenario: No Web Audio, no failure

- GIVEN an environment where Web Audio is unavailable or blocked
- WHEN a full session runs
- THEN the session completes normally with summary and history, and no crash occurs.

### Requirement: Music Ducking Under Beeps

While phase music is playing, every countdown beep and transition cue MUST lower (duck) the music volume for the duration of the cue and restore it afterwards.

#### Scenario: Duck and restore

- GIVEN descanso music playing with 3 s remaining in the phase
- WHEN the countdown beeps sound
- THEN the music volume is lowered during each beep and restored to its prior level after the beeps end.

### Requirement: User Music Import via File API

The user MUST be able to import audio files from the device through a file picker (File API). Imported files MUST be stored locally (IndexedDB) and MUST persist across app reloads without re-import. Imported tracks MUST be listable and assignable to phase kinds. The app MUST NOT bundle audio assets of any kind.

#### Scenario: Import persists across reload

- GIVEN the user imports a valid MP3 file
- WHEN the app is reloaded
- THEN the track is still present and assignable without re-importing.

#### Scenario: Assignment per phase kind

- GIVEN an imported track
- WHEN the user assigns it to the trabajo phase kind
- THEN subsequent trabajo phases play that track while it remains assigned.

### Requirement: Per-Phase Music Playback

Imported tracks MUST be assignable per phase kind: preparación, trabajo, descanso, descanso largo, and descanso global. While a phase with assigned music is active, its track MUST loop for the whole phase. On phase change, the outgoing track MUST stop and the incoming phase's assigned track — if any — MUST start; a phase with no assigned music is silent except for beeps. Music MUST pause when the timer pauses and resume when the timer resumes.

#### Scenario: Loop during a long phase

- GIVEN a 3-minute descanso with a 1-minute track assigned and the session running
- THEN the track plays on repeat for the whole phase.

#### Scenario: Transition switches tracks

- GIVEN trabajo music and descanso music assigned
- WHEN trabajo ends and descanso begins
- THEN trabajo music stops immediately and descanso music starts.

#### Scenario: Pause and resume with the timer

- GIVEN music playing in an active phase
- WHEN the user pauses and later resumes
- THEN the music pauses with the timer and resumes from where it paused.

### Requirement: Visible Import Failures

When an import fails — storage quota exceeded or the file cannot be decoded — the app MUST show a visible Spanish error identifying the failure, MUST leave the existing music library unchanged, and MUST NOT disturb any running session. Import failures MUST never be silent.

#### Scenario: Quota exceeded

- GIVEN device storage at quota
- WHEN the user imports a large audio file
- THEN a visible Spanish quota error is shown, and the library is unchanged with no partial file recorded.

#### Scenario: Undecodable file

- GIVEN a corrupt or unsupported audio file
- WHEN the user imports it
- THEN a visible Spanish decoding error is shown and the import is rejected without affecting existing tracks.
