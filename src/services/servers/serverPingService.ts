/**
 * Server List Ping service (desktop) — wraps the Rust SLP command.
 * Address parsing + types live in @voxel/core (shared with mobile).
 */

import { invoke } from "@tauri-apps/api/core";
import { parseServerAddress, type ServerPingData } from "@voxel/core/serverPing";

export { parseServerAddress };
export type { ServerPingData, ParsedAddress } from "@voxel/core/serverPing";

export async function pingServer(address: string): Promise<ServerPingData> {
  const parsed = parseServerAddress(address);
  if (!parsed) {
    throw new Error("Enter a valid address — e.g. play.example.net or play.example.net:25565");
  }
  return invoke<ServerPingData>("server_ping", {
    host: parsed.host,
    port: parsed.port,
  });
}
