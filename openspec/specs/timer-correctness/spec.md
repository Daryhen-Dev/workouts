# Timer Correctness Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists). This domain carries the change's HARD GATE (exploration risk R1).

## Purpose

Define session control behavior (pause, resume, stop) and the wall-clock truth contract that governs displayed state after backgrounding, tab switching, and device sleep/resume — including the deliberate, honest boundary that the app does not execute while the platform suspends it.

## Requirements

### Requirement: Session Controls

During any running session, in every mode and every phase (including preparación), the system MUST provide pause, resume, and stop. Pause MUST freeze the current phase and its remaining time; resume MUST continue the same phase from the frozen remaining time; stop MUST end the session immediately with no further phases executing.

#### Scenario: Pause freezes the countdown

- GIVEN a running Clásico session in trabajo with 20 s remaining
- WHEN the user pauses
- THEN the displayed phase remains trabajo, the remaining time stays at 20 s, and no phase transition occurs while paused.

#### Scenario: Resume continues the same phase

- GIVEN a paused session in trabajo with 20 s remaining
- WHEN the user resumes
- THEN trabajo continues and completes 20 s later in wall-clock terms.

#### Scenario: Stop ends the session immediately

- GIVEN a running session with trabajo and descanso phases still ahead
- WHEN the user stops
- THEN the session ends at once, no further phases execute, and the discard rules of the Workout Completion specification apply.

### Requirement: Wall-Clock Truth (HARD GATE)

At every render, the displayed phase and remaining time MUST equal wall-clock truth: the state implied by real elapsed time since session start, minus accumulated paused time, under the session's configured phase schedule — never a count of timer ticks. After the app returns to the foreground from backgrounding, tab switching, or device sleep/resume, the displayed remaining time MUST match wall-clock truth within 1 second, and the displayed phase MUST be exactly the wall-clock-implied phase. Cumulative drift over a complete uninterrupted session MUST NOT exceed 1 second. This requirement gates acceptance of the entire change.

#### Scenario: Return from background mid-phase

- GIVEN a running Clásico session (preparación 10 s, trabajo 30 s, descanso 15 s, 2 rondas) in the first trabajo with 20 s remaining
- WHEN the app is backgrounded for 5 s and returns to the foreground
- THEN the display shows trabajo with 15 s remaining (±1 s).

#### Scenario: Return from tab switch across a phase boundary

- GIVEN the same session in the first trabajo with 20 s remaining
- WHEN the user switches to another tab for 50 s and returns
- THEN the display shows the final trabajo with 15 s remaining (±1 s), because wall-clock time has consumed the rest of trabajo (20 s), descanso (15 s), and 15 s of the final trabajo.

#### Scenario: Sleep/resume across multiple boundaries

- GIVEN a running Tabata session in tabata 1's first trabajo with 5 s remaining
- WHEN the device sleeps for 120 s and resumes with the app foregrounded
- THEN the displayed phase and remaining time equal the schedule position implied by 120 s of elapsed wall-clock time (±1 s), not the pre-sleep position.

#### Scenario: Session completes while suspended

- GIVEN a running session whose remaining configured duration is 60 s
- WHEN the app is suspended for 5 minutes and the user returns
- THEN the session is complete: the completion summary is shown and exactly one history entry with the configured totals is recorded (see the Workout Completion and History specifications).

#### Scenario: Paused sessions do not consume time while suspended

- GIVEN a paused session in trabajo with 20 s remaining
- WHEN the app is backgrounded for 2 minutes and returns
- THEN the session is still paused, the phase is trabajo, and the remaining time is 20 s (±1 s).

#### Scenario: Full-session drift is imperceptible

- GIVEN the 85 s two-round Clásico session running uninterrupted to completion
- THEN every phase transition is observed within 1 s of its scheduled wall-clock time, and the recorded active duration is within 1 s of 85 s.

### Requirement: Honest No-Background-Execution Boundary

While the platform has suspended the page (backgrounded, hidden tab, device sleep), the app MUST NOT be required to play beeps, update the timer display, continue phase music, vibrate, or deliver notifications; recomputation on return is the only promise. The app MUST NOT present any UI copy that promises continued timing or audio while backgrounded. After a suspension, the phase music that plays on return MUST be the music assigned to the wall-clock-implied current phase, not the pre-suspension phase.

#### Scenario: No cues are owed during suspension

- GIVEN a running session with phase music playing
- WHEN the page is suspended by the platform
- THEN no beeps, vibrations, display updates, or music are required during suspension, and on return the display equals wall-clock truth per the HARD GATE requirement.

#### Scenario: Copy does not overpromise

- GIVEN any app screen
- WHEN the UI copy is reviewed
- THEN no string promises background execution (no claim that the timer keeps counting or sounding while the app is in the background).

#### Scenario: Music follows the recomputed phase

- GIVEN trabajo music and descanso music assigned, with the session in trabajo
- WHEN the app is suspended long enough that wall-clock truth has moved into descanso, then returns
- THEN descanso music is what plays, and trabajo music does not resume.
