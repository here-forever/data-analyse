import { Menu, Search, ScrollText } from "lucide-react";
import { Link } from "react-router-dom";

import { QuickActionMenu } from "./QuickActionMenu";
import { projectPath } from "./shellLinks";

interface TopBarProps {
  pageDescription: string;
  pageSection: string;
  pageTitle: string;
  projectId: string;
  onOpenMobileNavigation: () => void;
  onOpenSearch: () => void;
}

export function TopBar({
  pageDescription,
  pageSection,
  pageTitle,
  projectId,
  onOpenMobileNavigation,
  onOpenSearch,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur-xl">
      <div className="flex h-[76px] items-center gap-3 px-4 sm:px-5 lg:px-7">
        <button
          aria-label="Open navigation"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-white text-muted transition hover:border-lilac/30 hover:text-lilac lg:hidden"
          onClick={onOpenMobileNavigation}
          type="button"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
            <span className="truncate">{pageSection}</span>
            <span className="h-1 w-1 rounded-full bg-rose" />
            <span className="truncate font-mono text-[10px] text-lilac">
              {projectId}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-3">
            <p className="truncate text-base font-bold text-ink sm:text-lg">
              {pageTitle}
            </p>
            <p className="hidden truncate text-xs text-muted 2xl:block">
              {pageDescription}
            </p>
          </div>
        </div>

        <button
          aria-label="Open workspace search"
          className="hidden h-10 w-[min(30vw,320px)] items-center gap-2 rounded-md border border-line bg-canvas px-3 text-left text-xs text-muted transition hover:border-lilac/30 hover:bg-white md:flex"
          onClick={onOpenSearch}
          type="button"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 truncate">Search workspace</span>
          <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            /
          </kbd>
        </button>

        <Link
          aria-label="Open task center"
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-white text-muted transition hover:border-amber/30 hover:bg-amber/10 hover:text-amber"
          to={projectPath("/tasks", projectId)}
        >
          <ScrollText className="h-4 w-4" />
        </Link>

        <QuickActionMenu projectId={projectId} />

        <div className="hidden items-center gap-2 border-l border-line pl-3 xl:flex">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-rose/10 text-xs font-bold text-rose">
            AD
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-ink">Admin</p>
            <p className="mt-0.5 text-[10px] text-muted">Project owner</p>
          </div>
        </div>
      </div>
      <div className="grid h-1 grid-cols-[1.2fr_1fr_.8fr_1.1fr]">
        <div className="bg-sky/50" />
        <div className="bg-lilac/45" />
        <div className="bg-rose/45" />
        <div className="bg-mint/45" />
      </div>
    </header>
  );
}
