import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ServerBackupInfo } from "@/types";
import { slugify } from "@/services/projects/projectsService";

/**
 * Server Studio service (Fase 6) — lifecycle, console and backups.
 * Real processes streamed through Rust events; world-safe stop via stdin.
 */

export interface ServerSetupResult {
  serverDir: string;
  jarPath: string;
}

export async function createServerCommand(options: {
  basePath: string;
  slug: string;
  name: string;
  software: string;
  mcVersion: string;
  port: number;
  ramMb: number;
  acceptEula: boolean;
  /** Style-preset server.properties overrides (Rust-validated) */
  properties?: Record<string, string>;
}): Promise<ServerSetupResult> {
  const result = await invoke<{ serverDir: string; jarPath: string }>(
    "server_create",
    {
      basePath: options.basePath,
      slug: options.slug,
      name: options.name,
      software: options.software,
      mcVersion: options.mcVersion,
      port: options.port,
      ramMb: options.ramMb,
      acceptEula: options.acceptEula,
      properties: options.properties && Object.keys(options.properties).length > 0
        ? options.properties
        : null,
    },
  );
  return { serverDir: result.serverDir, jarPath: result.jarPath };
}

export { slugify };

export async function startServer(
  basePath: string,
  slug: string,
  ramMb: number,
  customJavaPath?: string,
): Promise<void> {
  await invoke("server_start", {
    basePath,
    slug,
    ramMb,
    customJavaPath: customJavaPath?.trim() ? customJavaPath.trim() : null,
  });
}

export async function stopServer(slug: string): Promise<void> {
  await invoke("server_stop", { slug });
}

export async function serverIsRunning(slug: string): Promise<boolean> {
  return invoke<boolean>("server_status", { slug });
}

export async function sendServerCommand(
  slug: string,
  commandLine: string,
): Promise<void> {
  await invoke("server_send_command", { slug, commandLine });
}

export async function backupServer(
  basePath: string,
  slug: string,
): Promise<ServerBackupInfo> {
  const result = await invoke<{
    id: string;
    fileName: string;
    path: string;
    sizeBytes: number;
    createdAt: string;
  }>("server_backup", { basePath, slug });
  return {
    id: result.id,
    fileName: result.fileName,
    path: result.path,
    sizeBytes: result.sizeBytes,
    createdAt: result.createdAt,
  };
}

export async function listServerBackups(
  basePath: string,
  slug: string,
): Promise<ServerBackupInfo[]> {
  const rows = await invoke<
    Array<{
      id: string;
      fileName: string;
      path: string;
      sizeBytes: number;
      createdAt: string;
    }>
  >("server_list_backups", { basePath, slug });
  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    path: row.path,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
  }));
}

export async function restoreServerBackup(
  basePath: string,
  slug: string,
  backupPath: string,
): Promise<void> {
  await invoke("server_restore", { basePath, slug, backupPath });
}

export async function deleteServer(basePath: string, slug: string): Promise<void> {
  await invoke("server_delete", { basePath, slug });
}

/** Subscribes to console streams for a server key ("server/<slug>"). */
export async function subscribeServerConsole(
  slug: string,
  handlers: {
    onLog: (stream: "stdout" | "stderr", line: string) => void;
    onExit: (success: boolean) => void;
  },
): Promise<UnlistenFn[]> {
  const key = `server/${slug}`;
  const log = await listen<{ project: string; stream: string; line: string }>(
    "server:log",
    (event) => {
      if (event.payload.project !== key) return;
      handlers.onLog(event.payload.stream as "stdout" | "stderr", event.payload.line);
    },
  );
  const exit = await listen<{ project: string; success: boolean }>(
    "server:exit",
    (event) => {
      if (event.payload.project !== key) return;
      handlers.onExit(event.payload.success);
    },
  );
  return [log, exit];
}
