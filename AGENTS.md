# NexusCraft Studio — Agent Rules

1. **Continuidade**: o chat pode ser compactado. O documento-mãe é o **`Plan.md`** na raiz deste repositório. Ao iniciar qualquer trabalho: leia o `Plan.md` INTEIRO primeiro, depois `README.md` e `docs/architecture.md`, e execute o Protocolo de Retomada (Plan.md §12).
2. **Regra do dono**: quando ele disser *"crie o arquivo Plan.md"*, gere/atualize o `Plan.md` com o estado completo (histórico de sessões, decisões, bugs, roadmap) e faça o commit.
3. Antes de alterar código: rode `pnpm typecheck && pnpm lint && pnpm test:unit` e `cd src-tauri && cargo test` — tudo deve estar verde.
4. Nunca introduza dados falsos ("no fake data"): features pendentes recebem interfaces reais com TODO ou páginas de roadmap honestas.
5. Rust é o perímetro de segurança: toda operação de FS/processo/segredo passa por `src-tauri/src/commands/*` com path guard/allowlist. Tokens vão para o OS keyring — nunca no SQLite, logs ou git.
6. Resultados de commands Rust serializam em camelCase (`rename_all`) — os tipos TS devem ler camelCase.
7. Migrations SQLite são append-only (`src-tauri/src/migrations/`).
8. Todo sistema novo ganha teste unitário; sistemas críticos (build, launcher, servers) ganham também E2E `#[ignore]` executado com `cargo test -- --ignored`.
9. Commits: conventional commits, unidades lógicas, mensagens em inglês explicando o porquê.
10. Nunca implementar bypass de autenticação/DRM; downloads sempre de endpoints oficiais com checksum; "NexusCraft Studio is an independent third-party tool and is not affiliated with Mojang Studios or Microsoft."
