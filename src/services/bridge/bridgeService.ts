/**
 * VOXEL Bridge service (desktop side) — turns the mobile connection on/off.
 * When starting, the current AI configuration (provider/base URL/model —
 * NEVER the key) is pushed to the bridge so the phone can chat through
 * the PC's provider setup.
 */

import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settingsStore";
import { getProviderMeta } from "@/services/ai/providers";

export interface BridgeInfo {
  running: boolean;
  port: number;
  token: string | null;
  addresses: string[];
}

export async function bridgeStatus(): Promise<BridgeInfo> {
  return invoke<BridgeInfo>("bridge_status");
}

export async function bridgeStart(): Promise<BridgeInfo> {
  // Push AI config (no key — the key lives in the PC keyring only)
  const ai = useSettingsStore.getState().settings.ai;
  const meta = getProviderMeta(ai.provider);
  const baseUrl = ai.baseUrl?.trim() ? ai.baseUrl.trim() : meta.defaultBaseUrl;
  await invoke("bridge_set_ai_config", {
    provider: ai.provider,
    baseUrl: baseUrl ?? "",
    model: ai.model.trim(),
  }).catch(() => {});
  return invoke<BridgeInfo>("bridge_start");
}

export async function bridgeStop(): Promise<void> {
  await invoke("bridge_stop");
}
