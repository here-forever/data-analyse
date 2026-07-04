import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  FileUp,
  History,
  RefreshCcw,
  Search,
  Server,
  SquareCode,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listDatasets, type Dataset } from "../datasets/api";
import {
  listUploads,
  type UploadRecord,
  type UploadStatus,
} from "../imports/api";

const DEFAULT_PROJECT_ID = "prj_demo";

export function DataSourcesPage() {
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const [submittedProjectId, setSubmittedProjectId] =
    useState(DEFAULT_PROJECT_ID);

  const uploadsQuery = useQuery({
    queryKey: ["import-uploads", submittedProjectId],
    queryFn: () => listUploads(submittedProjectId),
    enabled: submittedProjectId.trim().length > 0,
  });

  const datasetsQuery = useQuery({
    queryKey: ["datasets", submittedProjectId],
    queryFn: () => listDatasets(submittedProjectId),
    enabled: submittedProjectId.trim().length > 0,
  });

  const uploads = useMemo(
    () => uploadsQuery.data?.items ?? [],
    [uploadsQuery.data?.items],
  );
  const datasets = useMemo(
    () => datasetsQuery.data?.items ?? [],
    [datasetsQuery.data?.items],
  );
  const summary = useMemo(
    () => summarizeSourceState(uploads, datasets),
    [datasets, uploads],
  );

  function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedProjectId(projectId.trim());
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan">Data sources</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Source intake center
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Manage local file access, inspect upload outcomes, and continue the
            path into formal datasets.
          </p>
        </div>

        <form className="flex w-full max-w-xl gap-2" onSubmit={submitProject}>
          <label className="sr-only" htmlFor="data-source-project-id">
            Project ID
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="data-source-project-id"
              className="h-10 w-full rounded-md border border-line bg-panel pl-9 pr-3 text-sm text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              placeholder="Project ID"
            />
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={projectId.trim().length === 0}
            type="submit"
          >
            <RefreshCcw className="h-4 w-4" />
            Load
          </button>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric
          label="Uploads"
          value={summary.totalUploads.toLocaleString()}
          tone="brand"
        />
        <Metric
          label="Parsed"
          value={summary.parsedUploads.toLocaleString()}
          tone="emerald"
        />
        <Metric
          label="Failed"
          value={summary.failedUploads.toLocaleString()}
          tone="amber"
        />
        <Metric
          label="Datasets"
          value={summary.datasetCount.toLocaleString()}
          tone="cyan"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SourceTypePanel projectId={submittedProjectId} />

        <div className="space-y-5">
          <LocalFilePanel projectId={submittedProjectId} uploads={uploads} />
          <UploadRecordPanel
            error={uploadsQuery.error}
            isLoading={uploadsQuery.isLoading || uploadsQuery.isFetching}
            uploads={uploads}
          />
          <DatasetBridgePanel
            datasets={datasets}
            error={datasetsQuery.error}
            isLoading={datasetsQuery.isLoading || datasetsQuery.isFetching}
          />
        </div>
      </div>
    </section>
  );
}

