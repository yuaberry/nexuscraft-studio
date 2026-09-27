import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/stores/settingsStore";
import { Field, SectionHeader } from "../SettingsBits";

export function MinecraftSettings() {
  const minecraft = useSettingsStore((s) => s.settings.minecraft);
  const update = useSettingsStore((s) => s.update);

  return (
    <section>
      <SectionHeader
        title="Minecraft"
        description="Defaults for new projects. The Version Adapter Layer grows per release."
      />

      <Field
        label="Default Minecraft version"
        hint="Phase 0 targets 1.20.1 — a well-supported, well-documented target. More versions arrive with the Version Adapter Layer."
      >
        <div className="flex max-w-sm items-center gap-3">
          <Select
            value={minecraft.defaultVersion}
            onValueChange={(value) =>
              update("minecraft", { defaultVersion: value }).catch(() =>
                toast.error("Could not save version preference"),
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1.20.1">1.20.1</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">1.21.x — Phase 5</Badge>
        </div>
      </Field>

      <Field
        label="Default mod loader"
        hint="Fabric templates ship first; Forge and NeoForge plug into the same Version Adapter."
      >
        <div className="max-w-sm">
          <Select
            value={minecraft.defaultLoader}
            onValueChange={(value) =>
              update("minecraft", { defaultLoader: value as typeof minecraft.defaultLoader }).catch(
                () => toast.error("Could not save loader preference"),
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fabric">Fabric</SelectItem>
              <SelectItem value="forge">Forge (Phase 3)</SelectItem>
              <SelectItem value="neoforge">NeoForge (Phase 3)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Field>

      <Field
        label="Default server software"
        hint="Used by the Server Studio wizard when it lands in Phase 6."
      >
        <div className="max-w-sm">
          <Select
            value={minecraft.defaultServerSoftware}
            onValueChange={(value) =>
              update("minecraft", {
                defaultServerSoftware: value as typeof minecraft.defaultServerSoftware,
              }).catch(() => toast.error("Could not save server preference"))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vanilla">Vanilla</SelectItem>
              <SelectItem value="paper">Paper</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Field>
    </section>
  );
}
