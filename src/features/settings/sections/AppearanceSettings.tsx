import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/stores/settingsStore";
import { Field, SectionHeader } from "../SettingsBits";
import { cn } from "@/lib/utils";
import type { AccentColor } from "@/types";

const ACCENTS: Array<{ id: AccentColor; label: string; className: string }> = [
  { id: "purple", label: "Violet", className: "bg-nexus-purple" },
  { id: "blue", label: "Electric Blue", className: "bg-nexus-blue" },
  { id: "cyan", label: "Cyan", className: "bg-nexus-cyan" },
];

export function AppearanceSettings() {
  const accent = useSettingsStore((s) => s.settings.appearance.accent);
  const reduceMotion = useSettingsStore((s) => s.settings.appearance.reduceMotion);
  const update = useSettingsStore((s) => s.update);

  return (
    <section>
      <SectionHeader
        title="Appearance"
        description="NexusCraft is dark-first. Fine-tune the accent and motion."
      />

      <Field label="Accent color" hint="Applies to buttons, highlights and the logo glow.">
        <div className="flex gap-3">
          {ACCENTS.map((option) => (
            <button
              key={option.id}
              onClick={() =>
                update("appearance", { accent: option.id }).catch(() =>
                  toast.error("Could not save accent preference"),
                )
              }
              className={cn(
                "group flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                accent === option.id
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/70 text-muted-foreground hover:border-primary/30",
              )}
            >
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full transition-transform group-hover:scale-110",
                  option.className,
                )}
              />
              {option.label}
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Reduce motion"
        hint="Disables non-essential animations across the interface."
      >
        <Switch
          checked={reduceMotion}
          onCheckedChange={(checked) =>
            update("appearance", { reduceMotion: checked }).catch(() =>
              toast.error("Could not save motion preference"),
            )
          }
        />
      </Field>
    </section>
  );
}
