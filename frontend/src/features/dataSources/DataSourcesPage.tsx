import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  createExternalDatabaseConnection,
  listExternalDatabaseConnections,
  testExternalDatabaseConnection,
  type DatabaseType,
  type ExternalConnectionStatus,
  type ExternalDatabaseConnection,
  type ExternalDatabaseConnectionCreatePayload,
} from "./api";

const DEFAULT_PROJECT_ID = "prj_demo";
const DEFAULT_DATABASE_PORTS: Record<DatabaseType, string> = {
  mysql: "3306",
  postgresql: "5432",
};

interface ExternalConnectionFormState {
  databaseName: string;
  databaseType: DatabaseType;
  host: string;
  name: string;
  password: string;
  port: string;
  username: string;
}

const DEFAULT_EXTERNAL_CONNECTION_FORM: ExternalConnectionFormState = {
  databaseName: "",
  databaseType: "postgresql",
  host: "",
  name: "",
  password: "",
  port: DEFAULT_DATABASE_PORTS.postgresql,
  username: "",
};

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
          <ExternalDatabasePanel projectId={submittedProjectId} />
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
        "PostgreSQL/MySQL read-only connections with saved metadata and test status.",
      icon: Server,
      tone: "emerald" as const,
      state: "MVP",
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

function ExternalDatabasePanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ExternalConnectionFormState>(
    DEFAULT_EXTERNAL_CONNECTION_FORM,
  );

  const connectionsQuery = useQuery({
    queryKey: ["external-database-connections", projectId],
    queryFn: () => listExternalDatabaseConnections(projectId),
    enabled: projectId.trim().length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (payload: ExternalDatabaseConnectionCreatePayload) =>
      createExternalDatabaseConnection(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["external-database-connections", projectId],
      });
      setForm((current) => ({
        ...DEFAULT_EXTERNAL_CONNECTION_FORM,
        databaseType: current.databaseType,
        port: DEFAULT_DATABASE_PORTS[current.databaseType],
      }));
    },
  });

  const testMutation = useMutation({
    mutationFn: testExternalDatabaseConnection,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["external-database-connections", projectId],
      });
    },
  });

  const connections = useMemo(
    () => connectionsQuery.data?.items ?? [],
    [connectionsQuery.data?.items],
  );
  const portNumber = Number(form.port);
  const isValidPort =
    Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535;
  const canSave =
    projectId.trim().length > 0 &&
    form.name.trim().length > 0 &&
    form.host.trim().length > 0 &&
    form.databaseName.trim().length > 0 &&
    form.username.trim().length > 0 &&
    form.password.length > 0 &&
    isValidPort &&
    !createMutation.isPending;

  function updateField<K extends keyof ExternalConnectionFormState>(
    key: K,
    value: ExternalConnectionFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDatabaseType(databaseType: DatabaseType) {
    setForm((current) => ({
      ...current,
      databaseType,
      port: DEFAULT_DATABASE_PORTS[databaseType],
    }));
  }

  function submitConnection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    createMutation.mutate({
      database_name: form.databaseName.trim(),
      database_type: form.databaseType,
      host: form.host.trim(),
      name: form.name.trim(),
      password: form.password,
      port: portNumber,
      project_id: projectId.trim(),
      read_only: true,
      username: form.username.trim(),
    });
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
      <PanelHeader icon={Server} title="External database connections" />
      <div className="grid gap-4 p-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="space-y-4 rounded-md border border-emerald/20 bg-emerald/10 p-4"
          onSubmit={submitConnection}
        >
          <div>
            <p className="text-sm font-semibold text-ink">
              Save read-only connection
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Store connection metadata, keep the password hidden, and verify
              the database can answer a read-only test query.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["postgresql", "mysql"] as const).map((databaseType) => (
              <button
                key={databaseType}
                className={[
                  "h-9 rounded-md border px-3 text-xs font-semibold transition",
                  form.databaseType === databaseType
                    ? "border-emerald bg-emerald text-white shadow-sm"
                    : "border-emerald/20 bg-white text-emerald hover:bg-emerald/10",
                ].join(" ")}
                onClick={() => updateDatabaseType(databaseType)}
                type="button"
              >
                {databaseType === "postgresql" ? "PostgreSQL" : "MySQL"}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
            <TextInput
              id="external-connection-name"
              label="Connection name"
              placeholder="Warehouse readonly"
              value={form.name}
              onChange={(value) => updateField("name", value)}
            />
            <TextInput
              id="external-connection-host"
              label="Host"
              placeholder="127.0.0.1"
              value={form.host}
              onChange={(value) => updateField("host", value)}
            />
            <TextInput
              id="external-connection-port"
              label="Port"
              placeholder={DEFAULT_DATABASE_PORTS[form.databaseType]}
              value={form.port}
              onChange={(value) => updateField("port", value)}
            />
            <TextInput
              id="external-connection-database"
              label="Database"
              placeholder="analytics"
              value={form.databaseName}
              onChange={(value) => updateField("databaseName", value)}
            />
            <TextInput
              id="external-connection-username"
              label="Username"
              placeholder="readonly_user"
              value={form.username}
              onChange={(value) => updateField("username", value)}
            />
            <TextInput
              id="external-connection-password"
              label="Password"
              placeholder="Stored as secret placeholder"
              type="password"
              value={form.password}
              onChange={(value) => updateField("password", value)}
            />
          </div>

          <label className="flex items-start gap-2 rounded-md border border-emerald/20 bg-white px-3 py-2 text-xs leading-5 text-muted">
            <input
              checked
              className="mt-0.5 h-4 w-4 rounded border-line text-emerald"
              readOnly
              type="checkbox"
            />
            Read-only connection policy is enforced for this MVP.
          </label>

          {!isValidPort ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Port must be an integer between 1 and 65535.
            </p>
          ) : null}

          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canSave}
            type="submit"
          >
            <Database className="h-4 w-4" />
            {createMutation.isPending ? "Saving..." : "Save connection"}
          </button>

          {createMutation.data ? (
            <Alert
              message={`Saved ${createMutation.data.name}. Run a connection test before importing tables.`}
              tone="success"
            />
          ) : null}
          {createMutation.error ? (
            <Alert message={createMutation.error.message} tone="error" />
          ) : null}
        </form>

        <ExternalConnectionList
          connections={connections}
          error={connectionsQuery.error}
          isLoading={connectionsQuery.isLoading || connectionsQuery.isFetching}
          testError={testMutation.error}
          testResult={testMutation.data}
          testingConnectionId={
            testMutation.isPending ? testMutation.variables : undefined
          }
          onTest={(connectionId) => testMutation.mutate(connectionId)}
        />
      </div>
    </div>
  );
}

