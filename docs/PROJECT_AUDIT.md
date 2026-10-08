# VOXEL — Project Audit

> Audit performed before any rebranding change, per the VOXEL briefing (§1, §113).
> Previous product name: NexusCraft Studio. This document is the baseline of
> what exists, what works, what is missing and how VOXEL grows from here —
> **incrementally, without rewriting what works**.

---

## 1. Current architecture

```
Desktop app (single Tauri 2 app — not yet a monorepo)
├── src/                          React 18 + TypeScript strict + Vite 5 + Tailwind 3.4
│   ├── features/                 home, projects (+workspace), ai-creator,
│   │                             shaders, servers, settings, roadmap
│   ├── services/                 db repositories, ai (providers/streaming/agent),
│   │                             build, launcher, servers (+modules/presets/SLP),
│   │                             shaders, github, minecraft catalog, storage
│   ├── stores/                   zustand (settings, projects, ui)
│   └── components/               ui kit (shadcn-style), layout, palette, ErrorBoundary
├── src-tauri/                    Rust core — the security perimeter
│   ├── commands/                 fs (path guard), git (snapshots), process (allowlist),
│   │                             projects, templates (embedded, include_bytes!),
│   │                             launcher (official SHA-1 downloads), servers
│   │                             (+SLP ping), ledger (SHA-256 chain), shaders,
│   │                             tunnel (playit.gg), github, secrets (keyring),
│   │                             storage, environment, serverping
│   └── migrations/               SQLite append-only (001, 002)
├── website/                      Static landing page (no framework) → GitHub Pages
└── .github/workflows/            ci.yml, release.yml (multi-OS), pages.yml
```

**Security model (AD-1)**: every FS/process/secret operation goes through
Rust commands with path guards, process allowlists and OS keyring. The
frontend never touches the system directly. No shell execution with user
input anywhere.

## 2. Technologies

| Layer | Choice | Notes |
|---|---|---|
| Desktop shell | Tauri 2.12 | npm↔crate versions aligned (was a release blocker once) |
| Frontend | React 18 + TS strict + Vite 5 | ESLint 9, Vitest 2 (vite 5 constraint) |
| UI | Tailwind 3.4, custom `nexus-dark` tokens, glass, Ctrl+K palette | rebrand → VOXEL Design System |
| Editor | Monaco (local, workers `?worker`) | cpp mapping for fsh/vsh/glsl |
| Data | SQLite via tauri-plugin-sql (18 tables, migrations append-only) | identifier kept → user DB preserved |
| Build | Gradle 8.8 wrapper, shared cache | real jar builds, E2E proven |
| AI | Provider layer: OpenAI-compatible / Anthropic / Ollama, streaming + vision | single orchestrator agent + 12 sandboxed tools |
| CI/CD | GitHub Actions: CI (lint/type/test/build), Release (Win/Linux/macOS arm64+x64), Pages | release assets validated publicly |

## 3. What exists and REALLY works (verified by tests/E2E)

| Capability | Proof |
|---|---|
| Project creation from embedded Fabric 1.20.1 template (token engine) | cargo tests + E2E jar build |
| Monaco editor, file tree, git snapshots (create/list/restore/diff) | unit + live |
| AI Creator: streaming chat, spec extraction, reference board (vision) | live |
| Nexus Agent: 12 sandboxed tools, ≤8 steps/≤30 writes, audit trail, auto-snapshot, UI confirmations | unit + live |
| Build system: real `./gradlew build`, live terminal, Error Center, Auto-Fix (≤5) | E2E compiled `e2e-dark-kingdom-0.1.0.jar` |
| Launcher: official Mojang runtime downloads (SHA-1, 3.6k files/718MB), isolated instances, MSA device flow, mod deploy | E2E full prepare |
| Server Studio: vanilla/Paper official jars, live console (stdin), world-safe stop, backups/restore (zip-slip guarded), properties editor | E2E full lifecycle |
| Server styles: 10 presets (official + community), properties overrides (online-mode never settable) | unit + wizard |
| Live server import: real SLP ping in Rust (MOTD/colors, favicon, players), deterministic style inference, AI-designed styles (sanitized) | **E2E live vs mc.hypixel.net** |
| Server modules: Economy / Prison / Token Chain datapacks (mixable) | vitest |
| Token Chain: SHA-256 hash-chain ledger, mint/transfer/burn/verify, tamper detection | cargo tests |
| Free public tunnel (playit.gg) | live |
| Shader Studio: 32 style presets → 100% original Iris/OptiFire packs, live WebGL preview, Monaco editor, install-to-instance | vitest + generator sanity tests |
| GitHub: device flow, create repo, push (transient header, token never on disk) | live (this repo) |
| Version catalog: Mojang/Fabric/Forge/NeoForge/Paper auto-update (12h TTL) + 2026 scheme (`26.x`, mojmap fallback) | live endpoints |
| Multi-OS releases + public site | v0.1.1/v0.1.2 published, assets HTTP-206 validated |
| Quality | 27 cargo unit (+4 ignored E2E), 44 vitest, lint 0 errors, CI green |

