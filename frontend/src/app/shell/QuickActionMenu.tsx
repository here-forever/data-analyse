import {
  BarChart3,
  BrushCleaning,
  ChevronDown,
  FileUp,
  LayoutDashboard,
  Plus,
  SquareTerminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { projectPath } from "./shellLinks";

const quickActions = [
  {
    label: "Import a file",
    description: "CSV or Excel",
    path: "/import",
    icon: FileUp,
    tone: "bg-sky/10 text-sky",
  },
  {
    label: "Clean a dataset",
    description: "Visual recipe",
    path: "/cleaning",
    icon: BrushCleaning,
    tone: "bg-rose/10 text-rose",
  },
  {
    label: "Query with SQL",
    description: "Read-only analysis",
    path: "/sql",
    icon: SquareTerminal,
    tone: "bg-lilac/10 text-lilac",
  },
  {
    label: "Build a chart",
    description: "From a data view",
    path: "/charts",
    icon: BarChart3,
    tone: "bg-brand/10 text-brand",
  },
  {
    label: "Compose dashboard",
    description: "Charts and report",
    path: "/dashboards",
    icon: LayoutDashboard,
    tone: "bg-mint/10 text-mint",
  },
];

export function QuickActionMenu({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Start</span>
        <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
      </button>

      {open ? (
        <div
          aria-label="Start a workflow"
          className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-md border border-line bg-white shadow-menu"
          role="menu"
        >
          <div className="border-b border-line bg-lilac/10 px-4 py-3">
            <p className="text-xs font-bold text-ink">Start a workflow</p>
            <p className="mt-1 text-[11px] text-muted">
              Continue inside {projectId}
            </p>
          </div>
          <div className="grid gap-1 p-2 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  className="flex items-start gap-3 rounded-md border border-transparent px-3 py-3 transition hover:border-line hover:bg-canvas"
                  key={action.path}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  to={projectPath(action.path, projectId)}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${action.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-ink">
                      {action.label}
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-muted">
                      {action.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
