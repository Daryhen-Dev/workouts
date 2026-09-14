# Workout Completion Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists).

## Purpose

Define what happens when a session ends: the completion summary and history recording for naturally completed sessions, and the discard rule for manually stopped sessions (the proposal's confirmed default direction).

## Requirements

### Requirement: Natural Completion Summary

When the final phase of any session ends naturally — in the foreground or recomputed after a suspension — the app MUST present a Spanish completion summary (resumen) containing at least the mode (Clásico, Tabata, or Personalizado), the completed rounds or blocks, and the total active duration. Total active duration MUST be elapsed session time minus accumulated paused time.

#### Scenario: Summary after a complete session

- GIVEN the 85 s two-round Clásico session completes without pause
- THEN the summary shows mode Clásico, 2 rondas, and a total duration within 1 s of 85 s.

#### Scenario: Paused time is excluded from duration

- GIVEN the same session with a 30 s pause in the middle
- THEN the summary's total duration is within 1 s of 85 s, not 115 s.

### Requirement: History Entry on Natural Completion

Every naturally completed session MUST create exactly one history entry carrying the fields required by the History specification. Manually stopped sessions MUST NOT create a history entry.

#### Scenario: Completion creates exactly one entry

- GIVEN an empty history and a naturally completed Tabata session
- WHEN the user opens the history list
- THEN it contains exactly one entry for that session, of type Tabata.

### Requirement: Manual Stop Discards the Session

When the user stops a session manually, the app MUST discard it: no completion summary is presented as a completed workout, no history entry is created, phase music stops, and any session-tied capability state (app badge, wake lock) is released. The app SHOULD ask for confirmation before discarding an in-progress session.

#### Scenario: Stopped session leaves no record

- GIVEN a running session and a history containing 2 entries
- WHEN the user stops (and confirms, if asked) during trabajo
- THEN no summary is presented, the history still contains exactly 2 entries, and no session badge or wake lock remains.

#### Scenario: Stop while paused also discards

- GIVEN a paused session
- WHEN the user stops (and confirms, if asked)
- THEN the session is discarded with no history entry.
