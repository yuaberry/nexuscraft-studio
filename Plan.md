# Plan.md — NEXUSCRAFT STUDIO · Documento-Mãe de Continuidade

> **⚡ AI Minecraft Creation Studio** — o usuário descreve em linguagem natural; o agente opera sobre um projeto REAL (arquivos, código, build, launcher, servidores, GitHub) com sandbox e auditoria. Nada de fake data — nunca.
>
> **Este arquivo é a memória integral do projeto.** Se o chat foi compactado: leia este documento INTEIRO, depois o `README.md` e o `docs/architecture.md`, execute o Protocolo de Retomada (§12) e só então toque em código.
>
> **REGRA PERMANENTE DO DONO**: quando ele disser *"crie o arquivo Plan.md"*, gerar/atualizar este documento com o estado atual completo (sessões, decisões, riscos, roadmap) e commitar. Este arquivo é a base de continuidade pós-compactação.

---

## 1. Identidade do produto

| Campo | Valor |
|---|---|
| Nome | NexusCraft Studio · curto: NexusCraft |
| Tagline | "Imagine it. Describe it. Build it. Play it." |
| Descrição | AI Minecraft Creation Studio |
| Repo local | `~/nexuscraft-studio` (branch `main`) |
| GitHub | https://github.com/yuaberry/nexuscraft-studio (PRIVATE, conta `yuaberry`) |
| gh CLI | Autenticado (scopes: gist, read:org, repo, workflow) |
| Release | Tag `v0.1.0` pushed → Release workflow building (.exe/.dmg/.deb/.AppImage) |
| Commit count | 25+ commits, tree sempre limpa |
| Legal | "Independent third-party tool. Not affiliated with Mojang Studios or Microsoft." |
| Idioma | Prompts do dono: PT-BR · Produto/commits: inglês |

## 2. Stack (estabelecida e funcionando — não mudar sem justificativa)

- **Frontend**: React 18 + TypeScript (strict) + Vite 5 + Tailwind 3.4 (shadcn-style, tema dark próprio `nexus-dark`, acentos purple/cyan/blue via `data-accent`), fonts Inter Variable + JetBrains Mono, zustand, react-router (HashRouter), lucide, sonner, cmdk, react-markdown, @monaco-editor/react (bundled local, workers via `?worker`, exports-map: imports SEM prefixo `esm/vs/`)
- **Backend**: Tauri 2 (Rust) — crates: tauri, tauri-plugin-sql (SQLite), tauri-plugin-http, tauri-plugin-dialog, reqwest 0.13 (blocking+rustls default), sha1, sha2, zip, keyring 3
- **Build frontend**: `NODE_OPTIONS=--max-old-space-size=4096` no script `build` (Monaco exige — OOM sem isso)
- **Qualidade**: ESLint 9 (flat config `eslint.config.js`), Vitest 2, CI `.github/workflows/ci.yml`, Release `.github/workflows/release.yml`
- **Sistema**: Java 21 (OpenJDK), Gradle 8.8 wrapper, git, Linux Mint (webkit2gtk-4.1 ✓)
- **Dev**: pnpm 12 (não usar bun para scripts do tauri); `pnpm tauri dev`
- **⚠️ Versões críticas**: vitest@2 (não 5 — vite 5 incompatível), eslint@9 (não 10 — node 18), reqwest 0.13 com rustls default (não `--features rustls-tls` — mudou a API)

## 3. Estrutura essencial

