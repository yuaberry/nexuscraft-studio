import { useNavigate, useParams } from "react-router-dom";
import {
  AdvancedSettings,
  AiSettings,
  AppearanceSettings,
  GeneralSettings,
  JavaSettings,
  MinecraftSettings,
  SecuritySettings,
  StorageSettings,
} from "./sections";
import { cn } from "@/lib/utils";

export const SETTINGS_SECTIONS = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "ai", label: "AI" },
  { id: "minecraft", label: "Minecraft" },
  { id: "java", label: "Java" },
  { id: "storage", label: "Storage" },
  { id: "security", label: "Security" },
  { id: "advanced", label: "Advanced" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export function SettingsPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();

  const active = SETTINGS_SECTIONS.some((s) => s.id === section)
    ? (section as SettingsSectionId)
    : "general";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="pb-2 text-2xl font-bold tracking-tight">Settings</h1>
      <p className="pb-8 text-sm text-muted-foreground">
        Changes are saved automatically to the local database.
      </p>

      <div className="flex gap-8">
        {/* Section nav */}
        <nav className="w-48 shrink-0 space-y-1">
          {SETTINGS_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/settings/${s.id}`)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                active === s.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Section content */}
        <div className="min-w-0 flex-1">
          {active === "general" && <GeneralSettings />}
          {active === "appearance" && <AppearanceSettings />}
          {active === "ai" && <AiSettings />}
          {active === "minecraft" && <MinecraftSettings />}
          {active === "java" && <JavaSettings />}
          {active === "storage" && <StorageSettings />}
          {active === "security" && <SecuritySettings />}
          {active === "advanced" && <AdvancedSettings />}
        </div>
      </div>
    </div>
  );
}
