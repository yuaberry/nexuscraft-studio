import { invoke } from "@tauri-apps/api/core";
import type { EnvironmentInfo } from "@/types";

export async function detectEnvironment(): Promise<EnvironmentInfo> {
  return invoke<EnvironmentInfo>("detect_environment");
}
