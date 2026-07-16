import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Sparkles,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import {
  navigationSections,
  workspaceNavigationItem,
  type NavigationItem,
} from "../navigation";
import { DEFAULT_PROJECT_ID, projectPath } from "./shellLinks";

interface SidebarProps {
  collapsed?: boolean;
  mobile?: boolean;
  projectId: string;
  onClose?: () => void;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}

export function Sidebar({
  collapsed = false,
  mobile = false,
  projectId,
  onClose,
  onNavigate,
  onToggleCollapsed,
}: SidebarProps) {
  return (
    <aside
      className={[
        "flex h-full flex-col border-r border-line/80 bg-[#fcfbff] text-ink",
        mobile ? "w-[min(320px,calc(100vw-32px))] shadow-menu" : "w-full",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-[76px] items-center border-b border-line/70",
          collapsed ? "justify-center px-3" : "justify-between px-5",
        ].join(" ")}
      >
        <NavLink
          aria-label="Data Analysis System home"
          className="flex min-w-0 items-center gap-3"
          to={projectPath("/", projectId)}
        >
          <BrandMark />
          {!collapsed ? (
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold text-ink">
                Data Analysis System
              </h1>
              <p className="mt-0.5 truncate text-[11px] font-medium text-muted">
                Creative data workbench
              </p>
            </div>
          ) : null}
        </NavLink>
        {mobile ? (
          <button
            aria-label="Close navigation"
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-muted transition hover:border-lilac/30 hover:text-lilac"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <ProjectContext collapsed={collapsed} projectId={projectId} />

        <nav aria-label="Main navigation" className="mt-4 space-y-5">
          <div>
            {!collapsed ? <NavigationLabel>Overview</NavigationLabel> : null}
            <SidebarLink
              collapsed={collapsed}
              item={workspaceNavigationItem}
              onNavigate={onNavigate}
              projectId={projectId}
            />
          </div>

          {navigationSections.map((section) => (
            <div key={section.label}>
              {!collapsed ? (
                <NavigationLabel>{section.label}</NavigationLabel>
              ) : (
                <div className="mx-auto mb-2 h-px w-8 bg-line" />
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarLink
                    collapsed={collapsed}
                    item={item}
                    key={item.path}
                    onNavigate={onNavigate}
                    projectId={projectId}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-line/70 p-3">
        {!collapsed ? (
          <div className="rounded-md border border-mint/20 bg-mint/10 px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-mint">
              <CircleDot className="h-3.5 w-3.5" />
              Local workspace
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-muted">
              Original files, tasks, and lineage stay traceable.
            </p>
          </div>
        ) : (
          <div
            className="mx-auto grid h-9 w-9 place-items-center rounded-md border border-mint/20 bg-mint/10 text-mint"
            title="Local workspace"
          >
            <CircleDot className="h-4 w-4" />
          </div>
        )}

        {!mobile && onToggleCollapsed ? (
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={[
              "mt-3 flex h-9 w-full items-center rounded-md border border-transparent text-xs font-semibold text-muted transition hover:border-line hover:bg-white hover:text-ink",
              collapsed ? "justify-center" : "justify-between px-3",
            ].join(" ")}
            onClick={onToggleCollapsed}
            type="button"
          >
            {!collapsed ? <span>Collapse sidebar</span> : null}
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function BrandMark() {
  return (
    <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-ink text-white shadow-sm">
      <BarChart3 className="h-5 w-5" />
      <span className="absolute left-0 top-0 h-2.5 w-2.5 bg-sky" />
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-rose" />
      <Sparkles className="absolute right-1 top-1 h-2.5 w-2.5 text-amber-200" />
    </div>
  );
}

function ProjectContext({
  collapsed,
  projectId,
}: {
  collapsed: boolean;
  projectId: string;
}) {
  const projectName =
    projectId === DEFAULT_PROJECT_ID ? "Demo analytics" : "Project workspace";

  if (collapsed) {
    return (
      <div
        className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-lilac/20 bg-lilac/10 font-mono text-xs font-bold text-lilac"
        title={`Project ${projectId}`}
      >
        PR
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-lilac/20 bg-white">
      <div className="h-1 bg-[linear-gradient(90deg,#3b9ee8_0_28%,#7657d8_28%_56%,#d95f8d_56%_78%,#2d9d78_78%_100%)]" />
      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase text-lilac">
              Active project
            </p>
            <p className="mt-1 truncate text-sm font-bold text-ink">
              {projectName}
            </p>
          </div>
          <span className="rounded-full bg-mint/10 px-2 py-1 text-[10px] font-bold text-mint">
            Owner
          </span>
        </div>
        <p className="mt-2 truncate font-mono text-[11px] text-muted">
          {projectId}
        </p>
      </div>
    </div>
  );
}

function NavigationLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 px-3 text-[10px] font-bold uppercase text-slate-400">
      {children}
    </p>
  );
}

function SidebarLink({
  collapsed,
  item,
  onNavigate,
  projectId,
}: {
  collapsed: boolean;
  item: NavigationItem;
  onNavigate?: () => void;
  projectId: string;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      aria-label={item.label}
      className={({ isActive }) =>
        [
          "group flex min-h-10 items-center rounded-md border text-sm font-semibold transition",
          collapsed ? "justify-center px-2" : "gap-3 px-2.5 py-2",
          isActive
            ? "border-lilac/20 bg-lilac/10 text-ink"
            : "border-transparent text-muted hover:border-line/80 hover:bg-white hover:text-ink",
        ].join(" ")
      }
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      to={projectPath(item.path, projectId)}
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              "grid h-7 w-7 shrink-0 place-items-center rounded-md transition",
              isActive
                ? accentClass(item.accent)
                : "bg-slate-100 text-slate-500 group-hover:bg-slate-50",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          {!collapsed ? <span className="truncate">{item.label}</span> : null}
        </>
      )}
    </NavLink>
  );
}

function accentClass(accent: NavigationItem["accent"]) {
  return {
    amber: "bg-amber/10 text-amber",
    brand: "bg-brand/10 text-brand",
    lilac: "bg-lilac/10 text-lilac",
    mint: "bg-mint/10 text-mint",
    rose: "bg-rose/10 text-rose",
    sky: "bg-sky/10 text-sky",
  }[accent];
}
