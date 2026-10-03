/**
 * Shader Studio service — packs in the workspace, install to instances.
 * All filesystem work happens behind the Rust path guard (`shaders.rs`);
 * the frontend never touches disk directly.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ShaderStyle } from "./shaderStyleCatalog";
import {
  generateShaderPack,
  type ShaderPackFile,
} from "./shaderPackGenerator";

export interface ShaderPackInfo {
  slug: string;
  name: string;
  styleId: string;
  createdAt: string;
  path: string;
}

export interface ShaderInstallResult {
  installedPath: string;
}

/** Creates a shaderpack in `<base>/shaderpacks/<slug>/` from a style preset. */
export async function createShaderPack(options: {
  basePath: string;
  style: ShaderStyle;
  name: string;
}): Promise<ShaderPackInfo> {
  const pack = generateShaderPack(options.style, options.name);
  return invoke<ShaderPackInfo>("shaders_create_pack", {
    basePath: options.basePath,
    slug: pack.slug,
    files: pack.files satisfies ShaderPackFile[],
  });
}

export async function listShaderPacks(basePath: string): Promise<ShaderPackInfo[]> {
  return invoke<ShaderPackInfo[]>("shaders_list_packs", { basePath });
}

export async function deleteShaderPack(basePath: string, slug: string): Promise<void> {
  await invoke("shaders_delete_pack", { basePath, slug });
}

export async function installShaderPack(
  basePath: string,
  instanceSlug: string,
  packSlug: string,
): Promise<ShaderInstallResult> {
  return invoke<ShaderInstallResult>("shaders_install_pack", {
    basePath,
    instanceSlug,
    packSlug,
  });
}

/** Prepared instances (the launcher marks them with options.txt). */
export async function listShaderInstances(basePath: string): Promise<string[]> {
  return invoke<string[]>("shaders_list_instances", { basePath });
}

/** Pack-relative read inside the workspace guard (Monaco editor source). */
export async function readShaderPackFile(
  basePath: string,
  slug: string,
  relPath: string,
): Promise<string> {
  const result = await invoke<{ content: string }>("read_project_file", {
    basePath,
    rel: `shaderpacks/${slug}/${relPath}`,
  });
  return result.content;
}

/** Pack-relative write inside the workspace guard (Monaco editor save). */
export async function writeShaderPackFile(
  basePath: string,
  slug: string,
  relPath: string,
  content: string,
): Promise<void> {
  await invoke("write_project_file", {
    basePath,
    rel: `shaderpacks/${slug}/${relPath}`,
    content,
  });
}