```
src/
  components/ (ui shadcn-style, layout, brand, CommandPalette, AboutDialog, ErrorBoundary)
  features/
    home/                     # Launcher-style home com projetos reais
    projects/                 # + workspace/ (BuildDrawer, LaunchDialog, PublishDialog, FileTree, SnapshotPanel)
    ai-creator/               # (ChatPanel, SpecPreview, InspectorPanel, ChangesView)
    shaders/                  # (ShadersPage, ShaderPreviewCanvas, ShaderPackEditor)
    servers/                  # (ServersPage, CreateServerDialog, ServerConsoleDialog, ServerEconomyPanel)
    settings/sections/       # (General, Appearance, Ai, Minecraft, Java, Launcher, Github, Storage, Security, Advanced)
    roadmap/                 # Página honesta para features futuras (não fake)
  services/
    db/repositories/         # projectsRepository, serversRepository, settingsRepository
    ai/                      # providers, streaming (3 protocolos), connectionService, sessions, contextService, references
    ai/agent/                # tools (12), orchestrator (loop), audit, promptBuilder, toolCallFormat (3 providers)
    build/                   # buildService (process events), errorParser (javac/dependency/configuration)
    launcher/                # authService (MSA device flow), instanceService (prepare/launch/stop)
    servers/                 # serverService (create/start/stop/backup/restore/console)
    servers/serverModules.ts # Economy/Prison/Token Chain datapack generators
    servers/economyService.ts # Token Chain panel + market + tunnel (playit.gg)
    shaders/                  # shaderStyleCatalog (32 presets), shaderPackGenerator,
                              # shaderPreviewSource (WebGL), shaderService, tests
    github/githubService.ts  # device flow + createRepo + push (header transitório)
    minecraft/versionCatalog.ts # Mojang+Fabric+Forge+NeoForge+Paper auto-update
    storage/storageService.ts   # open_in_file_manager, open_auth_url
    environment/environmentService.ts # detect java/git
    secrets/secretsService.ts    # keyring wrappers
    cloud/cloudConfig.ts         # Supabase opcional (honest: UnconfiguredCloudBackend)
  stores/ (settingsStore, projectsStore, uiStore)
  lib/ (monaco.ts com workers locais, utils.ts)

src-tauri/src/commands/
  fs.rs           # path guard + read/write/edit/search/rename/delete + base64
  git.rs          # snapshots (create/list/restore) + git_status + git_diff + civil_from_days
  process.rs      # spawn_monitored (allowlist + streaming + stdin) + stop + is_running
  projects.rs     # create_project (template render + git init) + validation
  templates.rs    # token engine ({{...}}) + write_template (embedded files)
  templates_embed.rs # include_bytes! de TODOS os arquivos do template
  launcher.rs     # download oficial (manifest→version.json→libs→assets→natives) + launch (KnotClient)
  servers.rs      # create (vanilla/Paper jar) + start/stop (stdin) + backup/restore (zip)
  ledger.rs       # Token Chain: SHA-256 hash chain (init/apply/list/verify) + purchase intents (log tail)
  shaders.rs      # shaderpacks: create (allowlist vsh/fsh/glsl/properties/json, immutável),
                  #   list (manifest nexuscraft.json), delete, install→instance, list_instances
  tunnel.rs       # playit.gg agent download + spawn + stop (free public address)
  github.rs       # git_commit_all + git_push_github (transient auth header)
  secrets.rs      # OS keyring + fallback file (chmod 600)
  storage.rs      # get_default_storage_base + ensure_storage_dirs + open_in_file_manager + open_auth_url
  environment.rs  # detect java/git (fixed commands, no user input)

src-tauri/src/migrations/
  001_init.sql            # 18 tabelas (projects, ai_tool_calls, settings, logs, servers, backups, etc.)
  002_version_catalog.sql # colunas do catálogo (kind, yarn, fabric_api, forge, neoforge, etc.)
  # ⚠️ append-only — NUNCA editar uma migration publicada

src-tauri/templates/fabric-1.20.1-mod/
  # 21 arquivos: build.gradle, gradle.properties (tokens de versão), ModItems (com Darksteel Sword),
  # fabric.mod.json, lang, models, recipes (darksteel_sword), advancements (root),
  # .nexus/ (project-spec.json, style-bible.md, ai-memory.md), gradlew (exec-bit restored), CHANGELOG.md

src-tauri/capabilities/default.json  # ACL: sql, dialog, http (AI providers + Mojang + Fabric + Paper + MSA + GitHub)
```

**Workspace do usuário**: `~/NexusCraft/{projects,instances,servers,backups,logs,shaderpacks,.gradle-cache,minecraft,tunnel}` — basePath configurável em Settings→Storage. DB: `~/.config/dev.yuadevs.nexuscraft-studio/nexuscraft.db`.

## 4. Como cada sistema funciona (arquitetura funcional)

