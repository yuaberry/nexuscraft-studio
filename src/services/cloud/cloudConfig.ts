/**
 * Cloud backend configuration — OPTIONAL layer.
 *
 * NexusCraft Studio is local-first by design: everything works offline with
 * zero cloud. Supabase enters the architecture as a FUTURE optional layer
 * (project sync, marketplace, collaboration) — Phase 7+.
 *
 * This service reads build-time configuration (VITE_* from .env) and exposes
 * connection status. It intentionally contains NO network calls yet: when the
 * cloud layer is implemented, this contract gets a SupabaseBackend and,
 * if needed, a self-hosted PostgresBackend — both behind the same interface.
 */

export interface CloudConfig {
  /** Supabase project URL, e.g. https://xyz.supabase.co */
  supabaseUrl: string;
  /** Public anon key (safe for the frontend bundle) */
  supabaseAnonKey: string;
  configured: boolean;
}

export interface CloudBackend {
  readonly name: string;
  /** Returns true when the backend has all credentials it needs. */
  isConfigured(): boolean;
  /** Health check against the remote backend. Not implemented yet. */
  ping(): Promise<{ ok: boolean; message: string }>;
}

export function readCloudConfig(): CloudConfig {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

  return {
    supabaseUrl,
    supabaseAnonKey,
    configured:
      supabaseUrl.startsWith("https://") &&
      supabaseUrl.endsWith(".supabase.co") &&
      supabaseAnonKey.length > 20,
  };
}

/**
 * Placeholder backend — honest by construction.
 * Returns a clear "not implemented" result instead of faking connectivity.
 */
export class UnconfiguredCloudBackend implements CloudBackend {
  readonly name = "unconfigured";

  isConfigured(): boolean {
    return false;
  }

  async ping(): Promise<{ ok: boolean; message: string }> {
    return {
      ok: false,
      message:
        "Cloud layer not implemented yet (planned for Phase 7+). " +
        "The app is fully functional offline — nothing requires the cloud.",
    };
  }
}

export function getCloudBackend(): CloudBackend {
  // When Supabase lands: return readCloudConfig().configured
  //   ? new SupabaseBackend(...) : new UnconfiguredCloudBackend();
  return new UnconfiguredCloudBackend();
}
