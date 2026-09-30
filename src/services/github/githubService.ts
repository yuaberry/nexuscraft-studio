import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { toast } from "sonner";
import {
  secretsDelete,
  secretsGet,
  secretsHas,
  secretsSet,
} from "@/services/secrets/secretsService";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * GitHub integration (Fase 7) — device-flow sign-in (same pattern as the
 * launcher MSA), REST API via Tauri HTTP, pushes through Rust with a
 * transient auth header. The token lives in the OS keyring only.
 */

const TOKEN_KEY = "github_token";
const DEVICE_CODE_URL = "https://github.com/login/device/code";
const TOKEN_POLL_URL = "https://github.com/login/oauth/access_token";
const API = "https://api.github.com";

function clientId(): string {
  return useSettingsStore.getState().settings.github.clientId.trim();
}

export function isGithubConfigured(): boolean {
  return clientId().length > 10;
}

export async function hasGithubToken(): Promise<boolean> {
  return secretsHas(TOKEN_KEY);
}

export async function getGithubToken(): Promise<string | null> {
  return secretsGet(TOKEN_KEY);
}

export async function githubSignOut(): Promise<void> {
  await secretsDelete(TOKEN_KEY).catch(() => {});
  toast.success("Signed out of GitHub");
}

export interface GithubUser {
  login: string;
  name: string | null;
  htmlUrl: string;
}

export async function getGithubUser(token: string): Promise<GithubUser> {
  const res = await tauriFetch(`${API}/user`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = (await res.json()) as { login: string; name: string | null; html_url: string };
  return { login: data.login, name: data.name, htmlUrl: data.html_url };
}

/**
 * GitHub OAuth device flow. `onUserCode` surfaces the code the user must
 * enter at https://github.com/login/device.
 */
export async function signInWithGithub(
  onUserCode: (info: { userCode: string; verificationUrl: string }) => void,
): Promise<GithubUser> {
  const id = clientId();
  if (!id) throw new Error("GitHub OAuth client id not configured (Settings → GitHub).");

  const deviceRes = await tauriFetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: id, scope: "repo" }),
  });
  if (!deviceRes.ok) throw new Error(`device code request failed: HTTP ${deviceRes.status}`);
  const device = (await deviceRes.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    interval?: number;
    expires_in: number;
  };
  onUserCode({ userCode: device.user_code, verificationUrl: device.verification_uri });

  const interval = (device.interval ?? 5) * 1000;
  const deadline = Date.now() + device.expires_in * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    const res = await tauriFetch(TOKEN_POLL_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: id, device_code: device.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }),
    });
    const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
    if (data.access_token) {
      await secretsSet(TOKEN_KEY, data.access_token);
      const user = await getGithubUser(data.access_token);
      toast.success(`Signed in as ${user.login}`);
      return user;
    }
    if (data.error === "authorization_pending" || data.error === "slow_down") continue;
    if (data.error === "access_denied") throw new Error("Sign-in denied");
    if (data.error === "expired_token") throw new Error("Code expired — try again");
    throw new Error(data.error_description ?? data.error ?? "token request failed");
  }
  throw new Error("Sign-in timed out — try again.");
}

export interface CreatedRepo {
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  private: boolean;
}

export async function createGithubRepo(options: {
  name: string;
  description: string;
  private: boolean;
}): Promise<CreatedRepo> {
  const token = await getGithubToken();
  if (!token) throw new Error("Sign in first (Settings → GitHub)");
  const slug = options.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length < 2) throw new Error("Invalid repository name");

  const res = await tauriFetch(`${API}/user/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: slug,
      description: options.description.slice(0, 200) || undefined,
      private: options.private,
      auto_init: false,
    }),
  });
  if (res.status === 422) {
    throw new Error(`Repository "${slug}" already exists on your account`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`create repo failed: HTTP ${res.status} ${text.slice(0, 150)}`);
  }
  const data = (await res.json()) as {
    full_name: string;
    html_url: string;
    clone_url: string;
    private: boolean;
  };
  return {
    fullName: data.full_name,
    htmlUrl: data.html_url,
    cloneUrl: data.clone_url,
    private: data.private,
  };
}

// ---------------------------------------------------------------------------
// Local git operations (Rust-guarded)
// ---------------------------------------------------------------------------

export async function commitAll(
  basePath: string,
  projectRel: string,
  message: string,
): Promise<string> {
  return invoke<string>("git_commit_all", { basePath, projectRel, message });
}

export async function pushToGithub(options: {
  basePath: string;
  projectRel: string;
  remoteUrl: string;
}): Promise<{ branch: string; remote: string }> {
  const token = await getGithubToken();
  if (!token) throw new Error("Sign in first (Settings → GitHub)");
  return invoke<{ branch: string; remote: string }>("git_push_github", {
    basePath: options.basePath,
    projectRel: options.projectRel,
    remoteUrl: options.remoteUrl,
    token,
  });
}

export async function recordGithubRepository(entry: {
  projectId: string;
  owner: string;
  name: string;
  url: string;
  branch: string;
}): Promise<void> {
  try {
    const { getDb } = await import("@/services/db/client");
    const db = await getDb();
    await db.execute(
      `INSERT INTO github_repositories (project_id, owner, name, url, default_branch, created_at)
       VALUES ($1, $2, $3, $4, $5, datetime('now'))`,
      [entry.projectId, entry.owner, entry.name, entry.url, entry.branch],
    );
  } catch (error) {
    console.warn("github_repositories insert failed:", error);
  }
}