### 4.1 Projects Core (Fase 1)
- **Create**: wizard com versão do catálogo ao vivo → `create_project` Rust → template embutido (`include_bytes!`) renderizado com tokens (`{{MOD_ID}}`, `{{PACKAGE_PATH}}`, `{{MC_VERSION}}`, `{{JAVA_RELEASE}}`, `{{MAPPINGS_LINE}}` yarn ou mojmap, etc.) → `git init` + primeiro commit → DB row.
- **Edit**: FileTree (explorer) → Monaco (tabs, Ctrl+S, diff no Changes tab do AI Creator) → `write_project_file` via path guard.
- **Snapshots**: `project_create_snapshot` = `git add -A && git commit -m "nexuscraft/snapshot/<label>"`. Restore = `git checkout <sha> -- .` (história preservada).

### 4.2 AI Creator (Fase 2)
- **Streaming**: 3 protocolos (OpenAI-compat SSE, Anthropic events, Ollama NDJSON) via `plugin-http` (Rust-side, zero CORS). `streamChat` generator → ChatPanel com markdown + streaming indicator.
- **Context Assembly**: carrega `.nexus/project-spec.json` + `style-bible.md` + `ai-memory.md` + file tree → monta system prompt.
- **Spec**: IA responde com ```json block → `extractSpecProposal` valida → SpecPreview mostra (tab "Specification") → Save com snapshot automático.
- **Reference Board**: upload de imagens → `import_project_file` (binário) → `.nexus/references/` → attach como `ImagePart` (vision base64) nas mensagens.
- **Sessions**: `ai_sessions`/`ai_messages` no SQLite, carregadas ao trocar de projeto.

### 4.3 Nexus Agent (Fase 3)
- **Tools**: 12 sandboxed (read/write/edit/delete/rename/create_directory/list/search/inspect_dependencies/git_status/git_diff/create_snapshot/list_snapshots) — TODAS via path guard Rust.
- **Orchestrator**: loop ≤8 steps, ≤30 writes, abort cooperativo, snapshot automático antes da 1ª escrita. `onEvent` → timeline UI (cards de tools coloridos).
- **Policy 3 camadas**: (1) Rust path guard, (2) auditoria em `ai_tool_calls`, (3) confirmação UI para destrutivos.
- **Auto-Fix (Fase 4)**: build falha → errorParser extrai erros → agent corrige via tools → rebuild → loop ≤5 tentativas. Destrutivos auto-negados no modo autônomo.

### 4.4 Build System (Fase 4)
- **`start_build`** Rust: gradlew com allowlist (build/clean/jar), `GRADLE_USER_HOME` compartilhado (`.gradle-cache/`), eventos `build:log`/`build:exit` via Tauri.
- **BuildDrawer**: terminal colorido ao vivo (`BUILD SUCCESS` verde, `BUILD FAILED` vermelho), Error Center (javac/dependency/configuration cards), botão "Fix with Nexus Agent".
- **Persistence**: `projects.last_build_status` + resumo na tabela `logs`.

### 4.5 Launcher (Fase 5)
- **`launcher_prepare`**: piston-meta manifest → version.json (BOM-safe) → Fabric profile (meta.fabricmc.net) merge → downloads SHA-1 (client.jar + 88 libs vanilla + 8 fabric + 3.672 assets com 8 workers scoped-threads) → natives extraídos (zip-slip guard) → instância isolada `instances/<slug>/`.
- **`launcher_launch`**: args vanilla+Fabric mesclados (Mojang rules avaliadas), placeholders `${...}` substituídos, KnotClient, `java -Xmx{ram}M -cp ...` → processo monitorado com eventos `launch:log`/`launch:exit`.
- **Auth MSA**: device flow (devicecode → MSA token → XBL → XSTS → Minecraft services → profile), tokens no keyring, client_id configurável em Settings→Launcher.
- **Mod deployment**: `launcher_copy_mod_jar` copia o jar mais recente de `build/libs/` para `instances/<slug>/mods/`.

### 4.6 Server Studio (Fase 6)
- **`server_create`**: vanilla (piston-meta, SHA-1) ou Paper (Fill API, SHA-256), eula gate obrigatório, properties curadas (`online-mode=true` SEMPRE), isolated `servers/<slug>/`.
- **`server_start`**: `java -Xmx{ram}M -jar server.jar nogui` com stdin aberto → console em tempo real (`server:log`/`server:exit`), comandos via `send_line` (stdin).
- **`server_stop`**: `stop` via stdin (world-safe), fallback force após 30s (guard contra vanilla 1.20.1+Java 21 shutdown hang).
- **Backups**: zips timestamped de world/plugins/config/properties (cap 4000 entries), restore com zip-slip guard + path restriction.
- **Properties editor**: textarea com save direto.

### 4.7 Server Modules (Pós-MVP Wave 1 — Sessão 11)
- **Mixable datapacks** (briefing §27/§28): Economy Coin (moeda scoreboard + depósitos + shop), Prison (ranks por mineração + warps + prestígio), Token Chain (mercado in-game ligado ao ledger). Namespaces separados (`nexus_economy`, `nexus_prison`, `nexus_token`) — nunca colidem.
- **Instalação**: wizard com checkboxes → `generateSelectedModules()` → datapacks escritos em `world/datapacks/` ANTES do primeiro boot.
- **Token Chain**: `ledger.rs` — SHA-256 hash chain real (`hash = sha256(index|time|tx|from|to|amount|prev)`), append-only JSONL, `ledger_verify` re-processa toda a cadeia. O app é o banco central: painel Economy minta/transfere/verifica; compras in-game (`/trigger nexus_token set <1-5>`) → datapack loga no latest.log → `ledger_tail_intents` (offset incremental) → painel debita via ledger + entrega item via `sendServerCommand`.
- **Compliance (briefing §28)**: moeda interna do jogo, SEM valor monetário; chains externas/NFT real → interface `ChainProvider` RESERVADA até o dono completar o Monetization Compliance Checklist.
- **Túnel público grátis**: `tunnel.rs` — playit.gg agent (download dos releases oficiais GitHub, spawn `--platform minecraft-java`), UI mostra endereço `*.playit.gg` copiável.

### 4.8 GitHub (Fase 7)
- **`git_commit_all`**: `git add -A && git commit -m <msg>` (identity local já configurada).
- **`git_push_github`**: remote add origin + push com **header transitório** `-c http.https://github.com/.extraheader="AUTHORIZATION: basic <base64(x-access-token:TOKEN)>"` — token NUNCA em URL/config/disco.
- **Auth**: GitHub OAuth device flow (client_id configurável em Settings→GitHub), token no keyring.
- **PublishDialog**: commit → create repo (private toggle) → push → `github_repositories` row.

