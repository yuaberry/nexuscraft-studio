# VOXEL — OpenCode Development Guide

How to develop VOXEL through OpenCode (or any agent-driven workflow) without
breaking the project. This documents the agents, their responsibilities, the
commands and the verification gates.

## Repository agent rules (hierarchy)

1. `~/.config/opencode/AGENTS.md` — global environment rules (Yua Devs
   principles: analyze before changing, small verifiable changes, no
   destructive rewrites).
2. `AGENTS.md` (repo root) — **read `Plan.md` first** (continuity memory),
   verify before code (typecheck + lint + vitest + cargo must be green),
   respect the security perimeter (Rust commands), camelCase serialization
   contract, E2E culture, conventional commits.
3. `docs/PROJECT_AUDIT.md` + `docs/VOXEL_ROADMAP.md` — what exists, what is
   planned, phasing.

## Agents (OpenCode) and when to use them

| Agent | Use for |
|---|---|
| `architect` | Planning phases/features, audit reviews, migrations |
| `builder` (this agent) | Implementation: code, tests, builds, releases |
| `reviewer` | Audits after risky changes (security, serialization, perf) |
| `debugger` | Root-cause hunting: reproduce → fix → regression test |
| `quick`/`general` | Exploration, greps, summaries |

## The VOXEL verification gate (before ANY commit)

```bash
cd ~/voxel            # (repo; was nexuscraft-studio — redirects exist)
pnpm typecheck && pnpm lint && pnpm test:unit   # 0 errors allowed
cd src-tauri && cargo test                       # all green
```

Critical systems also have E2E (run on demand, network/time):
```bash
cargo test -- --ignored --nocapture
# gradle build (real jar), launcher prepare (718MB official), server
# lifecycle (boot/stop/backup/restore), live SLP ping, ledger verify
```

## Key invariants — never break these

- **Security perimeter**: all FS/process/secrets through `src-tauri/src/commands/*`
  (path guard, allowlists, keyring). Frontend never touches the OS.
- **Serialization**: Rust results are camelCase (`rename_all`); TS reads camelCase.
- **Migrations append-only** (`src-tauri/src/migrations/`).
- **`online-mode=true`** is never settable via presets/properties (tested).
- **No fake data**: features without backends get honest empty/roadmap states.
- **Downloads** only from official endpoints with checksums (Mojang, Fabric,
  Paper, playit.gg, Modrinth search links for third-party references).
- **IDs kept stable across rebrand**: app identifier, DB filename, datapack
  namespaces (`nexus_*`) — user data and existing worlds must survive.

## Project memory (for agents working on a project)

Every generated project carries `.voxel/`:
`project-spec.json` (source of truth), `ai-memory.md`, `style-bible.md`,
`lore-bible.md`, `gameplay-bible.md`, `architecture.md`, `asset-index.json`,
`decisions.md`. Significant AI changes consult these first (older projects
use `.nexus/` — read as fallback).

## Continuity

`Plan.md` at the repo root is the master session memory (16+ sessions):
architecture decisions, bug war-stories (never re-introduce them), phase
status, verification state. When the owner says *"crie o arquivo Plan.md"*,
regenerate it with the full current state and commit.
