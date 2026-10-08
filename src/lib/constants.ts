export const APP_NAME = "VOXEL";
export const APP_TAGLINE = "Imagine. Create. Build. Play.";
export const APP_DESCRIPTION = "AI-Powered Creation Platform";
export const LEGAL_DISCLAIMER =
  "VOXEL is an independent third-party creation platform and is not affiliated with Mojang Studios or Microsoft.";

export const STORAGE_SUBDIRS = [
  "projects",
  "instances",
  "servers",
  "backups",
  "logs",
  ".gradle-cache",
] as const;

export const SETTINGS_KEYS = {
  general: "general",
  appearance: "appearance",
  ai: "ai",
  minecraft: "minecraft",
  java: "java",
  storage: "storage",
} as const;
