import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { navigationItems } from "../navigation";
import { projectPath } from "./shellLinks";

interface CommandPaletteProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

export function CommandPalette({
  open,
  projectId,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const closePalette = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    inputRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePalette();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closePalette, open]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return navigationItems;
    }
    return navigationItems.filter((item) =>
      `${item.label} ${item.description}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Navigate workspace"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closePalette();
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-md border border-line bg-white shadow-menu">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-lilac" />
          <input
            aria-label="Search workspace"
            className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to datasets, SQL, charts..."
            ref={inputRef}
            value={query}
          />
          <button
            aria-label="Close workspace search"
            className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-slate-100 hover:text-ink"
            onClick={closePalette}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-ink">
                No matching workspace
              </p>
              <p className="mt-1 text-xs text-muted">
                Try a broader workflow name.
              </p>
            </div>
          ) : (
            results.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="flex items-center gap-3 rounded-md border border-transparent px-3 py-3 transition hover:border-lilac/20 hover:bg-lilac/10"
                  key={item.path}
                  onClick={closePalette}
                  to={projectPath(item.path, projectId)}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-canvas px-4 py-2 text-[11px] text-muted">
          <span>Project {projectId}</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
