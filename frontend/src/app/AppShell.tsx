import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useWorkspaceStore } from "../features/workspace/workspaceStore";
import { routeMeta } from "./navigation";
import { routePlaceholders } from "./routes";
import { CommandPalette } from "./shell/CommandPalette";
import { Sidebar } from "./shell/Sidebar";
import { DEFAULT_PROJECT_ID } from "./shell/shellLinks";
import { TopBar } from "./shell/TopBar";

export function AppShell() {
  const location = useLocation();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const {
    activeProjectId,
    advancedView,
    setActiveProject,
    sidebarCollapsed,
    toggleAdvancedView,
    toggleSidebar,
  } = useWorkspaceStore();
  const currentRoute =
    routePlaceholders[location.pathname] ?? routePlaceholders["/"];
  const currentMeta = routeMeta[location.pathname] ?? routeMeta["/"];
  const queryProjectId = useMemo(
    () => new URLSearchParams(location.search).get("project_id"),
    [location.search],
  );
  const projectId = queryProjectId ?? activeProjectId ?? DEFAULT_PROJECT_ID;

  useEffect(() => {
    if (queryProjectId && queryProjectId !== activeProjectId) {
      setActiveProject(queryProjectId);
    }
  }, [activeProjectId, queryProjectId, setActiveProject]);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  useEffect(() => {
    function openSearchShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !isEditing) {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", openSearchShortcut);
    return () => document.removeEventListener("keydown", openSearchShortcut);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 hidden transition-[width] duration-200 lg:block",
          sidebarCollapsed ? "w-[88px]" : "w-[288px]",
        ].join(" ")}
      >
        <Sidebar
          advancedView={advancedView}
          collapsed={sidebarCollapsed}
          onToggleAdvancedView={toggleAdvancedView}
          onToggleCollapsed={toggleSidebar}
          projectId={projectId}
        />
      </div>

      {mobileNavigationOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={() => setMobileNavigationOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar
              advancedView={advancedView}
              mobile
              onClose={() => setMobileNavigationOpen(false)}
              onNavigate={() => setMobileNavigationOpen(false)}
              onToggleAdvancedView={toggleAdvancedView}
              projectId={projectId}
            />
          </div>
        </div>
      ) : null}

      <main
        className={[
          "min-h-screen transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[288px]",
        ].join(" ")}
      >
        <TopBar
          advancedView={advancedView}
          onOpenMobileNavigation={() => setMobileNavigationOpen(true)}
          onOpenSearch={() => setCommandPaletteOpen(true)}
          onToggleAdvancedView={toggleAdvancedView}
          pageDescription={currentMeta.description}
          pageSection={currentMeta.section}
          pageTitle={currentMeta.title}
          projectId={projectId}
        />
        <div className="workspace-canvas min-h-[calc(100vh-80px)]">
          <div className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-5 lg:px-7 lg:py-6">
            {currentRoute}
          </div>
        </div>
      </main>

      <CommandPalette
        onClose={closeCommandPalette}
        open={commandPaletteOpen}
        projectId={projectId}
      />
    </div>
  );
}
