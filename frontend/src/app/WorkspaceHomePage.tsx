import {
  ArrowRight,
  BarChart3,
  BrushCleaning,
  CheckCircle2,
  ChevronDown,
  CloudSun,
  Database,
  FileUp,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Sparkles,
  SquareTerminal,
  Table2,
  WandSparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { useWorkspaceStore } from "../features/workspace/workspaceStore";
import { DEFAULT_PROJECT_ID, projectPath } from "./shell/shellLinks";

const primaryActions = [
  {
    title: "Bring in data",
    description:
      "Upload CSV or Excel and preview fields before creating a dataset.",
    action: "Start import",
    path: "/import",
    icon: FileUp,
    className: "border-sky/25 bg-sky/15 text-sky",
  },
  {
    title: "Explore datasets",
    description:
      "Review rows, schema, and quality for materialized project data.",
    action: "Open datasets",
    path: "/datasets",
    icon: ListChecks,
    className: "border-mint/25 bg-mint/15 text-mint",
  },
  {
    title: "Create a visual",
    description: "Turn a reusable data view into a clear chart for reporting.",
    action: "Build chart",
    path: "/charts",
    icon: BarChart3,
    className: "border-rose/25 bg-rose/15 text-rose",
  },
];

const advancedActions = [
  {
    title: "Database sources",
    description: "Connect PostgreSQL or MySQL and import read-only snapshots.",
    path: "/data-sources",
    icon: Database,
    tone: "bg-mint/15 text-mint",
  },
  {
    title: "Cleaning recipes",
    description: "Compose reusable visual transformations.",
    path: "/cleaning",
    icon: BrushCleaning,
    tone: "bg-rose/15 text-rose",
  },
  {
    title: "SQL analysis",
    description: "Query multiple project datasets safely.",
    path: "/sql",
    icon: SquareTerminal,
    tone: "bg-lilac/15 text-lilac",
  },
  {
    title: "Dashboard studio",
    description: "Compose charts into report layouts.",
    path: "/dashboards",
    icon: LayoutDashboard,
    tone: "bg-sky/15 text-sky",
  },
  {
    title: "Task trace",
    description: "Inspect status, retries, and related resources.",
    path: "/tasks",
    icon: ScrollText,
    tone: "bg-amber/15 text-amber",
  },
];

const dataFlow = [
  "Source",
  "Dataset",
  "Clean / SQL",
  "Data View",
  "Chart",
  "Report",
];

export function WorkspaceHomePage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project_id") ?? DEFAULT_PROJECT_ID;
  const advancedView = useWorkspaceStore((state) => state.advancedView);
  const toggleAdvancedView = useWorkspaceStore(
    (state) => state.toggleAdvancedView,
  );
  const isDemoProject = projectId === DEFAULT_PROJECT_ID;

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-md border border-lilac/20 bg-[#eeeaff] shadow-panel">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <div className="flex items-center gap-2 text-xs font-bold text-lilac">
              <Sparkles className="h-4 w-4" />
              {isDemoProject ? "Demo workspace" : "Project workspace"}
            </div>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Turn curious data into clear stories.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Start with a simple guided path. Reveal professional cleaning,
              SQL, connector, and task tools only when the analysis calls for
              them.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <CapabilityChip label="Retained sources" tone="mint" />
              <CapabilityChip label="PostgreSQL datasets" tone="brand" />
              <CapabilityChip label="Traceable workflows" tone="rose" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                to={projectPath("/import", projectId)}
              >
                <FileUp className="h-4 w-4" />
                Import data
              </Link>
              <button
                aria-checked={advancedView}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-lilac/25 bg-white/60 px-4 text-sm font-semibold text-lilac transition hover:bg-white"
                onClick={toggleAdvancedView}
                role="switch"
                type="button"
              >
                <WandSparkles className="h-4 w-4" />
                {advancedView ? "Hide Pro tools" : "Show Pro tools"}
              </button>
            </div>
          </div>

          <DreamDataScene projectId={projectId} />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-rose">
              Choose a clear next step
            </p>
            <h3 className="mt-1 text-xl font-bold text-ink">
              What are you doing today?
            </h3>
          </div>
          <p className="hidden text-xs text-muted sm:block">
            The guided view keeps the main workflow uncluttered.
          </p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {primaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                className={`group min-h-44 rounded-md border p-5 transition hover:-translate-y-0.5 hover:shadow-panel ${action.className}`}
                key={action.title}
                to={projectPath(action.path, projectId)}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-white/70">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-45 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                <h4 className="mt-5 text-base font-bold text-ink">
                  {action.title}
                </h4>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {action.description}
                </p>
                <p className="mt-4 text-xs font-bold">{action.action}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-lilac/20 bg-[#fff4fa]">
        <button
          aria-expanded={advancedView}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-rose/10"
          onClick={toggleAdvancedView}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-lilac/15 text-lilac">
              <WandSparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink">
                Professional workspace
              </span>
              <span className="mt-1 block truncate text-xs text-muted">
                Database connectors, cleaning, SQL, reporting, and operational
                trace
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-lilac">
            {advancedView ? "Collapse" : "Expand"}
            <ChevronDown
              className={`h-4 w-4 transition ${advancedView ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {advancedView ? (
          <div className="border-t border-lilac/15 p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {advancedActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    className="rounded-md border border-white/80 bg-white/65 p-4 transition hover:border-lilac/25 hover:bg-white"
                    key={action.title}
                    to={projectPath(action.path, projectId)}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-md ${action.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <h4 className="mt-3 text-xs font-bold text-ink">
                      {action.title}
                    </h4>
                    <p className="mt-1.5 text-[11px] leading-4 text-muted">
                      {action.description}
                    </p>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 rounded-md border border-white/80 bg-white/55 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-lilac">
                Complete data flow
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
                {dataFlow.map((step, index) => (
                  <div className="flex items-center gap-2" key={step}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-lilac/15 text-[10px] font-bold text-lilac">
                      {index + 1}
                    </span>
                    <span className="truncate text-[11px] font-semibold text-ink">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DreamDataScene({ projectId }: { projectId: string }) {
  return (
    <div className="relative min-h-72 overflow-hidden border-t border-lilac/15 bg-[#dff5ef] p-6 lg:border-l lg:border-t-0">
      <div className="absolute inset-x-6 top-6 h-14 rounded-md border border-white/60 bg-[#cfe9ff]" />
      <CloudSun className="absolute right-10 top-9 h-7 w-7 text-sky" />
      <Sparkles className="absolute left-10 top-10 h-5 w-5 text-rose" />
      <Sparkles className="absolute right-24 top-24 h-4 w-4 text-lilac" />

      <div className="relative mx-auto mt-16 max-w-sm">
        <div className="mx-auto w-44 rounded-md border border-lilac/20 bg-[#f0eaff] p-4 shadow-panel">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-lilac text-white">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-ink">Dream dataset</p>
              <p className="mt-1 font-mono text-[10px] text-muted">
                {projectId}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto h-7 w-px bg-lilac/30" />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-sky/20 bg-[#e8f5ff] p-3 shadow-sm">
            <Table2 className="h-4 w-4 text-sky" />
            <p className="mt-2 text-[11px] font-bold text-ink">Clean rows</p>
          </div>
          <div className="rounded-md border border-rose/20 bg-[#ffe9f1] p-3 shadow-sm">
            <BarChart3 className="h-4 w-4 text-rose" />
            <p className="mt-2 text-[11px] font-bold text-ink">
              Bright insight
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-5 flex items-center gap-2 rounded-md border border-white/70 bg-white/55 px-3 py-2 text-[10px] font-bold text-mint">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Traceable by design
      </div>
    </div>
  );
}

function CapabilityChip({
  label,
  tone,
}: {
  label: string;
  tone: "mint" | "brand" | "rose";
}) {
  const className = {
    brand: "border-brand/20 bg-brand/10 text-brand",
    mint: "border-mint/20 bg-mint/10 text-mint",
    rose: "border-rose/20 bg-rose/10 text-rose",
  }[tone];
  return (
    <span
      className={`rounded-md border px-2.5 py-1.5 text-[11px] font-bold ${className}`}
    >
      {label}
    </span>
  );
}