### 4.9 Version Catalog (Fase 2 — fundamental)
- **Auto-update**: boot refresh + TTL 12h + manual (Settings→Minecraft). Cache SQLite (migration 002). Fallback embutido (1.20.1/1.21.1).
- **2026 reality**: versões `26.3` (novo esquema YY.M), Yarn NÃO cobre 26.x → `loom.officialMojangMappings()`, Paper v2 sunset → Fill API v3, NeoForge mapeia `26.3.0.x`→`26.3`.
- **Java por faixa**: ≥1.20.5→21, ≥1.17→17, senão 8. Versões >1.21.1 = experimental para o template.

### 4.10 Shader Studio (Pós-MVP Wave 2 — Sessão 13)
- **32 style presets** (`shaderStyleCatalog.ts`): BSL, SEUS, Complementary Reimagined, Photon, Kappa, Solas, Astralex, Fantasy (Unbound), Bliss, Spooklementary, EmanRux, Iteration T, Sundial, UShader, Verlixia, Moz, Nostalgia, CTR, Adistira, Hysteria, Shrimple, SuperDuperVanilla, Sildur's Vibrant, VTXS, N87, Vanilletix, Alpha Piscium, Derivative, Reverie, Ripple, E-Lite + categorias (cinematic/vibrant/natural/dreamy/performance). Cada preset = ~14 params (exposure, contrast, saturation, vibrance, temperature, bloom, godRays, fog, vignette, skyTop/skyHorizon/sunColor, tonemap) validados por `validateStyleParams` (ranges testados).
- **Compliance**: presets evocam looks icônicos com **GLSL 100% original** — nada copiado/redistribuído; cada card linka busca pública do original (`modrinth.com/shaders?q=`). README do pack carrega o mesmo aviso.
- **Gerador** (`shaderPackGenerator.ts`): pack Iris/OptiFire-compat (`shaders/composite.{vsh,fsh}` reais: exposure→tonemap ACES/Reinhard/filmic/linear, grading, bloom threshold 12-tap dual-ring, fog por depth (depthtex0), god rays screen-space (sunPosition→gbufferProjection), sky tint, vignette) + `shaders.properties` + `nexuscraft.json` (manifest lido pelo Rust) + README honesto. Packs são imutáveis (slug duplicado recusado no Rust).
- **Preview WebGL** (`shaderPreviewSource.ts`): cena analítica (céu/sol/montanhas fbm/água animada) com o MESMO pipeline de grading do pack — o que você vê é o que o estilo faz. Fallback honesto sem WebGL.
- **Backend** (`shaders.rs`): create com allowlist de extensões (vsh/fsh/glsl/properties/json), caps 64 arquivos/256KB, path guard compartilhado; list via manifest; install copia para `instances/<slug>/shaderpacks/` (instância preparada = `options.txt` do launcher; `copy_tree` recusa symlinks); delete guardado. Editor de packs usa `read/write_project_file` com rel `shaderpacks/<slug>/...` (zero command novo).
- **UI** (`ShadersPage`): grid com swatch de céu por estilo + filtros de categoria; painel sticky com preview vivo + params + create; seção "Your shaderpacks" (Install→instância via Select, Edit files→Monaco com abas e Ctrl+S, Reveal, Delete com confirm). Rota `/shaders`, sidebar Palette, Topbar, Ctrl+K.

