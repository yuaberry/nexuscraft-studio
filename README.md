# NexusCraft Studio

> **Imagine it. Describe it. Build it. Play it.**
> AI Minecraft Creation Studio

NexusCraft Studio é uma plataforma desktop de criação assistida por IA para Minecraft Java Edition. **O MVP está completo e provado de ponta a ponta**: crie um mod com linguagem natural, compile-o de verdade com Gradle, corrija erros com um agente sandboxado, rode o Minecraft com o seu mod instalado e publique o projeto no GitHub.

```
NO FAKE DATA — cada tela mostra apenas o que funciona.
Prova real: 10 testes unitários Rust + 3 E2E (mod compilado, launcher
de 718MB oficiais, servidor boot/stop/backup) + 7 testes TS, tudo verde.
```

---

## ✅ Status — MVP completo (Fases 0–7)

| Sistema | Estado |
|---|---|
| App shell premium (Tauri 2, dark-first, glassmorphism, Ctrl+K palette) | ✅ |
| SQLite com schema versionado (18 tabelas, migrations idempotentes) | ✅ |
| AI Provider Layer — OpenRouter/OpenAI/Anthropic/Ollama, streaming + vision | ✅ |
| Credentials no OS keyring (nunca no banco, nunca em logs) | ✅ |
| Version Catalog auto-atualizável — Mojang + Fabric + Forge + NeoForge + Paper (TTL 12h) | ✅ |
| Projects Core — wizard com versão selecionável (esquemas 1.x e 26.x), Monaco, snapshots git | ✅ |
| Nexus Agent — 12 tools com sandbox Rust, auditoria em `ai_tool_calls`, auto-snapshot | ✅ |
| Build System — `./gradlew build` ao vivo, Error Center, Auto-Fix ≤5 tentativas | ✅ |
| Launcher — instâncias isoladas, downloads oficiais SHA-1 (718MB provados), MS device flow | ✅ |
| Server Studio — vanilla/Paper oficiais, console stdin, backups/restore, properties | ✅ |
| GitHub — device flow, create repo, push com header transitório (token nunca persistido) | ✅ |
| Dark Kingdom — projeto-exemplo criado automaticamente (espada, receita, advancement) | ✅ |
| Qualidade — ErrorBoundary, ESLint, Vitest, CI (GitHub Actions), 20 testes automatizados | ✅ |

## 🚀 Como rodar

```bash
pnpm install
pnpm tauri dev        # abre o app completo
pnpm verify           # typecheck + lint + testes + build
```

Fluxo completo em 4 passos (primeira vez):

1. **Settings → AI** — configure provider, key (vai para o keyring) e modelo; **Settings → Storage** — escolha a pasta do workspace (`~/NexusCraft`)
2. O **Dark Kingdom** nasce automaticamente como exemplo — abra o workspace e pressione **Build** (cache Gradle compartilhado; primeira build baixa dependências)
3. **AI Creator (Agent mode)** — *"add a Voidcutter sword: item, model, lang and recipe"* — o agente edita os arquivos com auditoria e snapshot
4. **Run** — instância isolada preparada com arquivos oficiais → Minecraft abre com o seu mod (requer Microsoft sign-in uma vez: Settings → Launcher)

Para **jogadores de servidor**: aba **Servers** → wizard (vanilla/Paper, versão do catálogo ao vivo) → console em tempo real, backups e restore.

Para **publicar**: workspace → **Publish** → commit + repo GitHub + push.

## Arquitetura em uma página

```
Frontend (React 18 + TS + Vite + Tailwind)
  features/ ai-creator · projects · servers · settings · home
  services/ ai (providers/streaming/agent) · build · launcher · servers · github · db
        │ invoke (Tauri IPC, tipado)
Rust core — perímetro de segurança
  commands/ fs (path guard) · process (allowlist + stdin) · git · launcher
  templates (embedded) · servers (checksums) · secrets (keyring)
        │
SQLite (18 tabelas) · Gradle 8.8 · git · java · endpoints oficiais Mojang/Fabric/Paper
```

Decisões-chave no [`docs/architecture.md`](docs/architecture.md) (AD-1..AD-11 + revisões).

## Segurança & Legal

- Nenhum bypass de autenticação, DRM ou conta — Microsoft e GitHub via **device flow** legítimo, com client_id configurável
- Arquivos do Minecraft obtidos em runtime dos endpoints oficiais, para uso local — **nada é redistribuído**
- Tokens: OS keyring; push GitHub usa header transitório que nunca toca o disco
- Sandbox: toda operação de arquivos passa pelo path guard Rust; shell arbitrário é proibido por design
- **NexusCraft Studio is an independent third-party tool and is not affiliated with Mojang Studios or Microsoft.**

## Testes (todos executados)

| Suíte | Escopo |
|---|---|
| `cargo test` | 10 unit (template engine, edits, search, guards, base64) |
| `cargo test -- --ignored` | 3 E2E: mod compila (jar real), launcher baixa 718MB oficiais com SHA-1, servidor boot→stop→backup→restore |
| `pnpm test:unit` | 7 Vitest (error parser do Auto-Fix, extração de spec) |
| CI (`.github/workflows/ci.yml`) | typecheck + lint + vitest + vite build + cargo test |

## Roadmap pós-MVP (do briefing original)

- **Modpack Creator** — seleção, resolução de dependências, Compatibility Score
- **Shader Studio** — editor GLSL com preview e parameters
- **Resource Pack / World / Structure Studios** — texture workspace, geradores
- **Forge & NeoForge templates** — o Version Adapter já mapeia as versões
- **Server Templates** — Prison, SkyBlock, Factions, Economy Engine
- **Marketplace** — mods/plugins/assets com licenciamento (author/license/source/version)
- **Docker + Deployment Providers** — VPS/SSH/cloud para servidores
- **Cloud opcional (Supabase)** — sync e colaboração (`.env` já preparado)

---

**Legal:** This is an independent tool. Minecraft is a trademark of Mojang Studios/Microsoft — no affiliation, no redistribution of proprietary assets.
