# Timer Modes Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists).

## Purpose

Define configuration and run behavior for the three interval timer modes: **Clásico**, **Tabata**, and **Personalizado**. Mode names are product identity and MUST appear verbatim in the Spanish UI.

## Requirements

### Requirement: Clásico Mode Configuration

The system MUST provide a Clásico mode configured by four values: `preparación` duration, `trabajo` duration, `descanso` duration, and round count. Durations MUST be configurable in whole seconds; the round count MUST be a positive integer. The system MUST reject zero, negative, non-numeric, or non-integer values with a visible Spanish validation message, and MUST NOT start a session while any value is invalid.

#### Scenario: Valid configuration starts a session

- GIVEN the Clásico configuration screen
- WHEN the user sets preparación 10 s, trabajo 30 s, descanso 15 s, 2 rondas and starts
- THEN a session begins with exactly those values.

#### Scenario: Invalid values block the start

- GIVEN the Clásico configuration screen with trabajo set to 0
- WHEN the user attempts to start
- THEN a visible Spanish validation error is shown and no session starts.

### Requirement: Clásico Run Behavior

A running Clásico session MUST execute `preparación` once, then the configured rounds of `trabajo`, with `descanso` between consecutive `trabajo` phases only. The session MUST end when the final `trabajo` completes; no `descanso` runs after the final `trabajo`. Each phase lasts its configured duration in wall-clock terms (see the Timer Correctness specification).

#### Scenario: Two-round sequence

- GIVEN preparación 10 s, trabajo 30 s, descanso 15 s, 2 rondas, running without interruption
- THEN the phase sequence is preparación (10 s) → trabajo (30 s) → descanso (15 s) → trabajo (30 s), and the session ends when the final trabajo completes (total 85 s).

#### Scenario: Single-round session has no rest phase

- GIVEN the same values with 1 ronda
- THEN the sequence is preparación (10 s) → trabajo (30 s) and the session ends with no descanso at all.

### Requirement: Tabata Mode Configuration

The system MUST provide a Tabata mode configured by six values: `preparación`, `trabajo`, `descanso` (short rest), rounds per tabata, number of tabatas, and `descanso largo` (long rest between tabatas). Validation MUST match the Clásico configuration requirement: whole-second durations, positive integer counts, visible rejection of invalid values.

#### Scenario: Valid Tabata configuration

- GIVEN the Tabata configuration screen
- WHEN the user sets preparación 10 s, trabajo 20 s, descanso 10 s, 2 rondas per tabata, 2 tabatas, descanso largo 60 s and starts
- THEN a session begins with exactly those values.

### Requirement: Tabata Run Behavior

A running Tabata session MUST execute `preparación` once, then each tabata in order. Within a tabata, `trabajo` phases run for the configured rounds with `descanso` between consecutive `trabajo` phases only. After the final `trabajo` of a tabata: if another tabata follows, `descanso largo` runs — replacing, never stacked on, the short `descanso`; if it is the final tabata, the session ends.

#### Scenario: Two tabatas with long rest

- GIVEN preparación 10 s, trabajo 20 s, descanso 10 s, 2 rondas per tabata, 2 tabatas, descanso largo 60 s, running without interruption
- THEN the sequence is preparación (10) → tabata 1: trabajo (20), descanso (10), trabajo (20) → descanso largo (60) → tabata 2: trabajo (20), descanso (10), trabajo (20) → end (total 170 s).

#### Scenario: Long rest replaces short rest

- GIVEN the session above
- WHEN the final trabajo of tabata 1 completes
- THEN descanso largo starts immediately and no short descanso runs before it.

### Requirement: Personalizado Sequence Builder

The system MUST provide a Personalizado mode as a sequence builder over an ordered list of blocks. Each block is either a **Clásico block** (preparación, trabajo, descanso, rondas) or a **Tabata block** (all six Tabata values), and every block's values MUST be independent of every other block's. A single global `descanso global` value applies between consecutive blocks and follows the same validation rules as all other durations. The builder MUST support adding a block of either type, removing a block, and reordering blocks. Starting a Personalizado session MUST require at least one block; an empty sequence MUST be rejected with a visible Spanish error.

#### Scenario: Mixed sequence runs block by block

- GIVEN a Personalizado sequence with block 1 = Tabata block (trabajo 20 s, descanso 10 s, 2 rondas, 1 tabata), block 2 = Clásico block (trabajo 30 s, descanso 15 s, 1 ronda), and descanso global 20 s
- WHEN the session runs without interruption
- THEN the sequence is block 1's phases → descanso global (20 s) → block 2's phases, and the session ends when block 2's final trabajo completes.

#### Scenario: Block values are independent

- GIVEN two Clásico blocks where block 1 trabajo = 30 s and block 2 trabajo = 45 s
- WHEN the session runs
- THEN block 1's trabajo phases last 30 s and block 2's last 45 s.

#### Scenario: Reordering changes execution order

- GIVEN two blocks A then B
- WHEN the user moves B above A and starts the session
- THEN block B's phases execute before block A's.

#### Scenario: Empty sequence is rejected

- GIVEN a Personalizado sequence with zero blocks
- WHEN the user attempts to start
- THEN a visible Spanish error is shown and no session starts.

### Requirement: Block-Internal Run Rules Match Parent Modes

Each Personalizado block MUST follow the run rules of its own mode: descanso between consecutive trabajo phases only; no trailing descanso at the end of a block (the next element — descanso global or the next block's first phase — follows directly); a Tabata block with multiple tabatas applies its own descanso largo between them; `descanso global` never runs after the final block.

#### Scenario: No rest stacking at block boundaries

- GIVEN the mixed sequence from the builder scenario
- WHEN block 1's final trabajo completes
- THEN descanso global starts immediately, with no block-internal trailing rest before it.

#### Scenario: No global rest after the final block

- GIVEN any Personalizado session
- WHEN the final block's final trabajo completes
- THEN the session ends without a descanso global.

### Requirement: Mode Selection

The app MUST let the user select Clásico, Tabata, or Personalizado from the main UI, and each mode MUST be independently configurable and runnable.

#### Scenario: All modes reachable

- GIVEN the app's main screen
- WHEN the user opens each of Clásico, Tabata, and Personalizado
- THEN each shows its own configuration screen and each can start a session.
