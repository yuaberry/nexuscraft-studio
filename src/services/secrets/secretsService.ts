import { invoke } from "@tauri-apps/api/core";
import type { SecretBackendInfo, SecretsOpResult } from "@/types";

export const AI_API_KEY_ID = "ai_api_key";

export async function secretsSet(key: string, value: string): Promise<SecretsOpResult> {
  return invoke<SecretsOpResult>("secrets_set", { key, value });
}

export async function secretsGet(key: string): Promise<string | null> {
  return invoke<string | null>("secrets_get", { key });
}

export async function secretsHas(key: string): Promise<boolean> {
  return invoke<boolean>("secrets_has", { key });
}

export async function secretsDelete(key: string): Promise<SecretsOpResult> {
  return invoke<SecretsOpResult>("secrets_delete", { key });
}

export async function secretsClearAll(): Promise<SecretsOpResult> {
  return invoke<SecretsOpResult>("secrets_clear_all");
}

export async function secretsBackendInfo(): Promise<SecretBackendInfo> {
  return invoke<SecretBackendInfo>("secrets_backend_info");
}
