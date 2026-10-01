# Plan.md — NEXUSCRAFT STUDIO · Documento-Mãe de Continuidade

> **⚡ AI Minecraft Creation Studio** — o usuário descreve em linguagem natural; o agente opera sobre um projeto REAL (arquivos, código, build, launcher, servidores, GitHub) com sandbox e auditoria. Nada de fake data — nunca.
>
> **Este arquivo é a memória integral do projeto.** Se o chat foi compactado: leia este documento INTEIRO, depois o `README.md` e o `docs/architecture.md`, execute o Protocolo de Retomada (§12) e só então toque em código.
>
> **REGRA PERMANENTE DO DONO**: quando ele disser *"crie o arquivo Plan.md"*, gerar/atualizar este documento com o estado atual completo (sessões, decisões, riscos, roadmap) e commitar. Este arquivo é a base de continuidade pós-compactação.

---

## 1. Identidade do produto

- **Nome**: NexusCraft Studio · curto: NexusCraft
- **Tagline**: "Imagine it. Describe it. Build it. Play it."
- **Descrição**: AI Minecraft Creation Studio
- **Repo**: `~/nexuscraft-studio` (branch `main`) · **Publicado no GitHub**: https://github.com/yuaberry/nexuscraft-studio (remoto `origin`, **PRIVATE**, conta `yuaberry`, gh CLI autenticado com scopes gist/read:org/repo/workflow)
- **Legal**: "NexusCraft Studio is an independent third-party tool and is not affiliated with Mojang Studios or Microsoft." — nunca redistribuir binários/assets proprietários; nunca bypass de auth/DRM.
- **Idioma**: prompts do dono em PT-BR; produto/commits em inglês.

## 2. Stack (estabelecida e funcionando)

- **Frontend**: React 18 + TypeScript (strict) + Vite 5 + Tailwind 3.4 (shadcn-style, tema dark próprio `nexus-dark`, acentos purple/cyan/blue via `data-accent`), fonts Inter Variable + JetBrains Mono, zustand, react-router (HashRouter), lucide, sonner, cmdk, react-markdown, @monaco-editor/react (bundled local, workers via `?worker`, exports-map: imports SEM prefixo `esm/vs/`)
- **Backend**: Tauri 2 (Rust) — crates: tauri, tauri-plugin-sql (SQLite), tauri-plugin-http, tauri-plugin-dialog, reqwest 0.13 (blocking+rustls default), sha1, sha2, zip, keyring 3 (sync-secret-service/apple-native/windows-native)
- **Build frontend**: `NODE_OPTIONS=--max-old-space-size=4096` no script `build` (Monaco exige — OOM sem isso)
- **Ferramentas de qualidade**: ESLint 9 (flat config, `eslint.config.js`), Vitest 2 (`pnpm test:unit`), CI `.github/workflows/ci.yml`
- **Sistema**: Java 21 (OpenJDK), Gradle 8.8 via wrapper, git, Linux Mint (webkit2gtk-4.1 ✓)
- **Ambiente dev**: pnpm (não usar bun para scripts do tauri); `pnpm tauri dev`

## 3. Estrutura essencial

```
src/
  components/ (ui shadcn-style, layout, brand, CommandPalette, AboutDialog, ErrorBoundary)
  features/ (home, projects + workspace/, ai-creator/, servers/, settings + sections/, roadmap/)
  services/ (db/repositories, ai/{providers,streaming,connectionService,agent/*,sessions,contextService,references},
             build/{buildService,errorParser}, launcher/{authService,instanceService},
             servers, github, storage, environment, projects, minecraft/versionCatalog, cloud/cloudConfig)
  stores/ (settingsStore, projectsStore, uiStore)
src-tauri/src/commands/ (fs, git, process, projects, templates+templates_embed, launcher, servers, github, secrets, storage, environment)
src-tauri/src/migrations/ (001_init.sql, 002_version_catalog.sql — append-only!)
src-tauri/templates/fabric-1.20.1-mod/ (16→21 arquivos, inclui .nexus/, darksteel_sword, CHANGELOG)
```

**Workspace do usuário**: `~/NexusCraft/{projects,instances,servers,backups,logs,.gradle-cache,minecraft}` (basePath configurável em Settings→Storage; DB do app em `~/.config/dev.yuadevs.nexuscraft-studio/nexuscraft.db`).

## 4. Histórico de sessões (o que foi feito, passo a passo)

