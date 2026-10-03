# NexusCraft Studio

[![CI](https://github.com/yuaberry/nexuscraft-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/yuaberry/nexuscraft-studio/actions/workflows/ci.yml)
[![Release](https://github.com/yuaberry/nexuscraft-studio/actions/workflows/release.yml/badge.svg)](https://github.com/yuaberry/nexuscraft-studio/releases)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-8b5cf6)

> **Imagine it. Describe it. Build it. Play it.**
> AI Minecraft Creation Studio

**[🌐 Site oficial](https://yuaberry.github.io/nexuscraft-studio/)** ·
**[⬇️ Downloads (v0.1.1)](https://github.com/yuaberry/nexuscraft-studio/releases/latest)** —
Windows `.exe`/`.msi` · Linux `.deb`/`.AppImage` · macOS `.dmg` (Apple Silicon + Intel)

NexusCraft Studio é uma plataforma desktop de criação assistida por IA para Minecraft Java Edition. **O MVP está completo e provado de ponta a ponta**: descreva um mod em linguagem natural, compile-o de verdade com Gradle, corrija erros com um agente sandboxado, rode o Minecraft com o seu jar instalado, monte servidores com economia própria e publique o projeto no GitHub.

```
NO FAKE DATA — cada tela mostra apenas o que funciona.
Prova real: 18 testes unitários Rust + 28 Vitest + 3 E2E executados
(mod compilado, launcher de 718MB oficiais com SHA-1, servidor
boot/stop/backup) — tudo verde, na CI e local.
```

---

## ✅ Status — MVP completo (Fases 0–7) + Pós-MVP Wave 1 & 2

| Sistema | Estado |
|---|---|
| App shell premium (Tauri 2, dark-first, glassmorphism, Ctrl+K palette) | ✅ |
| SQLite com schema versionado (18 tabelas, migrations idempotentes) | ✅ |
| AI Provider Layer — OpenAI-compat/Anthropic/Ollama, streaming + vision | ✅ |
| Credentials no OS keyring (nunca no banco, nunca em logs) | ✅ |
| Version Catalog auto-atualizável — Mojang + Fabric + Forge + NeoForge + Paper (TTL 12h) | ✅ |
| Projects Core — wizard com versão selecionável (esquemas 1.x e 26.x), Monaco, snapshots git | ✅ |
| Nexus Agent — 12 tools com sandbox Rust, auditoria em `ai_tool_calls`, auto-snapshot | ✅ |
| Build System — `./gradlew build` ao vivo, Error Center, Auto-Fix ≤5 tentativas | ✅ |
| Launcher — instâncias isoladas, downloads oficiais SHA-1 (718MB provados), MS device flow | ✅ |
| Server Studio — vanilla/Paper oficiais, console stdin, backups/restore, properties | ✅ |
| Server Modules misturáveis — Economy Coin, Prison, Token Chain (datapacks) | ✅ Wave 1 |
| Token Chain — ledger SHA-256 real (mint/transfer/burn/verify, tamper-evidente) | ✅ Wave 1 |
| Túnel público grátis — playit.gg (servidor acessível de qualquer lugar) | ✅ Wave 1 |
| Shader Studio — 32 looks icônicos como presets → shaderpacks GLSL originais Iris/OptiFire-compat, preview WebGL vivo, editor Monaco, install na instância | ✅ Wave 2 |
| GitHub — device flow, create repo, push com header transitório (token nunca persistido) | ✅ |
| Dark Kingdom — projeto-exemplo criado automaticamente (espada, receita, advancement) | ✅ |
| Release multi-OS + site oficial no GitHub Pages | ✅ |
| Qualidade — ErrorBoundary, ESLint, Vitest, CI (GitHub Actions), 46 testes automatizados | ✅ |

## 🚀 Como rodar (desenvolvimento)

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

Para **estilos visuais**: aba **Shaders** — escolha entre 32 presets (BSL, SEUS, Complementary Reimagined, Solas…) com preview WebGL ao vivo → Create → Install na instância → ative no Iris/OptiFire. Cada preset gera GLSL 100% original; nada é copiado dos originais.

Para **jogadores de servidor**: aba **Servers** → wizard (vanilla/Paper, versão do catálogo ao vivo) → módulos misturáveis (Economia/Prison/Token Chain) → console em tempo real, NexusCoin com ledger verificável, backups, túnel público e restore.

Para **publicar**: workspace → **Publish** → commit + repo GitHub + push.

## Arquitetura em uma página

```
Frontend (React 18 + TS + Vite + Tailwind)
  features/ home · projects · ai-creator · shaders · servers · settings
  services/ ai (providers/streaming/agent) · build · launcher · servers
            shaders · github · db · minecraft (version catalog)
        │ invoke (Tauri IPC, tipado)
Rust core — perímetro de segurança
  commands/ fs (path guard) · process (allowlist + stdin) · git · launcher
  templates (embedded) · servers (checksums) · ledger (SHA-256) · shaders
  tunnel (playit.gg) · secrets (keyring)
        │
SQLite (18 tabelas) · Gradle 8.8 · git · java · endpoints oficiais Mojang/Fabric/Paper
```

Decisões-chave no [`docs/architecture.md`](docs/architecture.md) (AD-1..AD-11 + revisões). Memória de continuidade do projeto: [`Plan.md`](Plan.md).

## Segurança & Legal

- Nenhum bypass de autenticação, DRM ou conta — Microsoft e GitHub via **device flow** legítimo, com client_id configurável
- Arquivos do Minecraft obtidos em runtime dos endpoints oficiais, para uso local — **nada é redistribuído**
- Tokens: OS keyring; push GitHub usa header transitório que nunca toca o disco
- Sandbox: toda operação de arquivos passa pelo path guard Rust; shell arbitrário é proibido por design
- Shader style presets evocam looks da comunidade com **GLSL 100% original** — nada copiado, creditos e busca pelo original dentro do app
- **NexusCraft Studio is an independent third-party tool and is not affiliated with Mojang Studios or Microsoft.**

## Testes (todos executados)

| Suíte | Escopo |
|---|---|
| `cargo test` | 18 unit (template engine, edits, search, guards, ledger hash chain + tamper, shaderpack guards) |
| `cargo test -- --ignored` | 3 E2E: mod compila (jar real), launcher baixa 718MB oficiais com SHA-1, servidor boot→stop→backup→restore |
| `pnpm test:unit` | 28 Vitest (error parser do Auto-Fix, spec, server modules, catálogo de shaders + gerador GLSL com sanidade de parênteses) |
| CI (`.github/workflows/ci.yml`) | typecheck + lint + vitest + vite build + cargo test |
| Release (`.github/workflows/release.yml`) | tag `v*` → .exe/.msi/.deb/.AppImage/.dmg (Windows, Linux, macOS arm64+x64) |

## Roadmap pós-MVP (próximas waves)

- **Modpack Creator** — seleção, resolução de dependências, Compatibility Score
- **Resource Pack / World / Structure Studios** — texture workspace, geradores
- **Forge & NeoForge templates** — o Version Adapter já mapeia as versões
- **Mais módulos de servidor** — SkyBlock, Factions, BedWars
- **Marketplace** — mods/plugins/assets com licenciamento (author/license/source/version)
- **Docker + Deployment Providers** — VPS/SSH/cloud para servidores
- **Cloud opcional (Supabase)** — sync e colaboração (`.env` já preparado)

---

**Legal:** This is an independent tool. Minecraft is a trademark of Mojang Studios/Microsoft — no affiliation, no redistribution of proprietary assets.
