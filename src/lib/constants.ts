export const APP_NAME = "NexusCraft Studio";
export const APP_TAGLINE = "Imagine it. Describe it. Build it. Play it.";
export const APP_DESCRIPTION = "AI Minecraft Creation Studio";
export const LEGAL_DISCLAIMER =
  "NexusCraft Studio is an independent third-party tool and is not affiliated with Mojang Studios or Microsoft.";

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