### Sessão 1 — Planejamento (Arquiteta)
- Briefing de 61 seções → documento de arquitetura: 11 decisões (AD-1..AD-11), riscos, 8 fases (0–7), critérios de aceitação por fase. **Tudo implementado segue esse plano.**

### Sessão 2 — Fase 0 (fundação)
- Repo + Tauri 2 shell, design system dark premium (tokens CSS, glass, blueprint grid), 18 tabelas SQLite (incl. `ai_tool_calls` auditoria), 8 seções de Settings reais, secrets no OS keyring (probe + fallback file chmod 600, backend reportado na UI), command palette Ctrl+K, detecção Java/Git, storage wizard, ícones multiplataforma (script `scripts/generate_icon.py`), smoke boot. **Critério provado**: 18 tabelas migradas ao vivo.

### Sessão 3 — Env/Cloud + Fase 1 (Projects Core)
- Commits organizados; `.env.example` commitado + `.env` local (gitignored); `cloudConfig.ts` honesto (UnconfiguredCloudBackend, sem chamadas fake) — Supabase é camada OPCIONAL pós-MVP.
- **Template Fabric 1.20.1 EMBUTIDO no binário** (`include_bytes!` — decisão: sem resource bundling, determinístico em dev/release), engine de tokens `{{...}}`, FS sandbox com path guard, snapshots git (auto-label data-contador), Monaco offline com tema próprio, wizard de projeto, workspace (FileTree/tabs/ctrl+S), Home real, E2E template (5→10 testes).

### Sessão 4 — Fase 2 (AI Creator + Version Catalog)
- **Descoberta crítica: em 2026 o Minecraft usa novo esquema de versões (`26.3`), Yarn não cobre 26.x (→ mojmap `loom.officialMojangMappings()`), Paper v2 API morreu → Fill API (`fill.papermc.io/v3`), NeoForge mapeia `26.3.0.x`→`26.3`.** Endpoints validados ao vivo com curl ANTES de codar.
- Catalog: Mojang+Fabric(meta/maven)+Forge(promos)+NeoForge(maven)+Paper(Fill), cache SQLite (migration 002), TTL 12h, boot refresh, fallback embutido (1.20.1/1.21.1 valores reais).
- Template parametrizado por versão ({{MC_VERSION}}, {{JAVA_RELEASE}}, {{YARN_MAPPINGS}}, {{MAPPINGS_LINE}}, {{LOADER_*}}, {{FABRIC_API_VERSION}}, {{MC_DEPENDS}}, {{JAVA_*}}); versões >1.21.1 marcadas experimentais (badge honesta).
- AI streaming TS: 3 protocolos (OpenAI-compat SSE, Anthropic events, Ollama NDJSON) via plugin-http (Rust-side, sem CORS).
- AI Creator 3 colunas (chat/spec/inspector), sessões persistidas (`ai_sessions`/`ai_messages`), Spec Preview com save + snapshot, Reference Board (import nativo p/ `.nexus/references/` + vision base64), `.nexus/` bootstrap no template.
- **OOM do build resolvido**: heap 4GB no script.

### Sessão 5 — Fase 3 (Nexus Agent)
- **(Interrupção do dono: prompt errado de outro projeto "Mirai Studio" entrou aqui → pedido de desconsiderar e apagar tudo → limpeza total verificada: pasta removida, grep "mirai" = 0 no repo, nenhum commit afetado. LIÇÃO: revert imediato e completo quando o dono pedir.)**
- Agent: `toolCallFormat.ts` (tool-calls por provider, não-streaming), `tools.ts` (12 tools: read/write/edit/delete/rename/create_directory/list/search/inspect_dependencies/git_status/git_diff/create_snapshot/list_snapshots), `orchestrator.ts` (loop ≤8 steps, ≤30 writes, abort cooperativo, snapshot auto antes da 1ª escrita), `audit.ts` (ai_tool_calls ok/denied/error), promptBuilder (spec é a fonte da verdade).
- UI: toggle Agent mode, timeline com cards de tools coloridos, diálogo de confirmação p/ destrutivos (policy camada 3), Changes tab com diff colorido.
- Rust: `edit_project_file` (find/replace exato com contagem e erros autocorrigíveis), `search_project` (case-insensitive, skip .git/build/.gradle/run), `project_git_diff`. Testes 10/10.