## 5. Histórico de sessões (12 sessões)

| # | Fase | O que foi feito | Bugs caçados |
|---|---|---|---|
| 1 | Planejamento | Briefing 61 seções → 11 ADs, riscos, 8 fases, critérios | — |
| 2 | Fase 0 | Shell + SQLite 18 tabelas + Settings + keyring + palette + ícones | — |
| 3 | Fase 1 + .env | Template embedded + Monaco + FS sandbox + snapshots + wizard | plugin-http inexistente |
| 4 | Fase 2 | Version catalog 2026 + streaming 3 protocolos + AI Creator + Reference Board | OOM Monaco (heap 4GB), reqwest 0.13 features |
| 5 | Fase 3 | Nexus Agent: 12 tools + orchestrator + auditoria + UI timeline | (Mirai Studio revert — prompt errado) |
| 6 | Fase 4 | Build system + Error Center + Auto-Fix + E2E jar compilado | gradlew sem exec-bit |
| 7 | Fase 5 | Launcher completo + E2E 718MB + MSA device flow + Run | serde camelCase (`assetIndex`, `mainClass`) |
| 8 | Fase 6 | Server Studio + E2E ciclo completo + console stdin | `Path::ends_with` não é sufixo, flush stdin |
| 9 | Fase 7 + Quality | GitHub + Dark Kingdom auto + ESLint + Vitest + CI + ErrorBoundary | **família de serialização snake/camel** (6+ tipos) |
| 10 | GitHub publish | gh repo create + push + CI | scope `workflow`, pnpm 9 vs 12 |
| 11 | Pós-MVP Wave 1 | Módulos misturáveis + Token Chain SHA-256 + túnel playit.gg + release.yml | genesis block hash ≠ campos |
| 12 | Verificação total | 28 testes verdes + CI SUCCESS + tag v0.1.0 + Release queued | — |
| 13 | Wave 2: Shader Studio | 32 presets de estilo + gerador GLSL real + preview WebGL + editor Monaco + install em instância | race ledger (família temp-dir), bloomTaps com parênteses faltando |

## 6. Decisões-chave (respeitar SEMPRE)