## 4. Placeholders / honest non-features

- Roadmap page (features not built show honest empty states — no fakes).
- `cloudConfig.ts`: UnconfiguredCloudBackend (Supabase optional, honest).
- Forge/NeoForge: **version adapter maps versions; Java templates not shipped** (Fabric only).
- Monorepo packages (apps/, packages/): **not yet adopted** — single-app layout works; migration is planned (§6) only when mobile/core-sharing becomes real.
- Multi-agent system: **one orchestrator agent** today; specialized agents are architecture slots (see Roadmap).
- Marketplace / Deploy / Docker / Performance center: not implemented (roadmap).

## 5. Problems found (technical debt)

| # | Problem | Impact | Plan |
|---|---|---|---|
| P1 | `@tauri-apps/api` was 2.9 vs crate 2.12 (fixed in v0.1.1) | release build fatal | done |
| P2 | ~15 `set-state-in-effect` lint warnings | refactor debt | migrate gradually (React 19 use() / callbacks) |
| P3 | `tauri dev` CLI rewrites Cargo.toml (`features = []`, neutral) | churn | re-check after checkout; keep reverted |
| P4 | Datapack namespaces `nexus_*` and currency `NexusCoin` are committed in existing servers | renaming breaks worlds | **kept for compat**; new servers default to `VoxelCoin`; namespaces documented |
| P5 | CSP is null in tauri.conf | hardening gap | backlog (set CSP post-rebrand) |
| P6 | Single-agent AI: no model routing/cost control | cost/quality | Roadmap F2 |
| P7 | No LICENSE file in a public repo | legal clarity | owner decision required |

## 6. Migration & evolution plan (incremental — no rewrite)

**Phase A (this session): Rebrand → VOXEL + docs**
- UI wordmarks, titles, about, legal (§81/§82), splash, settings strings
- `productName: "VOXEL"`, package.json `name: voxel`
- Project memory: template bootstraps **`.voxel/`** (8 files, §15-16:
  project-spec, ai-memory, style-bible, lore-bible, gameplay-bible,
  architecture, asset-index, decisions) with **`.nexus/` backward-compat**
  (contextService reads `.voxel` first)
- Default workspace: `~/VOXEL` for new installs; existing `~/NexusCraft`
  is auto-detected and kept (zero breakage)
- Internal identifiers **unchanged** (`dev.yuadevs.nexuscraft-studio`,
  crate name, DB filename) — user data survives (§80)
- Docs: PROJECT_AUDIT (this), VOXEL_ROADMAP, OPENCODE
- GitHub repo rename (redirect automatic) + site rebrand
- Release v0.2.0 as VOXEL (assets become `VOXEL_0.2.0_*`)

**Phase B: platform architecture (when mobile starts)**
- Extract `packages/core` (types, project-spec, catalog, SLP/motd parsers,
  preset catalogs) — these are already pure TS with tests, extraction is
  mechanical
- `apps/desktop` keeps Tauri shell; `apps/mobile` (React Native/Expo)
- Do NOT pre-extract prematurely (briefing §79: adapt, don't restructure blindly)

**Phase C+: see VOXEL_ROADMAP.md**

## 7. Risks

| Risk | Mitigation |
|---|---|
| Rebrand breaks user data | identifiers/DB/paths unchanged; legacy workspace fallback; E2E suite green gate |
| Asset name change confuses downloaders | site/release notes document the new names (`VOXEL_…`) |
| Datapack rename breaks existing worlds | namespaces kept; only new servers change defaults |
| Scope explosion (briefing is huge) | roadmap phases; never big-bang |
| Repo rename breaks links | GitHub auto-redirects; site updated same session |

## 8. OpenCode / agent configuration inventory (§106-108)

- `AGENTS.md` (repo root): continuity rules (read Plan.md first, verify before code, camelCase contract, E2E culture)
- `~/.config/opencode/AGENTS.md`: global agents (architect, builder, game-dev, reviewer, debugger, quick)
- Continuity: `Plan.md` (16 sessions documented) — remains the master memory; `docs/OPENCODE.md` documents agents/workflows for OpenCode-driven development
- `.agents/` specialization files: **to create in Phase B** (orchestrator exists in code: `src/services/ai/agent/`)