### Sessão 6 — Fase 4 (Build System)
- `process.rs`: spawn com allowlist de tasks (build/clean/jar), sem shell, GRADLE_USER_HOME compartilhado, eventos `build:log`/`build:exit`, watcher com try_wait.
- **E2E gradle REAL executado: `e2e-dark-kingdom-0.1.0.jar` compilou (245s) — achou bug do exec-bit do gradlew (engine de template escrevia texto sem +x; fix chmod 755 + assert).** Cache 476MB aquecido.
- buildService (preflight: Java/build.gradle/first-build hint; listeners ANTES do spawn), errorParser (javac/dependency/configuration + errorsToPrompt), BuildDrawer (terminal colorido, Error Center, **Auto-Fix ≤5 tentativas** com feed de atividade; destrutivos auto-negados no modo autônomo), status persistido (`projects.last_build_status` + tabela `logs`).

### Sessão 7 — Revisão + Fase 5 (Launcher)
- **Revisão profunda a pedido ("reveja e corrija o que falta")**: 5 fixes (listener race, auto-fix memo mutation, texto do restore, uso da tabela logs, docs).
- Launcher: `launcher.rs` completo — manifest→version.json (BOM-safe)→Fabric profile merge, downloads SHA-1 (client+libs+assets com 8 workers scoped-threads + progress events), natives por SO com zip-slip guard, instância isolada, `launcher_copy_mod_jar`, launch com args mesclados (rules da Mojang, placeholders, KnotClient).
- **E2E launcher REAL: 3.695 arquivos oficiais/718MB em 128s** (achou bug serde: `assetIndex`/`mainClass` camelCase rename_all).
- Auth MSA device flow completo (`authService.ts`: devicecode→poll→XBL→XSTS→MC services→profile; client_id configurável; tokens no keyring), Settings→Launcher (client id, sign-in com device-code dialog, RAM, legal), LaunchDialog (status instance/mod/auth, progress bar, live game log, Stop), botão Run no workspace + Home.

### Sessão 8 — Fase 6 (Server Studio)
- `servers.rs`: create (vanilla piston-meta SHA-1 / Paper Fill SHA-256, eula gate obrigatório, properties curadas), process registry ganhou **stdin** (`send_line`) p/ console real, `server_stop` world-safe com **fallback force após 30s**, backups zip timestamped (world/plugins/config, cap 4000), restore zip-slip+path-restricted, delete guard.
- **E2E server REAL: ciclo completo** (create→boot até "Done"→stop aceito→world salvo→backup→restore→delete). Achou: `Path::ends_with` não é sufixo (fix `.file_name().ends_with(".zip")`); flush faltante no stdin do stop.
- **Descoberta de engenharia documentada**: vanilla 1.20.1 (alvo Java 17) trava no shutdown sob Java 21 → fallback + aviso honesto na UI (Settings→Java recomenda Java 17 p/ 1.20.x).
- UI: ServersPage real (polling 5s), CreateServerDialog (EULA checkbox, online-mode=true SEMPRE), ServerConsoleDialog (log colorido, input de comandos, properties editor, backups/restore).

### Sessão 9 — Fase 7 (GitHub + Dark Kingdom) + Qualidade — **MVP COMPLETO**
- GitHub: `github.rs` (git_commit_all; git_push_github com **header transitório** `-c http.https://github.com/.extraheader` — token NUNCA em URL/config/disco), `githubService.ts` (device flow GitHub com client id configurável, createRepo, getUser), Settings→GitHub, **PublishDialog** (commit→create repo→push→`github_repositories`).
- Template Dark Kingdom: **Darksteel Sword** (SwordItem+ToolMaterials.IRON), model handheld, recipe shaped, advancement root, CHANGELOG, textura reutilizada — **E2E gradle re-executado: compilou verde (141s)**.
- Qualidade: **ErrorBoundary** global, **ESLint 9** (0 erros; achou 2 stale-closures REAIS: customJava no BuildDrawer + TDZ `refreshContext` → movido antes do runAgentTurn; `set-state-in-effect` como warn/backlog), **Vitest 2** 7/7 (errorParser+specUtils), **CI GitHub Actions**.
- **Dark Kingdom automático (briefing §52)**: criação no primeiro boot (storage ok + 0 projetos), **idempotente** (adota pasta existente — StrictMode double-mount), observabilidade na tabela `logs`.
- **Validação ao vivo achou família de bugs latente**: Rust serializa camelCase, TS lia snake_case em resultados (`project_path`→`projectPath`, `short_sha`→`shortSha`, `instance_dir`→`instanceDir`, `server_dir`/`jar_path`, campos de backup) — nunca exercitados antes. **TODOS corrigidos + validados**: DB row + espada/receita/advancement/git no disco, e **`dark-kingdom-0.1.0.jar` compilado na pasta REAL do usuário**.
- README/docs reescritos como "MVP completo"; **18 commits**; boot final verificado.

