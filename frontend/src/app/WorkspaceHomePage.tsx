import {
  ArrowUpRight,
  BarChart3,
  BrushCleaning,
  CheckCircle2,
  Database,
  FileUp,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Sparkles,
  SquareTerminal,
  Workflow,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { DEFAULT_PROJECT_ID, projectPath } from "./shell/shellLinks";

const workflowItems = [
  {
    title: "Data Sources",
    group: "Connect",
    description: "Files, upload history, and external database connections.",
    path: "/data-sources",
    icon: Database,
    tone: "mint" as const,
  },
  {
    title: "Import",
    group: "Connect",
    description: "Preview CSV or Excel fields before materialization.",
    path: "/import",
    icon: FileUp,
    tone: "sky" as const,
  },
  {
    title: "Datasets",
    group: "Store",
    description: "Inspect formal tables, schema, rows, and quality.",
    path: "/datasets",
    icon: ListChecks,
    tone: "brand" as const,
  },
  {
    title: "Cleaning",
    group: "Prepare",
    description: "Build and execute reusable visual cleaning recipes.",
    path: "/cleaning",
    icon: BrushCleaning,
    tone: "rose" as const,
  },
  {
    title: "SQL Workspace",
    group: "Explore",
    description: "Query project datasets and save reusable data views.",
    path: "/sql",
    icon: SquareTerminal,
    tone: "lilac" as const,
  },
  {
    title: "Charts",
    group: "Visualize",
    description: "Map dimensions and metrics into real ECharts views.",
    path: "/charts",
    icon: BarChart3,
    tone: "sky" as const,
  },
  {
    title: "Dashboards",
    group: "Present",
    description: "Arrange charts into dashboard and report layouts.",
    path: "/dashboards",
    icon: LayoutDashboard,
    tone: "mint" as const,
  },
  {
    title: "Tasks",
    group: "Trace",
    description: "Follow task status, retries, and related resources.",
    path: "/tasks",
    icon: ScrollText,
    tone: "amber" as const,
  },
];

const dataFlow = [
  { label: "Source", tone: "bg-mint text-white" },
  { label: "Dataset", tone: "bg-brand text-white" },
  { label: "Clean / SQL", tone: "bg-rose text-white" },
  { label: "Data View", tone: "bg-lilac text-white" },
  { label: "Chart", tone: "bg-sky text-white" },
  { label: "Report", tone: "bg-amber text-white" },
];

export function WorkspaceHomePage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project_id") ?? DEFAULT_PROJECT_ID;
  const isDemoProject = projectId === DEFAULT_PROJECT_ID;
  const projectName = isDemoProject ? "Demo analytics" : "Project workspace";

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-md border border-line bg-white/85">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex items-center gap-2 text-xs font-bold text-lilac">
              <Sparkles className="h-4 w-4" />
              {isDemoProject ? "Demo workspace" : "Project workspace"}
            </div>
            <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Your data workspace is ready.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              A professional data analysis workbench for moving from retained
              source data to reliable datasets, reusable analysis, and clear
              reports.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                to={projectPath("/datasets", projectId)}
              >
                <ListChecks className="h-4 w-4" />
                Explore datasets
              </Link>
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-md border border-lilac/20 bg-lilac/10 px-4 text-sm font-semibold text-lilac transition hover:bg-lilac/20"
                to={projectPath("/sql", projectId)}
              >
                <SquareTerminal className="h-4 w-4" />
                Open SQL workspace
              </Link>
            </div>
          </div>

          <div className="border-t border-line bg-lilac/10 p-5 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-lilac">
                  Active project
                </p>
                <p className="mt-1 text-lg font-bold text-ink">{projectName}</p>
              </div>
              <span className="rounded-full border border-mint/20 bg-white px-2.5 py-1 text-[10px] font-bold text-mint">
                {isDemoProject ? "Demo ready" : "Active"}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted">{projectId}</p>
            <div className="mt-5 space-y-2">
              <ProjectSignal label="Source retention" />
              <ProjectSignal label="Materialized datasets" />
              <ProjectSignal label="Task and lineage trace" />
            </div>
          </div>
        </div>

        <div className="border-t border-line bg-canvas/70 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted">
            <Workflow className="h-3.5 w-3.5 text-brand" />
            Main data flow
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
            {dataFlow.map((step, index) => (
              <div className="relative" key={step.label}>
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold ${step.tone}`}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-ink">
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-md border border-line bg-white sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Workflow modules" value="8 connected" tone="brand" />
        <Metric label="Source paths" value="Files + databases" tone="mint" />
        <Metric label="Analysis modes" value="Visual + SQL" tone="lilac" />
        <Metric label="Traceability" value="Tasks + lineage" tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-lilac">Workspace modules</p>
              <h3 className="mt-1 text-xl font-bold text-ink">
                Continue your analysis
              </h3>
            </div>
            <p className="hidden text-xs text-muted sm:block">
              Every module stays inside the same project flow.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {workflowItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="group flex min-h-40 flex-col rounded-md border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-lilac/30 hover:shadow-panel"
                  key={item.title}
                  to={projectPath(item.path, projectId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-md ${toneClass(item.tone)}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-lilac" />
                  </div>
                  <p className="mt-4 text-[10px] font-bold uppercase text-muted">
                    {item.group}
                  </p>
                  <h4 className="mt-1 text-sm font-bold text-ink">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-line bg-white p-4">
            <p className="text-xs font-bold text-ink">Suggested next moves</p>
            <div className="mt-3 space-y-1">
              <QuickRoute
                description="Bring in a fresh CSV or Excel file"
                label="Import local data"
                path={projectPath("/import", projectId)}
                tone="sky"
              />
              <QuickRoute
                description="Explore current project tables"
                label="Inspect data quality"
                path={projectPath("/datasets", projectId)}
                tone="mint"
              />
              <QuickRoute
                description="Turn a data view into a visual"
                label="Configure a chart"
                path={projectPath("/charts", projectId)}
                tone="lilac"
              />
            </div>
          </div>

          <div className="rounded-md border border-rose/20 bg-rose/10 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-rose">
              <Sparkles className="h-4 w-4" />
              Designed for range
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Visual tools guide everyday work. SQL and reusable views stay
              close when deeper analysis is needed.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProjectSignal({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/80 bg-white/70 px-3 py-2 text-xs font-semibold text-ink">
      <CheckCircle2 className="h-3.5 w-3.5 text-mint" />
      {label}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "mint" | "lilac" | "rose";
}) {
  const line = {
    brand: "bg-brand",
    lilac: "bg-lilac",
    mint: "bg-mint",
    rose: "bg-rose",
  }[tone];
  return (
    <div className="relative border-b border-line px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className={`absolute inset-y-0 left-0 w-1 ${line}`} />
      <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function QuickRoute({
  description,
  label,
  path,
  tone,
}: {
  description: string;
  label: string;
  path: string;
  tone: "sky" | "mint" | "lilac";
}) {
  const dot = {
    lilac: "bg-lilac",
    mint: "bg-mint",
    sky: "bg-sky",
  }[tone];
  return (
    <Link
      className="group flex items-start gap-3 rounded-md px-2 py-3 transition hover:bg-canvas"
      to={path}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-ink group-hover:text-lilac">
          {label}
        </span>
        <span className="mt-1 block text-[11px] leading-4 text-muted">
          {description}
        </span>
      </span>
      <ArrowUpRight className="mt-1 h-3.5 w-3.5 text-slate-300 group-hover:text-lilac" />
    </Link>
  );
}

function toneClass(
  tone: "brand" | "sky" | "lilac" | "rose" | "mint" | "amber",
) {
  return {
    amber: "bg-amber/10 text-amber",
    brand: "bg-brand/10 text-brand",
    lilac: "bg-lilac/10 text-lilac",
    mint: "bg-mint/10 text-mint",
    rose: "bg-rose/10 text-rose",
    sky: "bg-sky/10 text-sky",
  }[tone];
}
