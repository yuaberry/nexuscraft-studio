import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectsStore } from "@/stores/projectsStore";
import { HomePage } from "@/features/home/HomePage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectWorkspacePage } from "@/features/projects/workspace/ProjectWorkspacePage";
import { AiCreatorPage } from "@/features/ai-creator/AiCreatorPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { RoadmapPage } from "@/features/roadmap/RoadmapPage";

export default function App() {
  const loaded = useSettingsStore((s) => s.loaded);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const accent = useSettingsStore((s) => s.settings.appearance.accent);
  const reduceMotion = useSettingsStore((s) => s.settings.appearance.reduceMotion);

  const hydrateProjects = useProjectsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateProjects();
    // Version catalog auto-refresh on boot (12h TTL — no-op when fresh)
    import("@/services/minecraft/versionCatalog")
      .then((m) => m.ensureCatalog().catch(() => {}))
      .catch(() => {});
  }, [hydrate, hydrateProjects]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [accent, reduceMotion]);

  return (
    <TooltipProvider delayDuration={200}>
      <HashRouter>
        {loaded ? (
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectWorkspacePage />} />
              <Route path="ai-creator" element={<AiCreatorPage />} />
              <Route
                path="servers"
                element={
                  <RoadmapPage
                    phase="Fase 6"
                    title="Servers"
                    subtitle="Server Studio — create, run and manage local servers"
                    description="Spin up vanilla or Paper servers through a wizard, watch a live console, edit configuration from the UI and schedule automatic world backups."
                    items={[
                      {
                        title: "Server wizard",
                        body: "Name, version, software, world and security in one flow.",
                      },
                      {
                        title: "Live console",
                        body: "Real-time stdout/stderr wired directly to the server process.",
                      },
                      {
                        title: "Backups",
                        body: "Manual and scheduled restore points of worlds and configs.",
                      },
                      {
                        title: "Deployment-ready",
                        body: "Provider abstraction prepared for VPS, Docker and SSH.",
                      },
                    ]}
                  />
                }
              />
              <Route path="settings" element={<Navigate to="/settings/general" replace />} />
              <Route path="settings/:section" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        ) : (
          <SplashScreen />
        )}
      </HashRouter>
      <Toaster />
    </TooltipProvider>
  );
}

function SplashScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-radial-glow">
      <div className="animate-pulse-soft">
        <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
          <polygon points="32,10 52,20 32,30 12,20" fill="#8b5cf6" />
          <polygon points="12,20 32,30 32,52 12,42" fill="#3b82f6" />
          <polygon points="52,20 32,30 32,52 52,42" fill="#6d28d9" />
          <circle cx="32" cy="10" r="2.6" fill="#22d3ee" />
          <circle cx="52" cy="20" r="2.6" fill="#22d3ee" />
          <circle cx="12" cy="20" r="2.6" fill="#22d3ee" />
          <circle cx="32" cy="52" r="2.6" fill="#22d3ee" />
        </svg>
      </div>
      <div className="text-sm font-medium tracking-[0.3em] text-muted-foreground">
        NEXUSCRAFT
      </div>
    </div>
  );
}