### Sessão 10 — Publicação no GitHub (lance o arquivo no GitHub)
- `gh` CLI já estava autenticado (conta `yuaberry`); token faltava scope `workflow` → push rejeitado por causa do `ci.yml` → **refresh via device flow** (usuário autorizou no browser) → scope obtido.
- `gh repo create nexuscraft-studio --private --source=. --remote=origin` + `git push -u origin main` → **repo no ar (PRIVATE)**.
- CI disparou: 1ª rodada falhou (`pnpm 9` no runner não aceita `pnpm-workspace.yaml` sem `packages` — arquivo usado para `allowBuilds` no pnpm 12) → **fix: `version: 12` no action-setup** (paridade com o lockfile) → re-push.
- Estado CI na última checagem: **queued** (fila de runners free/private) — verificar com `gh run list --limit 3` e, se falhar, `gh run view --log-failed`.
- Para tornar o repo público: `gh repo edit yuaberry/nexuscraft-studio --visibility public` (o dono decide).

### Sessão 11 — Pós-MVP Wave 1: Economy/Tunnel/Modules + Release
- **Server Modules misturáveis** (briefing §27/§28): datapacks vanilla gerados (nexus_economy, nexus_prison, nexus_token) — `serverModules.ts` com geradores + 5 testes vitest; namespaces nunca colidem (mix livre); pack_format 15 (1.20.1); instalação no wizard via `writeProjectFile` em `world/datapacks/` ANTES do primeiro boot.
- **Token Chain (a "criptomoeda" do servidor)**: `ledger.rs` — blockchain real com SHA-256 (`hash = sha256(index|time|tx|from|to|amount|prev)`), append-only JSONL, `ledger_init/apply/list/verify`, saldo por replay, detecção de tamper (3 testes Rust: determinismo, mint/transfer/burn + verify, tamper detection). **O app é o banco central**: painel Economy minta/transfere/queima e verifica a cadeia; compras in-game (`/trigger nexus_token set <1-5>`) → datapack loga `[NexusCoin] BUY <player> <item>` no latest.log → `ledger_tail_intents` (Rust, offset incremental) → painel debita via ledger + entrega item via `sendServerCommand`.
- **Compliance (briefing §28)**: moeda interna do jogo, SEM valor monetário; integração com chains externas/NFT real fica na interface `ChainProvider` RESERVADA até o dono completar o Monetization Compliance Checklist.
- **Túnel público grátis**: `tunnel.rs` — playit.gg agent (download dos releases oficiais GitHub, chmod 755, spawn `--platform minecraft-java` + `PLAYIT_AGENT_PORT` env, stdin `exit` para stop, parse de endereço via `parseTunnelAddress` TS). UI: botão "Make public" no console → mostra endereço `*.playit.gg` com Copy.
- **Release multi-plataforma**: `release.yml` — matrix macOS (arm64+x64)/ubuntu-22.04/windows via `tauri-action@v0` + tag v* → GitHub Release com .exe/.dmg/.deb/.AppImage.
- **Bug caçado**: genesis block hash calculado com `to=""` mas serializado com `to=currency` → verify falhava. Fix: hash computado dos campos FINAIS do bloco (struct-update pattern `Block { hash, ..genesis }`).
- Verificação: cargo 13/13 + 3 E2E ignored · vitest 12/12 · typecheck/lint 0 erros · vite build · cargo build · boot 14s ✓.

## 5. Decisões-chave (respeitar em futuras sessões)

