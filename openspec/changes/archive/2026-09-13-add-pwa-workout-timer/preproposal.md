# Pre-Proposal State — add-pwa-workout-timer

Orchestrator-owned pending state before `sdd-proposal`. Created per the SDD
pre-proposal gate: product decisions must be confirmed before proposal launches.

## Status

- explore: completed (`exploration.md`)
- research: unselected (runtime declares no evidence grants; lane would fail closed)
- product decisions: CONFIRMED — see below. Pre-proposal gate SATISFIED.

## Confirmed so far (from earlier session decisions)

- Scope: full timer (Clásico, Tabata, Personalizado), routines, history, phase
  audio cues. NO GPS running in v1.
- Stack: Next.js 15 + TS strict + Tailwind v4 + shadcn/ui + Zustand + RHF/zod,
  pnpm, Vitest (planned). Offline-first installable PWA.
- Design: gentlemanprogramming.com dark tokens (see exploration.md §4).

## Confirmed product decisions (user answers, this session)

1. Phase music source: (b) user-provided audio files, imported via File API and
   stored locally (IndexedDB). Countdown beeps are Web Audio generated in all
   cases. Media Session gets natural sustained audio. No bundled tracks, no
   licensing gate.
2. UI language: Spanish (matching the reference Flutter app; modes keep names
   Clásico / Tabata / Personalizado).
3. App name/brand: Tip Tap Workout (manifest, install UI, home-screen label).
4. Timer skins v1: Classic skin only, styled with the Gentleman design tokens.
   Cyber Grid / Terminal deferred to a future change.

## Handoff rule

Pre-proposal gate satisfied this session: research unselected, product
decisions confirmed above, artifact store ready. `sdd-proposal` receives these
confirmed answers as its handoff and must not re-interview the user.
