/**
 * Server List Ping types + address parsing — shared by desktop
 * (Rust invoke wrapper) and mobile (VOXEL Bridge proxy).
 */

export interface ServerPingData {
  host: string;
  port: number;
  latencyMs: number;
  version: string;
  protocol: number;
  playersOnline: number;
  playersMax: number;
  /** Plain text (chat components flattened) */
  motd: string;
  /** Raw description — legacy § string or component JSON string */
  motdRaw: string;
  favicon: string | null;
  modsJson: string | null;
}

export interface ParsedAddress {
  host: string;
  port: number;
}

/** "play.net" | "play.net:25566" | "https://play.net/join" → host+port. */
export function parseServerAddress(input: string): ParsedAddress | null {
  let text = input.trim();
  if (!text) return null;
  const schemeMatch = text.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);
  if (schemeMatch) {
    text = text.slice(schemeMatch[0].length);
  }
  const hostPart = text.split("/")[0] ?? "";
  const [host, portRaw] = hostPart.split(":");
  const cleanHost = (host ?? "").trim().toLowerCase();
  if (!cleanHost || !/^[a-z0-9.-]+$/.test(cleanHost)) {
    return null;
  }
  let port = 25565;
  if (portRaw !== undefined) {
    if (!/^\d{1,5}$/.test(portRaw)) return null;
    const parsed = Number(portRaw);
    if (parsed < 1 || parsed > 65535) return null;
    port = parsed;
  }
  return { host: cleanHost, port };
}