function ExternalConnectionList({
  connections,
  isLoading,
  error,
  testingConnectionId,
  testResult,
  testError,
  onTest,
}: {
  connections: ExternalDatabaseConnection[];
  isLoading: boolean;
  error: Error | null;
  testingConnectionId?: string;
  testResult?: { ok: boolean; message: string };
  testError: Error | null;
  onTest: (connectionId: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-white">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Saved connections</p>
          <p className="mt-1 text-xs text-muted">
            PostgreSQL/MySQL entries are project-scoped and password-free in
            responses.
          </p>
        </div>
        <span className="w-fit rounded-full bg-cyan/10 px-2.5 py-1 text-xs font-semibold text-cyan">
          {connections.length.toLocaleString()} connections
        </span>
      </div>

      {testResult ? (
        <div
          className={[
            "border-b border-line px-4 py-3 text-sm",
            testResult.ok
              ? "bg-emerald/10 text-emerald"
              : "bg-red-50 text-red-700",
          ].join(" ")}
        >
          {testResult.message}
        </div>
      ) : null}
      {testError ? (
        <div className="border-b border-line bg-red-50 px-4 py-3 text-sm text-red-700">
          {testError.message}
        </div>
      ) : null}

      {isLoading ? (
        <StateMessage title="Loading external database connections" />
      ) : error ? (
        <StateMessage
          title="Could not load database connections"
          tone="error"
        />
      ) : connections.length === 0 ? (
        <StateMessage title="No external database connections yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Connection
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Endpoint
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Status
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
              {connections.map((connection) => (
                <ExternalConnectionRow
                  key={connection.id}
                  connection={connection}
                  isTesting={testingConnectionId === connection.id}
                  onTest={onTest}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExternalConnectionRow({
  connection,
  isTesting,
  onTest,
}: {
  connection: ExternalDatabaseConnection;
  isTesting: boolean;
  onTest: (connectionId: string) => void;
}) {
  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="border-b border-line px-4 py-3">
        <p className="max-w-xs truncate font-semibold text-ink">
          {connection.name}
        </p>
        <p className="mt-1 font-mono text-xs text-muted">{connection.id}</p>
        <p className="mt-2 text-xs uppercase text-muted">
          {connection.database_type === "postgresql" ? "PostgreSQL" : "MySQL"}{" "}
          readonly
        </p>
      </td>
      <td className="border-b border-line px-4 py-3">
        <p className="max-w-sm truncate font-mono text-xs text-ink">
          {connection.host}:{connection.port}/{connection.database_name}
        </p>
        <p className="mt-1 text-xs text-muted">{connection.username}</p>
      </td>
      <td className="border-b border-line px-4 py-3">
        <ExternalConnectionStatusChip status={connection.status} />
        {connection.last_error ? (
          <p className="mt-2 max-w-sm rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {connection.last_error}
          </p>
        ) : null}
      </td>
      <td className="border-b border-line px-4 py-3 text-xs text-muted">
        {formatDate(connection.updated_at)}
      </td>
      <td className="border-b border-line px-4 py-3">
        <button
          className="inline-flex h-8 items-center gap-2 rounded-md border border-emerald/30 bg-emerald/10 px-3 text-xs font-semibold text-emerald transition hover:bg-emerald/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isTesting}
          onClick={() => onTest(connection.id)}
          type="button"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {isTesting ? "Testing" : "Test"}
        </button>
      </td>
    </tr>
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

function ExternalConnectionStatusChip({
  status,
}: {
  status: ExternalConnectionStatus;
}) {
  const meta = {
    available: {
      label: "Available",
      icon: CheckCircle2,
      className: "border-emerald/20 bg-emerald/10 text-emerald",
    },
    failed: {
      label: "Failed",
      icon: AlertTriangle,
      className: "border-red-200 bg-red-50 text-red-700",
    },
    untested: {
      label: "Untested",
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

function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "password" | "text";
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-xs font-semibold uppercase text-muted">
        {label}
      </span>
      <input
        id={id}
        className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Alert({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald/20 bg-white text-emerald";

  return (
    <div className={`rounded-md border px-3 py-3 text-sm ${className}`}>
      {message}
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