1. **Nada de fake data** — roadmap page honesta onde não há feature; TODO real em interfaces de service.
2. **Rust = perímetro de segurança** (AD-1): todo FS/processo/secreto passa por commands validados; frontend nunca toca o sistema direto.
3. **Serialização**: Rust `#[serde(rename_all = "camelCase")]` em TODOS os results → TS deve ler camelCase. (Bug família — não reintroduzir!)
4. **Migrations append-only** (001, 002…) — nunca editar uma publicada.
5. **Allowlist de processos** (gradlew tasks build/clean/jar; launcher java; server java -jar server.jar nogui) — sem shell, args de array.
6. **Tokens**: keyring sempre; push GitHub usa header transitório; keys de IA via Settings→AI (não .env).
7. **Device flows legítimos** (MSA e GitHub) com client_id configurável — nunca bypass.
8. **Downloads oficiais** (piston-meta/piston-data, meta/maven.fabricmc, libraries.minecraft.net, fill.papermc.io) com checksum; nada redistribuído.
9. **E2E culture**: todo sistema novo ganha teste `#[ignore]` executado de verdade (`cargo test -- --ignored`); unit tests para tudo que é puro. Ao descobrir bug: reproduz → corrige → adiciona teste que o cubra.
10. **Orçamentos do agente**: ≤8 steps, ≤30 writes, destrutivos exigem confirmação UI (e são auto-negados no Auto-Fix).
11. **Esquema de versões 2026**: novo formato `YY.M` (26.x) SEM yarn → mojmap; legado `1.x` com yarn; Java por faixa (≥1.20.5→21, ≥1.17→17, senão 8); >1.21.1 = experimental para o template.
12. **Wrapper Gradle 8.8 oficial**; Loom 1.7-SNAPSHOT; template `include_bytes!` embutido (não resource bundle).

## 6. Bugs caçados (histórico de guerra — não re-introduzir)

| Bug | Onde | Como foi achado |
|---|---|---|
| gradlew sem exec-bit após render | templates engine | E2E gradle (PermissionDenied) |
| serde camelCase ausente (`assetIndex`, `mainClass`) | launcher | E2E launcher ("no asset index") |
| `Path::ends_with(".zip")` compara componentes | servers restore | E2E server |
| flush faltante no stdin (stop não chegava) | servers | E2E server 3× (javac travados) |
| **Família de serialização snake/camel** | services TS (results) | Validação viva do Dark Kingdom (logs table) |
| OOM vite build (Monaco) | scripts | Build crash core dump → heap 4GB |
| reqwest 0.13 mudou features (rustls default) | Cargo | cargo add |
| listener race do build (logs iniciais perdidos) | buildService | Revisão da fase 5→6 |
| stale closures customJava/refreshContext | BuildDrawer/AiCreator | ESLint react-hooks v6 |
| vitest 5 exige vite 6 | dev deps | ERR_PACKAGE_PATH_NOT_EXPORTED → vitest@2 |
| eslint 10 exige node 20 | dev deps | util.styleText → eslint@9 |
| plugin-http não tem fetch em @tauri-apps/api/core | githubService | typecheck |
| StrictMode double-mount cria exemplo 2× | App example | Validação viva → idempotência |
| Java 21 trava shutdown do vanilla 1.20.1 | server stop | E2E server (hang 240s+) → fallback force + aviso UI |
| Race temp-dir entre testes de agente | fs tests | cargo test flaky → bases com label |
| CI: pnpm 9 × pnpm-workspace sem `packages` | .github/workflows/ci.yml | 1ª rodada no GitHub → action-setup version: 12 |
| Push rejeitado sem scope `workflow` | gh token | device-flow refresh antes do push com ci.yml |
| Genesis block hash ≠ campos serializados | ledger.rs | teste verify falhou → hash computado dos campos finais |

## 7. Testes & verificação (estado atual — todos verdes)

- `cargo test` → **10 passed, 3 ignored**
- `cargo test -- --ignored` → **3 E2E**: `e2e_gradle_build_compiles_template` (jar), `e2e_launcher_prepare_full` (718MB), `e2e_server_lifecycle` (boot→stop→backup→restore)
- `pnpm test:unit` → **7/7 vitest**
- `pnpm typecheck` · `pnpm lint` (0 errors, ~15 warns set-state backlog) · `pnpm build` (~2m) · `cargo build` · boot smoke (kill -0 PID após 14–25s)
- `pnpm verify` = typecheck + lint + test:unit + build
- DB de desenvolvimento: `~/.config/dev.yuadevs.nexuscraft-studio/nexuscraft.db` (storage seedado com basePath=/home/llinux/NexusCraft; Dark Kingdom presente no DB e no disco com jar compilado)

## 8. O que ainda falta fazer (roadmap pós-MVP, priorizado)

