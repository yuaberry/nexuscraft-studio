import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Token Chain panel service — the app is the mint: every operation goes
 * through the real SHA-256 hash chain (Rust), and the in-game shop
 * purchases detected in the server log are processed through it.
 */

export interface LedgerBlock {
  index: number;
  timestamp: string;
  tx: string;
  from: string;
  to: string;
  amount: number;
  prev: string;
  hash: string;
}

export interface LedgerSnapshot {
  blocks: LedgerBlock[];
  balances: Record<string, number>;
  length: number;
}

export interface VerifyResult {
  valid: boolean;
  checked: number;
  firstBadIndex: number | null;
}

export async function initLedger(basePath: string, slug: string, currency: string): Promise<LedgerBlock> {
  return invoke<LedgerBlock>("ledger_init", { basePath, slug, currency });
}

export async function applyLedgerTx(options: {
  basePath: string;
  slug: string;
  tx: "mint" | "transfer" | "burn";
  from: string;
  to: string;
  amount: number;
}): Promise<LedgerBlock> {
  return invoke<LedgerBlock>("ledger_apply", {
    basePath: options.basePath,
    slug: options.slug,
    tx: options.tx,
    from: options.from,
    to: options.to,
    amount: options.amount,
  });
}

export async function listLedger(basePath: string, slug: string): Promise<LedgerSnapshot> {
  return invoke<LedgerSnapshot>("ledger_list", { basePath, slug });
}

export async function verifyLedger(basePath: string, slug: string): Promise<VerifyResult> {
  return invoke<VerifyResult>("ledger_verify", { basePath, slug });
}

export async function tailPurchaseIntents(
  basePath: string,
  slug: string,
): Promise<Array<{ player: string; itemId: number }>> {
  return invoke<Array<{ player: string; itemId: number }>>("ledger_tail_intents", {
    basePath,
    slug,
  });
}

/** Market catalog — the panel delivers items via the server console. */
export const MARKET_ITEMS: Record<number, { name: string; price: number; giveCommand: string }> = {
  1: { name: "Iron Sword", price: 5, giveCommand: "give @s iron_sword 1" },
  2: { name: "Iron Pickaxe", price: 8, giveCommand: "give @s iron_pickaxe 1" },
  3: { name: "Bread x16", price: 3, giveCommand: "give @s bread 16" },
  4: { name: "Ender Pearl x4", price: 12, giveCommand: "give @s ender_pearl 4" },
  5: { name: "Elytra", price: 50, giveCommand: "give @s elytra 1" },
};

// ---------------------------------------------------------------------------
// Tunnel (public server, free)
// ---------------------------------------------------------------------------

export async function tunnelSetup(basePath: string): Promise<{ agentPath: string; downloaded: boolean }> {
  return invoke<{ agentPath: string; downloaded: boolean }>("tunnel_setup", { basePath });
}

export async function tunnelStart(options: {
  basePath: string;
  slug: string;
  port: number;
  secret?: string;
}): Promise<void> {
  await invoke("tunnel_start", {
    basePath: options.basePath,
    slug: options.slug,
    localPort: options.port,
    secret: options.secret?.trim() ? options.secret.trim() : null,
  });
}

export async function tunnelStop(slug: string): Promise<void> {
  await invoke("tunnel_stop", { slug }).catch(() => invoke("tunnel_force_stop", { slug }));
}

export async function tunnelStatus(slug: string): Promise<boolean> {
  return invoke<boolean>("tunnel_status", { slug });
}

export async function subscribeTunnelLog(
  slug: string,
  onLine: (line: string) => void,
  onExit: () => void,
): Promise<UnlistenFn[]> {
  const key = `tunnel/${slug}`;
  const log = await listen<{ project: string; line: string }>("tunnel:log", (event) => {
    if (event.payload.project !== key) return;
    onLine(event.payload.line);
  });
  const exit = await listen<{ project: string }>("tunnel:exit", (event) => {
    if (event.payload.project !== key) return;
    onExit();
  });
  return [log, exit];
}

/** Extracts the public address from agent output lines. */
export function parseTunnelAddress(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const address = line.match(/([\w-]+\.playit\.gg(?::\d+)?)/);
    if (address) return address[1];
  }
  return null;
}
