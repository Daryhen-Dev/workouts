# Routines Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists).

## Purpose

Define saving, listing, starting, renaming, and deleting named routines created from any mode configuration.

## Requirements

### Requirement: Save Configuration as Named Routine

From any mode's configuration screen (Clásico, Tabata, or Personalizado), the user MUST be able to save the current configuration as a named routine. A routine name MUST be non-empty; saving with an empty name MUST be rejected with a visible Spanish error. The system MUST NOT silently overwrite an existing different routine that shares the name — a name collision MUST require either explicit overwrite confirmation or rejection.

#### Scenario: Save a Clásico routine

- GIVEN a Clásico configuration of preparación 10 s, trabajo 30 s, descanso 15 s, 2 rondas
- WHEN the user saves it as "Piernas"
- THEN "Piernas" appears in the routines list as a Clásico routine.

#### Scenario: Empty name rejected

- GIVEN any configuration screen
- WHEN the user saves with an empty name
- THEN a visible Spanish error is shown and no routine is created.

#### Scenario: Duplicate names never silently overwrite

- GIVEN an existing routine "Piernas"
- WHEN the user saves a different configuration under the same name
- THEN the system either asks for explicit overwrite confirmation or rejects the save — the original is never replaced silently.

#### Scenario: Personalizado routine keeps the full sequence

- GIVEN a Personalizado configuration of 3 blocks with independent values and descanso global 20 s
- WHEN it is saved as a routine and later started
- THEN the block order, every block's values, and the descanso global are exactly as saved.

### Requirement: Routine List and Direct Start

Saved routines MUST persist locally and be listed with their name and mode. From the list, any routine MUST be startable directly, beginning a session immediately with the saved configuration.

#### Scenario: Start directly from the list

- GIVEN the saved routine "Piernas" (Clásico)
- WHEN the user starts it from the routines list
- THEN a Clásico session begins immediately with preparación 10 s, trabajo 30 s, descanso 15 s, 2 rondas.

#### Scenario: Routines survive reload

- GIVEN one or more saved routines
- WHEN the app is reloaded
- THEN all routines remain listed with name and mode.

### Requirement: Rename Routine

The user MUST be able to rename a saved routine. Renaming MUST preserve the routine's configuration; the new name MUST be non-empty under the same validation as saving.

#### Scenario: Rename preserves configuration

- GIVEN routine "Piernas"
- WHEN the user renames it to "Piernas martes"
- THEN the list shows "Piernas martes" and starting it runs the original configuration unchanged.

### Requirement: Delete Routine

The user MUST be able to delete a saved routine. Deleting a routine MUST NOT delete or alter history entries, imported music, or any other routine.

#### Scenario: Delete removes only the routine

- GIVEN routines "Piernas" and "Brazos", a completed session in history, and an imported track
- WHEN the user deletes "Piernas"
- THEN "Brazos" remains, the history entry remains, and the imported track remains.
