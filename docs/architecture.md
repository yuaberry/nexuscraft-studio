# NexusCraft Studio — Arquitetura

Versão condensada do plano aprovado. O documento completo com riscos e critérios por fase vive no histórico de planejamento do projeto.

## Visão de camadas

```
┌────────────────────────────────────────────────────────────┐
│  FRONTEND  React 18 + TS + Vite + Tailwind + shadcn-style   │
├────────────────────────────────────────────────────────────┤
│  DOMAIN SERVICES (TypeScript)                               │
│  AI Provider Layer · Settings · Storage · Environment       │
│  (Futuro: Agent Orchestrator · Build · Consistency Engine)  │
├─────────────────────── IPC tipado (invoke) ─────────────────┤
│  RUST CORE  —  autoridade de segurança                     │
│  secrets (keyring) · storage (path validation)              │
│  environment (comandos fixos, sem input do usuário)        │
├────────────────────────────────────────────────────────────┤
│  SQLite (18 tabelas) · Sistema (git, java, xdg-open)        │
└────────────────────────────────────────────────────────────┘
```

## Decisões arquiteturais

**AD-1 — Cérebro em TypeScript, autoridade em Rust.**
Nenhuma operação de disco, processo ou segredo acontece fora dos comandos Rust. O frontend nunca toca o FS diretamente; o agente de IA (Fase 3) herdará essa fronteira obrigatória.

**AD-2 — AI Provider Layer como plugin HTTP.**
Contrato único assíncrono. OpenRouter (padrão), OpenAI-compatible, Anthropic-compatible, Ollama. Provider/model/temperature/max-tokens são configuração, nunca código. Chaves vivem no OS keyring — nunca no SQLite, nunca em logs.

**AD-3 — Nexus Agent = loop de tools com policy de 3 camadas.**
(1) validação Rust por tool-call (path guard + allowlist de executáveis); (2) auditoria em `ai_tool_calls`; (3) confirmação de UI para operações destrutivas. Sem shell arbitrário. Orçamento de steps/tokens para evitar loops infinitos.

**AD-4 — Geração de mods = templates determinísticos + conteúdo por IA.**
Scaffolding (build.gradle, fabric.mod.json, mixins) vem de templates versionados no app, testados por CI. A IA gera conteúdo dentro da estrutura — reduz alucinação de boilerplate.

**AD-5 — Version Adapter = manifest de conhecimento versionado.**
`minecraft-versions/*.json` declara loaders, mappings, Java e snippets por versão. MVP: 1.20.1 + Fabric. Suportar 1.21.x = adicionar dados, não reescrever código.

**AD-6 — `.nexus/` como contrato de memória.**
`project-spec.json` é a fonte da verdade. Style/Lore/Asset/Gameplay bibles alimentam o contexto de toda sessão de IA (Context Assembly).

**AD-7 — Snapshots = Git.**
Commit rotulado antes de qualquer operação destrutiva. Restore/compare/diff reusam o Git.

**AD-8 — Processos via eventos.**
Rust spawna processos (gradlew, java, server jars) e emite stdout/stderr por eventos. Terminal e console do servidor são reais por construção.

**AD-9 — Launcher: instâncias isoladas, fontes oficiais, auth legítima.**
Estilo MultiMC/Prism. Binários dos endpoints oficiais da Mojang, baixados localmente pelo usuário. Microsoft OAuth device flow. Nada de offline-bypass ou redistribuição.

**AD-10 — SQLite via plugin com repositórios TS tipados.**
Migrations versionadas e idempotentes. Acesso sempre via `repositories/` — nunca SQL espalhado na UI.

**AD-11 — Servidores: núcleo honesto primeiro.**
Wizard, start/stop, console, backups. Prison/SkyBlock/economia ficam em templates registrados para fases futuras.

## Perímetro de segurança (implementado na Fase 0)

- **Secrets:** OS keyring com probe de disponibilidade; fallback `secrets.json` com `chmod 600`. O backend ativo é sempre reportado à UI.
- **Capabilities (Tauri 2 ACL):** least-privilege explícito — SQL, dialog e HTTP com escopo de domínios de IA + localhost. `tauri-plugin-shell` proibido.
- **open_in_file_manager:** apenas caminhos absolutos, existentes, dentro do home do usuário. Binário fixo por SO, argumento único, sem shell.
- **Ambiente:** comandos fixos (`java -version`, `git --version`) — nenhum input do usuário alcança execução de processo nesta fase.

## Plano de fases

| Fase | Entrega | Critério de aceitação |
|---|---|---|
| 0 ✅ | Shell + SQLite + Settings + Security + Palette | App abre; key OpenRouter salva no keyring; 18 tabelas migradas |
| 1 ✅ | Projects core | Projeto Fabric criado do template; Monaco edita; snapshot/rollback |
| 2 ✅ | AI streaming + AI Creator + Version Catalog | Chat com contexto; spec proposta/salva; catálogo auto-atualizado (26.x) |
| 3 ✅ | Nexus Agent | 12 tools com sandbox; auditoria; "Voidcutter" → arquivos reais |
| 4 ✅ | Build System | `./gradlew build` ao vivo; Error Center; Auto-Fix ≤5; **E2E: jar compilado** |
| 5 ✅ | Instâncias + Launcher | Downloads oficiais SHA-1 (E2E 718MB); device flow MSA (client id configurável); RUN lança com o mod |
| 6 ✅ | Server Studio | E2E: vanilla 1.20.1 boot→stop→backup→restore provado; Paper via Fill API; stdin console |
| 7 | GitHub + E2E | Dark Kingdom: Create → Build → Run; push para GitHub |

## Regras de desenvolvimento

1. Cada fase exige `pnpm typecheck` + `pnpm build` + `cargo check` verdes.
2. Nenhum componente de UI sem função real — roadmap honesto no lugar.
3. Toda nova permissão IPC precisa de justificativa escrita em `capabilities/default.json`.
4. Migrations são append-only — nunca editar uma migration publicada.
