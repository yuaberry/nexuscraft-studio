export {
  APP_NAME,
  APP_TAGLINE,
  APP_DESCRIPTION,
  LEGAL_DISCLAIMER,
} from "@voxel/core/constants";

export const STORAGE_SUBDIRS = [
  "projects",
  "instances",
  "servers",
  "backups",
  "logs",
  "shaderpacks",
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