1. ~~Release packaging~~ → **release.yml** criado (tag v* → .exe/.dmg/.deb/.AppImage) — aguardando primeira tag
2. **Modpack Creator** — seleção de mods, resolução de dependências, incompatibilidades, export/import, Compatibility Score
3. **Forge & NeoForge templates** — o Version Adapter já mapeia versões; faltam templates Java análogos ao fabric-1.20.1
4. **Shader Studio** — editor GLSL (fsh/vsh já mapeados para Monaco/cpp), preview, parameters
5. **Resource Pack / World / Structure Studios** — texture workspace, geradores de estruturas
6. ~~Server Templates~~ → **MODULOS MISTURÁVEIS ENTREGUES**: Economy Coin + Prison + Token Chain (ledger SHA-256) como datapacks vanilla ✓ — próximos: SkyBlock, Factions, BedWars
7. **Marketplace** — categorias, licenciamento (author/license/source/version/deps)
8. **Docker + Deployment Providers** (VPS/SSH/cloud; interface `DeploymentProvider` reservada)
9. **Cloud opcional (Supabase)** — `cloudConfig.ts` + `.env` prontos; sync/marketplace/colaboração
10. **Backlog de qualidade**: migrar warns `set-state-in-effect` (15), CSP no tauri.conf (hoje null), server logs → tabela logs, auto-refresh de sessão MSA/GitHub (refresh tokens)

## 9. Regras de operação com o dono (aprendidas)

- Dono fala PT-BR; responde em PT-BR com relatório final estruturado (o que fez, provas, próximo passo) e contagem de fases restantes quando aplicável.
- Sempre: verificação real após cada mudança (typecheck/build/testes/boot), commits em unidades lógicas (conventional commits), NADA commitado sem pedido? — *não*: dono já pediu repo+commits como fluxo padrão ("faça o Repo e Commit"); continue commitando por fase/fix.
- Prompt errado de outro projeto no meio? Desconsiderar, apagar artefatos, verificar zero contaminação (grep), seguir.
- Adendos permanentes incorporados: version catalog auto-update; **Plan.md = memória pós-compactação (este arquivo) — recriar quando pedido**.
- Qualidade > velocidade: E2E executado de verdade, bug reproduzido antes de fix, teste novo cobrindo o bug.

## 10. Comandos rápidos

```bash
cd ~/nexuscraft-studio
pnpm tauri dev                      # rodar o app
pnpm verify                         # typecheck + lint + vitest + vite build
cd src-tauri && cargo test          # unit
cargo test -- --ignored --nocapture # E2Es (rede/tempo)
git log --oneline                   # 18 commits, tree limpa
```

## 11. Mapeamento de fases (referência permanente)

| Fase | Conteúdo | Status |
|---|---|---|
| 0 | Shell + SQLite + Settings + Secrets + Palette | ✅ Sessão 2 |
| 1 | Projects Core (template embedded, Monaco, snapshots) | ✅ Sessão 3 |
| 2 | AI Creator + Version Catalog 2026 + streaming | ✅ Sessão 4 |
| 3 | Nexus Agent (12 tools, policy 3 camadas, auditoria) | ✅ Sessão 5 |
| 4 | Build System (E2E jar) + Error Center + Auto-Fix | ✅ Sessão 6 |
| 5 | Launcher (E2E 718MB) + MSA device flow + Run | ✅ Sessão 7 |
| 6 | Server Studio (E2E ciclo) + backups + console stdin | ✅ Sessão 8 |
| 7 | GitHub publish + Dark Kingdom + Quality (ESLint/Vitest/CI) | ✅ Sessão 9 — **MVP COMPLETO** |
| 8+ | Pós-MVP (§8) | 🟡 roadmap |

## 12. Protocolo de Retomada (executar após ler este arquivo)

1. `cd ~/nexuscraft-studio && git log --oneline | head -20 && git status --short` — confirme estado limpo.
2. `pnpm typecheck && pnpm lint && pnpm test:unit` e `cd src-tauri && cargo test` — tudo verde antes de qualquer mudança.
3. Leia `README.md` + `docs/architecture.md` para detalhes de design.
4. NÃO reescrever sistemas existentes; seguir princípios (§5) e o briefing original (61 seções, resumo em `docs/architecture.md`).
5. Se o dono pedir feature nova: planejar dentro das regras, implementar incrementalmente, verificar (E2E quando couber), commitar, relatar.
6. Se o dono disser **"crie o arquivo Plan.md"**: atualizar ESTE documento com tudo que aconteceu desde a última versão (novas sessões em §4, novos bugs em §6, novos itens em §8) e commitar.

---

*Última atualização: Sessão 11 — Pós-MVP Wave 1 entregue: módulos misturáveis (Economy/Prison/Token Chain com SHA-256 ledger), túnel público grátis (playit.gg), release multi-plataforma (release.yml). Próximo marco: primeira tag `v0.1.0` → executáveis para download.*
