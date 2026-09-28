/** Minecraft Version Catalog — auto-updating, official + community sources. */

export type McVersionKind = "release" | "snapshot" | "old_beta" | "old_alpha";
export type LoaderId = "fabric" | "forge" | "neoforge";

export interface MinecraftVersionInfo {
  version: string;
  kind: McVersionKind;
  releaseTime: string | null;
  loaders: LoaderId[];
  serverSoftware: string[];
  javaRelease: number;
  experimental: boolean;
  fabric: { yarn: string | null; fabricApi: string; loader: string } | null;
  forge: { recommended: string } | null;
  neoforge: { latest: string } | null;
}

export interface CatalogStatus {
  lastFetchedAt: string | null;
  count: number;
  source: "cache" | "fresh" | "fallback";
}