1. **No fake data** — features pendentes recebem interfaces reais com TODO ou páginas de roadmap honestas.
2. **Rust = perímetro de segurança** — todo FS/processo/segredo passa por commands validados com path guard/allowlist.
3. **Serialização camelCase**: Rust `#[serde(rename_all = "camelCase")]` em TODOS os results → TS lê camelCase. **NÃO reintroduzir bug snake/camel!**
4. **Migrations append-only** — nunca editar uma publicada.
5. **Allowlist de processos** — sem shell, args de array. Tokens: keyring sempre.
6. **Device flows legítimos** — MSA e GitHub, client_id configurável. **Nunca bypass de auth/DRM.**
7. **Downloads oficiais com checksum** — nada redistribuído.
8. **E2E culture** — todo sistema crítico ganha teste `#[ignore]` executado de verdade. Bug → reproduzir → corrigir → teste que cubra.
9. **Orçamentos do agente** — ≤8 steps, ≤30 writes, destrutivos com confirmação UI.
10. **Esquema versões 2026** — `26.x` sem yarn → mojmap; `1.x` com yarn; >1.21.1 experimental.
11. **Template embedded** (`include_bytes!`) — determinístico em dev/release.
12. **Token Chain compliance** — moeda interna do jogo, sem valor monetário. Externo = `ChainProvider` reservada.

## 7. Bugs caçados (18 total — NÃO re-introduzir)

| Bug | Como foi achado | Fix |
|---|---|---|
| gradlew sem exec-bit | E2E gradle (PermissionDenied) | chmod 755 pós-render |
| serde camelCase (`assetIndex`, `mainClass`) | E2E launcher | `rename_all = "camelCase"` |
| `Path::ends_with(".zip")` compara componentes | E2E server | `.file_name().ends_with()` |
| flush faltante no stdin stop | E2E server 3× | `write_all + flush()` |
| **Família snake/camel serialização** | Validação viva (logs table) | TODOS os types TS → camelCase |
| OOM vite build (Monaco) | Build crash | heap 4GB NODE_OPTIONS |
| reqwest 0.13 mudou features | cargo add | usar rustls default |
| listener race do build | Revisão fase 5→6 | listeners ANTES do spawn |
| stale closures customJava/refreshContext | ESLint hooks v6 | deps corrigidas |
| vitest 5 exige vite 6 | ERR_PACKAGE_PATH | vitest@2 |
| eslint 10 exige node 20 | util.styleText | eslint@9 |
| plugin-http fetch em api/core | typecheck | import de plugin-http |
| StrictMode double-mount exemplo | Validação viva | idempotência (adota pasta existente) |
| Java 21 trava shutdown vanilla 1.20.1 | E2E server (hang) | fallback force 30s + aviso UI |
| Race temp-dir entre testes | cargo test flaky | bases com label único |
| CI pnpm 9 vs workspace yaml | 1ª rodada GitHub | version: 12 |
| Push sem scope `workflow` | gh token | device-flow refresh |
| Genesis block hash ≠ campos serializados | teste verify falhou | hash dos campos finais (struct-update) |
| **Race temp-dir ledger** (base compartilhada + remove_dir_all em testes paralelos, 1-in-5 flaky) | cargo test 10x após o sintoma | base_dir(label) por teste (mesma família fs.rs) |
| **bloomTaps: 3 `(` vs 2 `)`** — GLSL gerado não compilaria in-game | teste de paridade no gerador | sanidade (braces/parens/tokens) em TODO GLSL gerado |

## 8. Estado atual (verificado — Sessão 13)

### Testes (TODOS verdes)
| Suíte | Resultado |
|---|---|
| Rust unit (18) | ✅ incl. shaderpack guards, ledger chain, tamper detection |
| Vitest (28) | ✅ incl. 32-presets íntegros, gerador GLSL sane, errorParser, serverModules |
| E2E gradle | ✅ jar compilado (211s, Sessão 12) |
| E2E launcher | ✅ 3.695 arquivos SHA-1 (59s cached, Sessão 12) |
| E2E server | ✅ boot→stop→backup→restore (205s, Sessão 12) |
| Typecheck | ✅ zero erros |
| ESLint | ✅ 0 errors (warns set-state-in-effect = backlog família conhecida) |
| Vite build | ✅ (1m50s) |
| Boot smoke | ✅ app vivo, sem crash (tauri dev) |
| **CI GitHub** | ✅ **SUCCESS** (Rust + Frontend, Sessão 12) |

