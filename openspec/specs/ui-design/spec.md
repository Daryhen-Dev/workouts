# UI Design Specification

> Full new-domain spec for change `add-pwa-workout-timer` (greenfield — no canonical spec exists).

## Purpose

Define the single visual skin and the language posture: the Gentleman dark token set as the sole Classic skin, and Spanish as the only UI language.

## Requirements

### Requirement: Gentleman Tokens as the Single Classic Skin

All UI MUST be styled exclusively with the Gentleman dark token set documented in exploration §4: background base `#1a1218` with the surface scale (`#20161e`, `#241822`, `#342230`), primary text `#f6eff3` with subtext `#a78e9b`/`#76616b`, pink `#f095c8` as the primary accent, the documented secondary accents, the JetBrains Mono/Iosevka Term and Inter typefaces, and the documented radii, pill, card, and button treatments. The app MUST render a single dark theme (`color-scheme: dark`): no light mode and no additional skins (Cyber Grid and Terminal are out of scope for v1), and no skin or theme switcher may be offered.

#### Scenario: Tokens drive the theme

- WHEN any screen of the app renders
- THEN its backgrounds, text, and accents resolve to the Gentleman token values (auditable against exploration §4), and the document declares a dark color scheme.

#### Scenario: Single skin, no switcher

- GIVEN any screen of the app
- THEN no skin or theme switcher control exists, and only the Classic dark skin renders.

### Requirement: Spanish-Only Interface

All app-authored UI copy MUST be in Spanish, including controls, validation errors, summaries, filters, statistics labels, and empty states. Mode names MUST appear verbatim as Clásico, Tabata, and Personalizado. The app MUST NOT ship i18n machinery in v1; platform-authored strings (e.g., the browser's own install prompt) are outside the app's control.

#### Scenario: Copy audit

- WHEN every user-facing screen is reviewed
- THEN all app-authored strings are in Spanish, and the three mode names appear verbatim.
