/**
 * Microsoft account authentication (device flow) — the legitimate flow used
 * by open-source launchers. Requires an MSA client_id (Azure app
 * registration) configured in Settings → Launcher; nothing is bypassed.
 *
 * Flow: device code -> MSA token -> Xbox Live -> XSTS -> Minecraft services
 * token -> profile. Secrets go to the OS keyring.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { toast } from "sonner";
import {
  secretsDelete,
  secretsGet,
  secretsHas,
  secretsSet,
} from "@/services/secrets/secretsService";
import { useSettingsStore } from "@/stores/settingsStore";

const DEVICE_CODE_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_URL = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_URL = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_AUTH_URL = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL = "https://api.minecraftservices.com/minecraft/profile";

const KEY_USERNAME = "mc_username";
const KEY_UUID = "mc_uuid";
const KEY_TOKEN = "mc_access_token";
const KEY_EXPIRY = "mc_token_expiry";

export interface MinecraftAccount {
  username: string;
  uuid: string;
  accessToken: string;
  expiresAt: number;
}

async function postForm<T>(url: string, params: Record<string, string>): Promise<T> {
  const res = await tauriFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 250)}`);
  }
  return JSON.parse(text) as T;
}

async function postJson<T>(url: string, body: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
  const res = await tauriFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text) as T;
}

function clientId(): string {
  return useSettingsStore.getState().settings.launcher.clientId.trim();
}

export function isAuthConfigured(): boolean {
  return clientId().length > 10;
}

export async function getStoredAccount(): Promise<MinecraftAccount | null> {
  const [username, uuid, token, expiry] = await Promise.all([
    secretsGet(KEY_USERNAME),
    secretsGet(KEY_UUID),
    secretsGet(KEY_TOKEN),
    secretsGet(KEY_EXPIRY),
  ]);
  if (!username || !uuid || !token) return null;
  return {
    username,
    uuid,
    accessToken: token,
    expiresAt: Number(expiry ?? 0),
  };
}

export async function hasStoredAccount(): Promise<boolean> {
  return secretsHas(KEY_TOKEN);
}

async function storeAccount(account: MinecraftAccount): Promise<void> {
  await Promise.all([
    secretsSet(KEY_USERNAME, account.username),
    secretsSet(KEY_UUID, account.uuid),
    secretsSet(KEY_TOKEN, account.accessToken),
    secretsSet(KEY_EXPIRY, String(account.expiresAt)),
  ]);
}

export async function signOut(): Promise<void> {
  for (const key of [KEY_USERNAME, KEY_UUID, KEY_TOKEN, KEY_EXPIRY]) {
    await secretsDelete(key).catch(() => {});
  }
}

/**
 * Runs the full device-flow sign-in. `onUserCode` receives the code + URL
 * the user must open in a browser.
 */
export async function signInWithMicrosoft(
  onUserCode: (info: { userCode: string; verificationUrl: string }) => void,
): Promise<MinecraftAccount> {
  const id = clientId();
  if (!id) {
    throw new Error("MSA client_id not configured — Settings → Launcher.");
  }

  // 1. Device code
  const device = await postForm<{ user_code: string; verification_uri: string; device_code: string; interval?: number; expires_in: number }>(
    DEVICE_CODE_URL,
    { client_id: id, scope: "XboxLive.signin offline_access" },
  );
  onUserCode({
    userCode: device.user_code,
    verificationUrl: device.verification_uri,
  });

  // 2. Poll for the MSA token
  const pollInterval = (device.interval ?? 5) * 1000;
  const deadline = Date.now() + device.expires_in * 1000;
  let msaToken = "";
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    try {
      const tokenResponse = await postForm<{ access_token?: string }>(
        TOKEN_URL,
        {
          client_id: id,
          device_code: device.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        },
      );
      if (tokenResponse.access_token) {
        msaToken = tokenResponse.access_token;
        break;
      }
    } catch (error) {
      const message = String(error);
      if (message.includes("authorization_pending") || message.includes("slow_down")) {
        continue; // keep polling
      }
      throw error; // declined / expired / network
    }
  }
  if (!msaToken) {
    throw new Error("Sign-in timed out — try again.");
  }

  // 3. Xbox Live user token
  const xbl = await postJson<{ Token: string; DisplayClaims: { xui: Array<{ uhs: string }> } }>(XBL_URL, {
    Properties: {
      AuthMethod: "RPS",
      SiteName: "user.auth.xboxlive.com",
      RpsTicket: `d=${msaToken}`,
    },
  });

  // 4. XSTS token
  const xsts = await postJson<{ Token: string; DisplayClaims: { xui: Array<{ uhs: string }> } }>(XSTS_URL, {
    Properties: { SandboxId: "XTST", UserTokens: [xbl.Token] },
  });
  const uhs = xsts.DisplayClaims?.xui?.[0]?.uhs;
  if (!uhs) {
    throw new Error("XSTS did not return a user hash.");
  }

  // 5. Minecraft services token
  const mc = await postJson<{ access_token: string; expires_in: number }>(MC_AUTH_URL, {
    identityToken: `XBL3.0 x=${xsts.Token};${uhs}`,
  });

  // 6. Profile (name + uuid)
  const profileRes = await tauriFetch(MC_PROFILE_URL, {
    headers: { Authorization: `Bearer ${mc.access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error(
      profileRes.status === 404
        ? "This Microsoft account has no Minecraft profile (game ownership required)."
        : `Profile lookup failed: HTTP ${profileRes.status}`,
    );
  }
  const profile = (await profileRes.json()) as { name: string; id: string };
  const uuid = profile.id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");

  const account: MinecraftAccount = {
    username: profile.name,
    uuid,
    accessToken: mc.access_token,
    expiresAt: Date.now() + (mc.expires_in - 60) * 1000,
  };
  await storeAccount(account);
  toast.success(`Signed in as ${profile.name}`);
  return account;
}