function SourceTypePanel({ projectId }: { projectId: string }) {
  const sourceTypes = [
    {
      title: "Local files",
      description:
        "CSV and Excel uploads with retained originals and preview recovery.",
      icon: FileSpreadsheet,
      tone: "brand" as const,
      state: "Available",
      href: `/import?project_id=${encodeURIComponent(projectId)}`,
    },
    {
      title: "External database",
      description:
        "PostgreSQL/MySQL read-only connections are the next connector milestone.",
      icon: Server,
      tone: "emerald" as const,
      state: "Next",
      href: null,
    },
    {
      title: "API source",
      description:
        "API ingestion is reserved until the core file and database paths are stable.",
      icon: SquareCode,
      tone: "amber" as const,
      state: "Reserved",
      href: null,
    },
  ];

  return (
    <aside className="space-y-3">
      {sourceTypes.map((sourceType) => {
        const Icon = sourceType.icon;

        return (
          <div
            key={sourceType.title}
            className="rounded-md border border-line bg-panel p-4 shadow-panel"
          >
            <div className="flex items-start gap-3">
              <div
                className={`rounded-md border p-2 ${toneClass(sourceType.tone)}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {sourceType.title}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-muted">
                    {sourceType.state}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {sourceType.description}
                </p>
                {sourceType.href ? (
                  <Link
                    className="mt-3 inline-flex h-8 items-center gap-2 rounded-md border border-brand/20 bg-blue-50 px-3 text-xs font-semibold text-brand transition hover:bg-blue-100"
                    to={sourceType.href}
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Open import
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function LocalFilePanel({
  projectId,
  uploads,
}: {
  projectId: string;
  uploads: UploadRecord[];
}) {
  const latestUpload = uploads[0] ?? null;

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
      <PanelHeader icon={FileUp} title="Local file intake" />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-md border border-dashed border-cyan/30 bg-cyan/10 p-4">
          <p className="text-sm font-semibold text-ink">
            Upload CSV or Excel files
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Uploaded files are retained, parsed into recoverable previews, and
            materialized into formal PostgreSQL-backed datasets after
            confirmation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              to={`/import?project_id=${encodeURIComponent(projectId)}`}
            >
              <FileUp className="h-4 w-4" />
              Upload file
            </Link>
            {latestUpload?.preview_id ? (
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 px-3 text-sm font-semibold text-emerald transition hover:bg-emerald/20"
                to={`/import?project_id=${encodeURIComponent(projectId)}&preview_id=${encodeURIComponent(latestUpload.preview_id)}`}
              >
                <History className="h-4 w-4" />
                Resume latest
              </Link>
            ) : null}
          </div>
        </div>
        <div className="rounded-md border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase text-muted">
            Latest upload
          </p>
          {latestUpload ? (
            <div className="mt-3 space-y-2">
              <p className="truncate text-sm font-semibold text-ink">
                {latestUpload.file_name}
              </p>
              <UploadStatusChip status={latestUpload.status} />
              <p className="text-xs text-muted">
                {formatDate(latestUpload.created_at)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No file uploads for this project yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadRecordPanel({
  uploads,
  isLoading,
  error,
}: {
  uploads: UploadRecord[];
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
      <PanelHeader icon={History} title="Recent upload records" />
      {isLoading ? (
        <StateMessage title="Loading upload records" />
      ) : error ? (
        <StateMessage title="Could not load upload records" tone="error" />
      ) : uploads.length === 0 ? (
        <StateMessage title="No upload records found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  File
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Status
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Rows
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Updated
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {uploads.slice(0, 6).map((upload) => (
                <tr key={upload.id} className="align-top hover:bg-slate-50">
                  <td className="border-b border-line px-4 py-3">
                    <p className="max-w-xs truncate font-semibold text-ink">
                      {upload.file_name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {upload.id}
                    </p>
                    {upload.error_message ? (
                      <p className="mt-2 max-w-md rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                        {upload.error_message}
                      </p>
                    ) : null}
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <UploadStatusChip status={upload.status} />
                  </td>
                  <td className="border-b border-line px-4 py-3 text-muted">
                    {upload.preview_row_count?.toLocaleString() ?? "-"}
                  </td>
                  <td className="border-b border-line px-4 py-3 text-xs text-muted">
                    {formatDate(upload.updated_at)}
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {upload.preview_id ? (
                        <Link
                          className="inline-flex h-8 items-center rounded-md border border-emerald/30 bg-emerald/10 px-3 text-xs font-semibold text-emerald transition hover:bg-emerald/20"
                          to={`/import?project_id=${encodeURIComponent(upload.project_id)}&preview_id=${encodeURIComponent(upload.preview_id)}`}
                        >
                          Open preview
                        </Link>
                      ) : null}
                      <Link
                        className="inline-flex h-8 items-center rounded-md border border-brand/20 bg-blue-50 px-3 text-xs font-semibold text-brand transition hover:bg-blue-100"
                        to={`/tasks?project_id=${encodeURIComponent(upload.project_id)}`}
                      >
                        Task trace
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DatasetBridgePanel({
  datasets,
  isLoading,
  error,
}: {
  datasets: Dataset[];
  isLoading: boolean;
  error: Error | null;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
      <PanelHeader
        icon={Database}
        title="Formal datasets created from sources"
      />
      {isLoading ? (
        <StateMessage title="Loading datasets" />
      ) : error ? (
        <StateMessage title="Could not load datasets" tone="error" />
      ) : datasets.length === 0 ? (
        <StateMessage title="No formal datasets created yet" />
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {datasets.slice(0, 4).map((dataset) => (
            <Link
              key={dataset.id}
              className="rounded-md border border-line bg-white p-4 transition hover:border-brand hover:bg-blue-50"
              to={`/datasets?project_id=${encodeURIComponent(dataset.project_id)}&dataset_id=${encodeURIComponent(dataset.id)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {dataset.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {dataset.physical_table_name}
                  </p>
                </div>
                <span className="rounded bg-emerald/10 px-2 py-1 text-xs font-semibold text-emerald">
                  {dataset.row_count.toLocaleString()}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted">
                {dataset.fields.length.toLocaleString()} fields from preview{" "}
                {compactId(dataset.source_preview_id)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
}: {
  icon: typeof FileSpreadsheet;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-4 py-3">
      <Icon className="h-4 w-4 text-brand" />
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
    </div>
  );
}

function UploadStatusChip({ status }: { status: UploadStatus }) {
  const meta = {
    failed: {
      label: "Failed",
      icon: AlertTriangle,
      className: "border-red-200 bg-red-50 text-red-700",
    },
    parsed: {
      label: "Parsed",
      icon: CheckCircle2,
      className: "border-emerald/20 bg-emerald/10 text-emerald",
    },
    pending: {
      label: "Pending",
      icon: Clock3,
      className: "border-amber/20 bg-amber/10 text-amber",
    },
  }[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "cyan" | "amber" | "emerald";
}) {
  return (
    <div className={`rounded-md border px-4 py-3 ${toneClass(tone)}`}>
      <p className="text-xs font-semibold uppercase">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function StateMessage({
  title,
  tone = "muted",
}: {
  title: string;
  tone?: "muted" | "error";
}) {
  return (
    <div
      className={[
        "m-4 rounded-md border px-4 py-6 text-center text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-line bg-slate-50 text-muted",
      ].join(" ")}
    >
      {title}
    </div>
  );
}

interface SourceSummary {
  datasetCount: number;
  failedUploads: number;
  parsedUploads: number;
  totalUploads: number;
}

function summarizeSourceState(
  uploads: UploadRecord[],
  datasets: Dataset[],
): SourceSummary {
  return uploads.reduce<SourceSummary>(
    (summary, upload) => {
      summary.totalUploads += 1;
      if (upload.status === "parsed") {
        summary.parsedUploads += 1;
      }
      if (upload.status === "failed") {
        summary.failedUploads += 1;
      }
      return summary;
    },
    {
      datasetCount: datasets.length,
      failedUploads: 0,
      parsedUploads: 0,
      totalUploads: 0,
    },
  );
}

function toneClass(tone: "brand" | "cyan" | "amber" | "emerald") {
  return {
    amber: "border-amber/20 bg-amber/10 text-amber",
    brand: "border-brand/20 bg-blue-50 text-brand",
    cyan: "border-cyan/20 bg-cyan/10 text-cyan",
    emerald: "border-emerald/20 bg-emerald/10 text-emerald",
  }[tone];
}

function compactId(value: string) {
  if (value.length <= 18) {
    return value;
  }
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}
