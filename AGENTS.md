# VOXEL — Agent Rules

1. **Continuidade**: o chat pode ser compactado. O documento-mãe é o **`Plan.md`** na raiz deste repositório. Ao iniciar qualquer trabalho: leia o `Plan.md` INTEIRO primeiro, depois `README.md`, `docs/PROJECT_AUDIT.md` e `docs/VOXEL_ROADMAP.md`, e execute o Protocolo de Retomada (Plan.md §12).
2. **Regra do dono**: quando ele disser *"crie o arquivo Plan.md"*, gere/atualize o `Plan.md` com o estado completo (histórico de sessões, decisões, bugs, roadmap) e faça o commit.
3. Antes de alterar código: rode `pnpm typecheck && pnpm lint && pnpm test:unit` e `cd src-tauri && cargo test` — tudo deve estar verde.
4. Nunca introduza dados falsos ("no fake data"): features pendentes recebem interfaces reais com TODO ou páginas de roadmap honestas.
5. Rust é o perímetro de segurança: toda operação de FS/processo/segredo passa por `src-tauri/src/commands/*` com path guard/allowlist. Tokens vão para o OS keyring — nunca no SQLite, logs ou git.
6. Resultados de commands Rust serializam em camelCase (`rename_all`) — os tipos TS devem ler camelCase.
7. Migrations SQLite são append-only (`src-tauri/src/migrations/`).
8. Todo sistema novo ganha teste unitário; sistemas críticos (build, launcher, servers) ganham também E2E `#[ignore]` executado com `cargo test -- --ignored`.
9. Commits: conventional commits, unidades lógicas, mensagens em inglês explicando o porquê.
10. Nunca implementar bypass de autenticação/DRM; downloads sempre de endpoints oficiais com checksum; "VOXEL is an independent third-party creation platform and is not affiliated with Mojang Studios or Microsoft."
11. **Branding (VOXEL)**: o nome oficial é **VOXEL** ("AI-Powered Creation Platform", tagline "Imagine. Create. Build. Play."). IDs internos da era NexusCraft são preservados por compat (identifier `dev.yuadevs.nexuscraft-studio`, `nexuscraft.db`, namespaces `nexus_*`, crate name) — nunca os renomeie sem uma migration planejada. Memória de projeto: `.voxel/` (novo) com fallback `.nexus/` (legado).
12. **Roadmap**: novas features seguem as fases de `docs/VOXEL_ROADMAP.md` — incremental, sem rewrites, sem destruir o que funciona.
