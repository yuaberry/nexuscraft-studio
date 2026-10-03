import { NavLink, useNavigate } from "react-router-dom";
import {
  Boxes,
  Home,
  Settings,
  Sparkles,
  Server,
  Palette,
  Info,
} from "lucide-react";
import { NexusLogo } from "@/components/brand/NexusLogo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUiStore } from "@/stores/uiStore";
import { APP_VERSION } from "@/components/AboutDialog";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  phase?: string;
}

const workspaceItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home, enabled: true },
  { to: "/projects", label: "Projects", icon: Boxes, enabled: true },
  { to: "/ai-creator", label: "AI Creator", icon: Sparkles, enabled: true },
  { to: "/shaders", label: "Shaders", icon: Palette, enabled: true },
  { to: "/servers", label: "Servers", icon: Server, enabled: true },
];

export function Sidebar() {
  const navigate = useNavigate();
  const setAboutOpen = useUiStore((s) => s.setAboutOpen);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border/70 bg-card/40">
      {/* Brand */}
      <div className="px-5 pb-4 pt-5">
        <button
          className="w-full text-left transition-opacity hover:opacity-85"
          onClick={() => navigate("/")}
        >
          <NexusLogo />
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground/80">
          AI Minecraft Creation Studio
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
          Workspace
        </p>
        {workspaceItems.map((item) => (
          <NavItemButton key={item.to} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-border/70 p-3">
        <NavLink
          to="/settings/general"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
        <button
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          onClick={() => setAboutOpen(true)}
        >
          <Info className="h-4 w-4" />
          About
        </button>
        <p className="px-3 pt-2 text-[10px] leading-relaxed text-muted-foreground/50">
          v{APP_VERSION} · Not affiliated with Mojang Studios or Microsoft
        </p>
      </div>
    </aside>
  );
}

function NavItemButton({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{link}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