### Release
- **Tag `v0.1.0`** pushed → Release workflow queued (matrix: macOS arm64+x64, Ubuntu, Windows)
- Output: `.exe` + `.msi` (Windows), `.dmg` (macOS), `.deb` + `.AppImage` + `.rpm` (Linux)
- Verificar: `gh run list --workflow=release.yml`

### Comandos de verificação
```bash
cd ~/nexuscraft-studio
pnpm verify                         # typecheck + lint + vitest + vite build
cd src-tauri && cargo test          # 13 unit
cargo test -- --ignored --nocapture # 3 E2E (rede/tempo)
gh run list --limit 3               # CI status
git log --oneline                   # 25+ commits
```

## 9. Roadmap pós-MVP (priorizado — o que ainda pode ser construído)

1. **Modpack Creator** — seleção de mods, resolução de dependências, incompatibilidades, export/import, Compatibility Score
2. **Forge & NeoForge templates** — o Version Adapter já mapeia versões; faltam templates Java análogos
3. ~~Shader Studio~~ → **ENTREGUE (Wave 2, Sessão 13)**: 32 presets + gerador real + preview WebGL + editor + install ✓ — próximos passos opcionais: passes extras (gbuffers water/waving), settings.glsl in-game (optiones Iris), screenshot preview com o jogo real
4. **Resource Pack / World / Structure Studios** — texture workspace, geradores
5. **Mais módulos de servidor** — SkyBlock, Factions, BedWars, Economy Engine
6. **Marketplace** — categorias, licenciamento (author/license/source/version/deps)
7. **Docker + Deployment Providers** — VPS/SSH/cloud (`DeploymentProvider` reservada)
8. **Cloud opcional (Supabase)** — `cloudConfig.ts` + `.env` prontos
9. **Chain externa real** — `ChainProvider` quando o dono completar o Compliance Checklist
10. **Backlog de qualidade**: migrar warns `set-state-in-effect`, CSP no tauri.conf (null hoje), auto-refresh de sessão MSA/GitHub, alinhar `@tauri-apps/api` 2.9→2.12 (CLI de dev avisa mismatch e reescreve o Cargo.toml com `features = []` — neutro, mas reverter após `tauri dev`)

## 10. Regras de operação com o dono

- Dono fala PT-BR; responder em PT-BR com relatório final estruturado (o que fez, provas, próximo passo).
- Verificação real após cada mudança: typecheck/build/testes/boot — nunca pular.
- Commits em unidades lógicas (conventional), inglês, explicando o porquê.
- **Prompt errado de outro projeto?** Desconsiderar, apagar artefatos, verificar zero contaminação (grep), seguir.
- **Adendos permanentes**: version catalog auto-update; Plan.md = memória pós-compactação (este arquivo).
- **Qualidade > velocidade**: E2E executado, bug reproduzido antes de fix, teste novo cobrindo o bug.
- Dono quer "algo que funciona, não apenas um esqueleto" — sempre provar com teste real.

## 11. Mapeamento de fases

| Fase | Conteúdo | Status |
|---|---|---|
| 0 | Shell + SQLite + Settings + Secrets + Palette | ✅ |
| 1 | Projects Core (template embedded, Monaco, snapshots) | ✅ |
| 2 | AI Creator + Version Catalog 2026 + streaming | ✅ |
| 3 | Nexus Agent (12 tools, policy 3 camadas, auditoria) | ✅ |
| 4 | Build System (E2E jar) + Error Center + Auto-Fix | ✅ |
| 5 | Launcher (E2E 718MB) + MSA device flow + Run | ✅ |
| 6 | Server Studio (E2E ciclo) + backups + console stdin | ✅ |
| 7 | GitHub publish + Dark Kingdom + Quality (ESLint/Vitest/CI) | ✅ **MVP COMPLETO** |
| Wave 1 | Módulos misturáveis + Token Chain SHA-256 + Túnel grátis + Release multi-OS | ✅ |
| Wave 2 | Shader Studio (32 presets, gerador GLSL real, preview WebGL, editor) | ✅ |
| Próximo | Modpack Creator / Forge+NeoForge templates / mais módulos / Resource Pack Studio | 🟡 |

