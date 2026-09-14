# History Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists).

## Purpose

Define the workout history: recorded fields per completed session, period and type filters, and summary statistics.

## Requirements

### Requirement: Session Record Fields

Every history entry MUST record: the timer type (Clásico, Tabata, or Personalizado); a mode-appropriate effort count — rondas for Clásico, rondas for Tabata (which MAY additionally record the tabata count), bloques for Personalizado; the total active duration in seconds (elapsed time excluding pauses); and the completion date. Exactly one entry exists per naturally completed session; stopped sessions never appear (see the Workout Completion specification).

#### Scenario: Clásico entry fields

- GIVEN a naturally completed Clásico session of 2 rondas and 85 active seconds
- THEN the history entry shows type Clásico, 2 rondas, a duration within 1 s of 85 s, and today's date.

#### Scenario: Personalizado entry fields

- GIVEN a naturally completed Personalizado session of 3 bloques
- THEN the entry shows type Personalizado and 3 bloques, with its active duration and completion date.

### Requirement: Period Filter

The history MUST be filterable by period, offering at least two bounded period options (for example, últimos 7 días and últimos 30 días) and an all-time option. Selecting a period MUST show only entries whose completion date falls within it.

#### Scenario: Period filter narrows the list

- GIVEN entries completed 2 days ago and 20 days ago
- WHEN the user selects últimos 7 días
- THEN only the 2-day-old entry is listed.

#### Scenario: All-time option shows everything

- GIVEN the same entries and the últimos 7 días filter active
- WHEN the user selects toda la historia
- THEN both entries are listed.

### Requirement: Type Filter

The history MUST be filterable by timer type, including an all-types option. Type and period filters MUST compose: when both are active, only entries satisfying both are listed.

#### Scenario: Type filter narrows the list

- GIVEN two Clásico entries and one Tabata entry
- WHEN the user filters by type Tabata
- THEN only the Tabata entry is listed.

#### Scenario: Filters compose

- GIVEN two Clásico entries and one Tabata entry within the last week, and one Clásico entry from a month ago
- WHEN the user filters by type Clásico and últimos 7 días together
- THEN only the two recent Clásico entries are listed.

### Requirement: Summary Statistics

The history MUST display summary statistics over the currently filtered entries: session count, total time (sum of active durations), and average duration (total time divided by session count). The statistics MUST update when the active filters change.

#### Scenario: Stats reflect the filtered set

- GIVEN filtered entries with active durations of 100 s and 200 s
- THEN the stats show 2 sesiones, 300 s total, and 150 s average.

#### Scenario: Stats follow filter changes

- GIVEN the previous filter showing 2 entries, and a different filter whose set contains a single 100 s entry
- WHEN the user applies the different filter
- THEN the stats show 1 sesión, 100 s total, and 100 s average.
