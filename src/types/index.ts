export type AiProviderId = "openrouter" | "openai" | "anthropic" | "ollama";

export type AccentColor = "purple" | "cyan" | "blue";

export interface GeneralSettings {
  authorName: string;
  defaultLicense: string;
}

export interface AppearanceSettings {
  accent: AccentColor;
  reduceMotion: boolean;
}

export interface AiSettings {
  provider: AiProviderId;
  model: string;
  temperature: number;
  maxTokens: number;
  baseUrl: string;
}

export interface MinecraftSettings {
  defaultVersion: string;
  defaultLoader: "fabric" | "forge" | "neoforge";
  defaultServerSoftware: "vanilla" | "paper";
}

export interface JavaSettings {
  customJavaPath: string;
}

export interface StorageSettings {
  basePath: string;
}

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  ai: AiSettings;
  minecraft: MinecraftSettings;
  java: JavaSettings;
  storage: StorageSettings;
}

export interface EnvironmentInfo {
  os: string;
  arch: string;
  java: {
    found: boolean;
    versionString: string | null;
    majorVersion: number | null;
  };
  git: {
    found: boolean;
    version: string | null;
  };
}

export interface StorageDirInfo {
  name: string;
  path: string;
  existed: boolean;
  created: boolean;
}

export interface StorageInfo {
  basePath: string;
  dirs: StorageDirInfo[];
}

export interface AppPaths {
  configDir: string;
  dataDir: string;
  databasePath: string;
  secretsNote: string;
}

export type SecretBackend = "os-keyring" | "local-file";

export interface SecretBackendInfo {
  backend: SecretBackend;
  available: boolean;
}

export interface SecretsOpResult {
  success: boolean;
  backend: SecretBackend;
}

export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
  details?: Record<string, string>;
}