## 12. Protocolo de Retomada (executar após ler este arquivo)

1. **`cd ~/nexuscraft-studio && git log --oneline | head -20 && git status --short`** — confirme estado limpo e commits.
2. **`pnpm typecheck && pnpm lint && pnpm test:unit`** e **`cd src-tauri && cargo test`** — tudo verde antes de qualquer mudança.
3. Leia `README.md` + `docs/architecture.md` + este arquivo de novo se necessário.
4. **NÃO reescrever sistemas existentes** — seguir princípios (§6) e o briefing original.
5. Se o dono pedir feature nova: planejar dentro das regras (§6), implementar incrementalmente, verificar (E2E quando couber), commitar, relatar.
6. Se o dono disser **"crie o arquivo Plan.md"**: atualizar ESTE documento com tudo que aconteceu desde a última versão (novas sessões em §5, novos bugs em §7, novos itens em §9) e commitar.
7. **Checklist antes de tocar código**: typecheck verde? cargo test verde? lint zero errors? git status limpo? Então pode.

---

## 13. Sessão 13 — Shader Studio (Pós-MVP Wave 2)

**Pedido do dono**: "Atualize a área de criação de Shaders para o Minecraft com os seguintes templates: [32 shaders icônicos: BSL, SEUS, Complementary Reimagined, Solas, Photon, Kappa, Astralex, Fantasy, Fantasy Unbound, Bliss, Spooklementary, EmanRux, Iteration T, Sundial, UShader, Verlixia, Moz, Nostalgia, CTR, Adistira, Hysteria, Shrimple, SuperDuperVanilla, Sildur's Vibrant, VTXS, N87, Vanilletix, Alpha Piscium, Derivative, Reverie, Ripple, E-Lite]"

**Decisão de compliance (crítica)**: esses 32 são shaderpacks REAIS da comunidade com licenças próprias. Seguindo §6.1 (no fake data) e §6.7 (nada redistribuído), o Shader Studio entrega **style presets** — GLSL 100% original do nosso engine, com ~14 params afinados para evocar cada look — + link de busca pública do original (crédito honesto). Nada baixado, nada copiado.

**Entregue** (detalhe funcional em §4.10):
- `shaderStyleCatalog.ts` — 32 presets, 5 categorias, ranges validados (+8 testes)
- `shaderPackGenerator.ts` — pack Iris/OptiFire-compat REAL (composite pass com bloom/fog/god rays/grading) + manifest + README honesto (+7 testes, incl. sanidade de parênteses que pegou bug REAL)
- `shaderPreviewSource.ts` + `ShaderPreviewCanvas.tsx` — preview WebGL vivo com o grading exato do pack
- `shaders.rs` (5 commands, guards + 5 testes Rust) + `shaderpacks/` no workspace
- `ShadersPage` + `ShaderPackEditor` (Monaco, Ctrl+S via workspace guard)
- Navegação completa (/shaders, sidebar, Ctrl+K, Topbar)

**Bugs caçados na sessão**: (1) race do ledger (flaky 1-in-5 → base por label, 10x verde); (2) bloomTaps gerava GLSL com parênteses faltando — o pack NÃO compilaria in-game; teste de paridade permanente agora. (3) `validated_path` com parent inexistente no create_pack → materializar pastas antes de validar o arquivo.

**Observação de ambiente**: `tauri dev` CLI reescreve `Cargo.toml` (`tauri = "2.12.0"` → `{ version = "2.12.0", features = [] }`, neutro) por causa do mismatch `@tauri-apps/api` 2.9 vs crate 2.12 — revertido, item no backlog §9.10.

**Verificação**: cargo 18/18 (+5x flaky-check) · vitest 28/28 · typecheck/lint 0 errors · vite build 1m50s · boot vivo sem crash.

---

*Última atualização: Sessão 13 — Shader Studio entregue (Wave 2): 32 style presets, gerador GLSL real Iris/OptiFire-compat, preview WebGL, editor Monaco, install em instâncias. MVP + Wave 1 + Wave 2 completos. 27+ commits. Próximo: Modpack Creator ou Forge/NeoForge templates (§9).*
