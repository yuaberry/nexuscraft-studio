-- Migration 002 — Minecraft Version Catalog cache (auto-updating, official +
-- community sources). One row per Minecraft version with resolved loader data.

ALTER TABLE minecraft_versions ADD COLUMN kind TEXT NOT NULL DEFAULT 'release';
ALTER TABLE minecraft_versions ADD COLUMN release_time TEXT;
ALTER TABLE minecraft_versions ADD COLUMN loaders TEXT NOT NULL DEFAULT '';
ALTER TABLE minecraft_versions ADD COLUMN server_software TEXT NOT NULL DEFAULT 'vanilla';
ALTER TABLE minecraft_versions ADD COLUMN java_release INTEGER NOT NULL DEFAULT 17;
ALTER TABLE minecraft_versions ADD COLUMN yarn_mappings TEXT;
ALTER TABLE minecraft_versions ADD COLUMN fabric_api TEXT;
ALTER TABLE minecraft_versions ADD COLUMN fabric_loader TEXT;
ALTER TABLE minecraft_versions ADD COLUMN forge_recommended TEXT;
ALTER TABLE minecraft_versions ADD COLUMN neoforge_latest TEXT;
ALTER TABLE minecraft_versions ADD COLUMN experimental BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE minecraft_versions ADD COLUMN fetched_at TEXT;

CREATE INDEX IF NOT EXISTS idx_mc_versions_kind ON minecraft_versions(kind);
