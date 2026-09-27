# NexusCraft Studio

> **Imagine it. Describe it. Build it. Play it.**
> AI Minecraft Creation Studio

NexusCraft Studio é uma plataforma desktop de criação assistida por IA para Minecraft Java Edition. A fundação (Tauri 2 + Rust + React + TypeScript) já está ativa: aplicação real, banco de dados real, segurança real — sem mock data, sem botões falsos.

```
NEXUS FORGE STYLE: NO FAKE DATA.
Cada tela mostra apenas o que já funciona.
O que está por vir aparece como roadmap honesto.
```

---

## Status atual — Fases 0 e 1 (concluídas)

| Sistema | Estado |
|---|---|
| App shell (Tauri 2, tema dark, glassmorphism) | ✅ |
| SQLite com schema versionado (18 tabelas + migrations) | ✅ |
| Settings persistidos (General/Appearance/AI/Minecraft/Java/Storage/Security/Advanced) | ✅ |
| AI Provider Layer (OpenRouter/OpenAI/Anthropic/Ollama) com **teste de conexão real** | ✅ |
| Credential store via OS keyring (GNOME Keyring/Windows/macOS) com fallback seguro | ✅ |
| Command Palette (Ctrl+K) com navegação e ações reais | ✅ |
| Detecção de ambiente (Java, Git) ao vivo | ✅ |
| Workspace de armazenamento configurável (`~/NexusCraft`) | ✅ |
| **Fase 1:** Wizard de criação de projeto (Fabric 1.20.1 compilável) | ✅ |
| **Fase 1:** Template engine embutido no binário (tokens, testes 5/5) | ✅ |
| **Fase 1:** Project explorer + Monaco Editor (tabs, Ctrl+S, tema nexus-dark) | ✅ |
| **Fase 1:** Git snapshots — criar, listar, restaurar (histórico preservado) | ✅ |
| **Fase 1:** FS sandbox com path guard (`..`, symlinks e escapes recusados) | ✅ |

## Roadmap

- **Fase 2** — AI Creator: chat com streaming, `project-spec.json`, Reference Board
- **Fase 3** — Nexus Agent: tools com sandbox Rust, allowlist, auditoria
- **Fase 4** — Build System: Gradle, Error Center, Auto-Fix
- **Fase 5** — Instâncias isoladas + Launcher (Run Minecraft com o mod)
- **Fase 6** — Server Studio: criar/gerir servidores locais, console, backups
- **Fase 7** — GitHub + projeto exemplo "Dark Kingdom" ponta a ponta

## Criando o primeiro projeto

1. **Settings → Storage** — escolha a pasta do workspace (padrão `~/NexusCraft`)
2. **Projects → Create project** (ou Ctrl+K → "Create new project")
3. Digite um nome (ex.: *Dark Kingdom*) → Create
4. O workspace abre com explorer, editor Monaco e painel de snapshots
5. Edite, salve (Ctrl+S), crie snapshots antes de mudanças grandes

O projeto gerado é um mod Fabric 1.20.1 completo — `./gradlew build` compila (a integração de build chega na Fase 4).

## Requisitos

- Node.js 18+ e pnpm
- Rust (rustup) — Tauri 2
- Linux: `webkit2gtk-4.1`, `libappindicator3` (ver [pré-requisitos Tauri](https://tauri.app/start/prerequisites/))
- Java 17+ (para as próximas fases de build de mods)

## Desenvolvimento

```bash
pnpm install          # dependências
pnpm typecheck        # tsc sem emit (app + vite.config)
pnpm build            # build do frontend (vite)
pnpm tauri dev        # abre a aplicação completa
pnpm tauri build      # binário de release
```

No Linux, o primeiro `cargo build` baixa todas as crates e leva alguns minutos.

## Estrutura

```
src/                  # Frontend React + TypeScript
  components/         # Design system (shadcn-style) + layout
  features/          # home, settings, roadmap
  services/          # DB, AI connection, secrets, storage, environment
  stores/            # zustand
src-tauri/
  src/commands/       # Perímetro Rust: secrets, storage, environment
  src/migrations/    # Schema SQLite versionado
  capabilities/      # Permissões least-privilege do Tauri 2
scripts/              # Geração de ícones
docs/                 # Arquitetura
```

## Ambiente & Cloud opcional

O app é **local-first**: funciona 100% offline. Uma camada cloud **opcional** (Supabase) está preparada para o futuro (sync de projetos, marketplace, colaboração — Fase 7+):

```bash
cp .env.example .env   # edite e preencha os valores localmente
```

- `.env` é **gitignored** — secrets nunca vão para o repo.
- Keys de IA vão no app: **Settings → AI** (guardadas no OS keyring) — não no `.env`.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` alimentam a camada cloud quando ela for ativada (`src/services/cloud/cloudConfig.ts`).
- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o frontend (sem prefixo `VITE_`).

## Arquitetura

Leia [`docs/architecture.md`](docs/architecture.md) — decisões AD-1..AD-11, camadas de segurança e plano de fases.

---

**Legal:** NexusCraft Studio is an independent third-party tool and is not affiliated with Mojang Studios or Microsoft. Nenhum binário ou asset proprietário do Minecraft é distribuído com este aplicativo.
