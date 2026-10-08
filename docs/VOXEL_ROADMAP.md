# VOXEL — Roadmap

> Maps the VOXEL briefing (115 sections) onto what already exists and what
> ships next. Priority order follows briefing §111. Nothing below is a mock:
> every phase ships working software behind real services.

**Product**: VOXEL — AI-Powered Creation Platform
**Tagline**: Imagine. Create. Build. Play.

---

## Coverage today (briefing § → shipped)

| Briefing | Status |
|---|---|
| §1 audit | ✅ docs/PROJECT_AUDIT.md |
| §4/13/25 AI Creator + agent operating on real projects | ✅ shipped (chat/spec/editor + 12 sandboxed tools, audit trail, budgets) |
| §15-16 project spec & memory | ✅ `.voxel/` (8 files) this phase (was `.nexus/`, kept as fallback) |
| §24 code editor (Monaco) | ✅ |
| §28-29 build + Auto-Fix | ✅ real Gradle, live logs, ≤5 fix loop |
| §30-32 isolated instances + launcher + legit auth | ✅ official SHA-1 runtime, MSA device flow, online-mode always on |
| §34 shader studio | ✅ 32 presets → original GLSL packs, live WebGL preview, editor |
| §36-43 server studio (wizard, styles, console, backups) | ✅ vanilla/Paper, 10 style presets, stdin console, zip-slip-guarded backups |
| §39-40 prison + economy | ✅ datapack modules + SHA-256 Token Chain (compliant in-game currency, §40 rules respected) |
| §41-43 dashboard/console/backup | ✅ (status/players via real SLP; TPS/CPU dashboards → Phase D) |
| §46-47 GitHub + Actions | ✅ device flow, create/push, CI/Release workflows |
| §50 snapshots | ✅ git snapshots + restore/diff |
| §51 Error Center | ✅ categorized, Fix-with-AI |
| §53 security center | ✅ sandbox, guards, keyring, allowlists (CSP pending P5) |
| §63 Ctrl+K palette | ✅ |
| §64-65 settings + provider layer | ✅ (OpenAI-compat/Anthropic/Ollama) |
| §76-77 CI/CD + tests | ✅ 71 automated tests + 6 E2E (mod build, launcher, server cycle, live SLP, ledger, tamper) |
| §78 SQLite schema | ✅ 18 tables (names map 1:1 to briefing list) |
| §87-93 responsive/empty/loading states | ✅ collapsible sidebar, honest empty states, real progress |
| §101 demo project | ✅ Dark Kingdom (compiles, runs) |
| §102 prison demo | ✅ Prison module (mines/ranks/economy/prestige, modular) |
| §104 no-fakes discipline | ✅ enforced by culture + tests |

## Phases (next work, in order)

### Phase A — Rebrand VOXEL (this session)
- App/site/docs rebrand; `.voxel/` memory; `~/VOXEL` default (legacy-safe);
  repo + release `v0.2.0` as VOXEL; audit/roadmap/opencode docs.

### Phase B — Core platform extraction (when mobile work starts)
- `packages/core` from pure services (catalog, presets, motd/slp, spec)
- `apps/desktop` (Tauri) + `apps/mobile` (React Native/Expo — §6/§54)
- Mobile MVP scope (§103): dashboard, AI chat, server control, notifications
- `.agents/` specialization files (§108) + Model Router (§66)

### Phase C — Creation breadth
- Forge & NeoForge templates (§22 — adapter already maps versions)
- Mod Generator expansions (§20: dimensions, biomes, machines, magic…)
- Asset Studio (§19) + Reference Board v2 (§18: tags/usage/relations)
- Version Migration AI (§49: 1.20.1 → newer, guided + compiled + fixed)

### Phase D — Server operations
- Dashboard v2 (§41: TPS/CPU/RAM from console parsing + spark-like probes)
- More server types (§38: Factions, BedWars, SkyWars, RPG as datapack modules)
- VOXEL Deploy (§44-45): Local ✅ → Docker → SSH (providers as interfaces)

### Phase E — Multi-agent & intelligence
- Orchestrator + specialized agents (§26-27: architect/developer/asset/QA/
  reviewer) as personas over the SAME sandboxed tool API
- AI Code Review (§71), Documentation generator (§72), Project Health (§73)
- Consistency Engine (§17) formalized over style/lore/gameplay bibles
- Cost control + context management (§67-68: budgets, semantic selection)

### Phase F — Platform
- Notifications (§62), project clone/export/import UI (§98-100)
- Marketplace metadata architecture (§48, license-first)
- VOXEL Cloud optional sync (§60, §85 — repository abstraction already in place)

## Non-goals (permanent, §32/§82/§104)
No cracked auth, no DRM bypass, no proprietary asset redistribution, no fake
anything. Downloads only from official endpoints with checksums.
