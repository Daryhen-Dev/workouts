# SDD Project Context — workouts

Init artifact for the SDD pipeline. Later phases (proposal, spec, design,
tasks, apply, verify, archive) should read this before planning work.

## Status

- **Greenfield repository**: only `.git/`, `.atl/` (gitignored local registry), `.pi/` (local runtime state), and `.gitignore` exist at init time. No `package.json`, no source, no tests.
- **Scaffold deferred**: the entire stack below is planned, not installed. The apply phase scaffolds it (e.g., `create-next-app` with pnpm, Tailwind v4, shadcn/ui init, Serwist, then dev/test dependencies).
- Artifact store: `openspec/` (this directory). SDD config: `openspec/config.yaml`.

## Product

Offline-first workout interval timer PWA:

- **Timer modes**: Classic, Tabata, Custom (work/rest/rounds/prepare configurable).
- **Routines**: user-defined sequences of timer settings, persisted locally.
- **History**: completed sessions log.
- **Audio**: phase-transition beeps via Web Audio API (no audio files required).
- **Offline-first**: works fully offline after first load; installable PWA with web app manifest and service worker.

## Stack (planned)

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15, App Router, TypeScript (strict) |
| PWA | Web app manifest + service worker; **Serwist** (candidate) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Client state | Zustand (+ persistence middleware) |
| Forms | React Hook Form + zod |
| Package manager | pnpm |

## Testing (planned — not yet installed)

- **Runner**: Vitest, executed via `pnpm test` (vitest run, non-watch).
- **Support**: React Testing Library + jsdom.
- **Strict TDD**: declared active at init, but evidence obligations only become
  enforceable after the apply phase installs the runner. The scaffold step is
  RED-exempt and must end with a smoke test proving `pnpm test` works.
- When installed, update `testing.installed: true` in `openspec/config.yaml`.

## Conventions decided at init

- All SDD artifacts live under `openspec/`.
- Phase pipeline and gates are defined in `openspec/config.yaml` (`phase_rules`); delivery strategy is `ask-on-risk` with a 400-line review budget; no chain strategy chosen yet.
- Skill registry for delegation: `.atl/skill-registry.md` (exists, local-only because `.atl/` is gitignored). Relevant indexed skills for this stack: `nextjs-15`, `react-19`, `tailwind-4`, `typescript`, `zod-4`.

## Open decisions (to resolve in later phases)

1. Serwist integration strategy vs. hand-rolled service worker (confirm during design).
2. Zustand persistence backend (localStorage vs. IndexedDB) and schema versioning/migrations.
3. Exact timer engine design (how interval state survives tab suspension/backgrounding offline).
4. History data model and any export/import format.
5. Web Audio scheduling approach (AudioContext clock vs. setTimeout drift handling).
