import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { DatasetField } from "../datasets/api";
import { createDataset, createFilePreview, type FilePreview } from "./api";

const DEFAULT_PROJECT_ID = "prj_demo";
const FIELD_TYPES: DatasetField["inferred_type"][] = [
  "integer",
  "decimal",
  "date",
  "datetime",
  "boolean",
  "text",
];

export function ImportWizardPage() {
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const [datasetName, setDatasetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [fields, setFields] = useState<DatasetField[]>([]);

  const previewMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) {
        throw new Error("Select a CSV or Excel file first");
      }
      return createFilePreview(projectId.trim(), selectedFile);
    },
    onSuccess: (result) => {
      setPreview(result);
      setFields(result.fields);
      setDatasetName(
        (current) => current || cleanDatasetName(result.file_name),
      );
    },
  });

  const datasetMutation = useMutation({
    mutationFn: () => {
      if (!preview) {
        throw new Error("Create a file preview first");
      }
      return createDataset({
        fields,
        name: datasetName.trim(),
        preview_id: preview.id,
        project_id: preview.project_id,
      });
    },
  });

  const canPreview = projectId.trim().length > 0 && selectedFile !== null;
  const canCreateDataset =
    preview !== null &&
    datasetName.trim().length > 0 &&
    fields.length > 0 &&
    !datasetMutation.isPending;
  const sampleColumns = useMemo(
    () =>
      fields.map((field) => ({
        label: field.name,
        order: field.order,
        sourceName:
          preview?.fields.find(
            (sourceField) => sourceField.order === field.order,
          )?.name ?? field.name,
      })),
    [fields, preview?.fields],
  );

  function updateField(index: number, patch: Partial<DatasetField>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    );
  }

  return (
    <section className="space-y-5">
      <div className="border-b border-line pb-5">
        <p className="text-sm font-medium text-cyan">Import</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Import wizard</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Upload CSV or Excel files, inspect inferred fields, and create
          materialized datasets.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Panel title="Upload source">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted">
                  Project ID
                </span>
                <input
                  className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted">
                  Source file
                </span>
                <div className="mt-2 rounded-md border border-dashed border-line bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <UploadCloud className="mt-1 h-5 w-5 text-brand" />
                    <div className="min-w-0 flex-1">
                      <input
                        aria-label="Source file"
                        className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                        type="file"
                        accept=".csv,.xlsx,.xlsm"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedFile(file);
                          setPreview(null);
                          setFields([]);
                          setDatasetName(
                            file ? cleanDatasetName(file.name) : "",
                          );
                          datasetMutation.reset();
                          previewMutation.reset();
                        }}
                      />
                      <p className="mt-2 truncate text-xs text-muted">
                        {selectedFile
                          ? selectedFile.name
                          : "CSV, XLSX, or XLSM"}
                      </p>
                    </div>
                  </div>
                </div>
              </label>

              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!canPreview || previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                {previewMutation.isPending ? "Parsing..." : "Create preview"}
              </button>

              {previewMutation.error ? (
                <Alert tone="error" message={previewMutation.error.message} />
              ) : null}
            </div>
          </Panel>

          <Panel title="Dataset target">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-muted">
                  Dataset name
                </span>
                <input
                  aria-label="Dataset name"
                  className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                  value={datasetName}
                  onChange={(event) => setDatasetName(event.target.value)}
                  placeholder="Sales Orders"
                />
              </label>

              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!canCreateDataset}
                onClick={() => datasetMutation.mutate()}
                type="button"
              >
                <CheckCircle2 className="h-4 w-4" />
                {datasetMutation.isPending ? "Creating..." : "Create dataset"}
              </button>

              {datasetMutation.data ? (
                <div className="space-y-3">
                  <Alert
                    tone="success"
                    message={`Created ${datasetMutation.data.name} (${datasetMutation.data.row_count} rows)`}
                  />
                  <Link
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald/30 bg-white px-4 text-sm font-semibold text-emerald transition hover:bg-emerald/10"
                    to="/datasets"
                  >
                    Open dataset workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
              {datasetMutation.error ? (
                <Alert tone="error" message={datasetMutation.error.message} />
              ) : null}
            </div>
          </Panel>
        </aside>

        <div className="space-y-5">
          <PreviewSummary preview={preview} />
          <FieldEditor fields={fields} onChange={updateField} />
          <SampleRows preview={preview} columns={sampleColumns} />
        </div>
      </div>
    </section>
  );
}

function PreviewSummary({ preview }: { preview: FilePreview | null }) {
  if (!preview) {
    return (
      <div className="rounded-md border border-dashed border-line bg-panel p-6 text-sm text-muted">
        Create a preview to inspect fields and sample rows before materializing
        a dataset.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Metric label="File" value={preview.file_name} tone="brand" />
      <Metric
        label="Type"
        value={preview.file_type.toUpperCase()}
        tone="cyan"
      />
      <Metric
        label="Rows"
        value={preview.row_count.toLocaleString()}
        tone="emerald"
      />
      <Metric
        label="Fields"
        value={preview.fields.length.toLocaleString()}
        tone="amber"
      />
    </div>
  );
}

function FieldEditor({
  fields,
  onChange,
}: {
  fields: DatasetField[];
  onChange: (index: number, patch: Partial<DatasetField>) => void;
}) {
  return (
    <Panel title="Field confirmation">
      {fields.length === 0 ? (
        <StateMessage title="No fields to confirm yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Order
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Field name
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Type
                </th>
                <th className="border-b border-line px-4 py-3 font-semibold">
                  Nullable
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr
                  key={`${field.order}-${index}`}
                  className="hover:bg-slate-50"
                >
                  <td className="border-b border-line px-4 py-3 text-muted">
                    {field.order + 1}
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <input
                      className="h-9 min-w-48 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                      value={field.name}
                      onChange={(event) =>
                        onChange(index, { name: event.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <select
                      className="h-9 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-blue-100"
                      value={field.inferred_type}
                      onChange={(event) =>
                        onChange(index, {
                          inferred_type: event.target
                            .value as DatasetField["inferred_type"],
                        })
                      }
                    >
                      {FIELD_TYPES.map((fieldType) => (
                        <option key={fieldType} value={fieldType}>
                          {fieldType}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-sm text-muted">
                      <input
                        className="h-4 w-4 rounded border-line text-brand"
                        type="checkbox"
                        checked={field.nullable}
                        onChange={(event) =>
                          onChange(index, { nullable: event.target.checked })
                        }
                      />
                      nullable
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function SampleRows({
  preview,
  columns,
}: {
  preview: FilePreview | null;
  columns: Array<{ label: string; order: number; sourceName: string }>;
}) {
  return (
    <Panel title="Sample rows">
      {!preview ? (
        <StateMessage title="No sample rows yet" />
      ) : preview.sample_rows.length === 0 ? (
        <StateMessage title="The preview has no sample rows" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted">
              <tr>
                {columns.map((column) => (
                  <th
                    key={`${column.order}-${column.label}`}
                    className="border-b border-line px-4 py-3 font-semibold"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sample_rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td
                      key={`${column.order}-${column.sourceName}`}
                      className="border-b border-line px-4 py-3 text-ink"
                    >
                      {formatCell(row[column.sourceName])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <FileSpreadsheet className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
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
  const toneClass = {
    amber: "border-amber/20 bg-amber/10 text-amber",
    brand: "border-brand/20 bg-blue-50 text-brand",
    cyan: "border-cyan/20 bg-cyan/10 text-cyan",
    emerald: "border-emerald/20 bg-emerald/10 text-emerald",
  }[tone];

  return (
    <div className={`rounded-md border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
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
      : "border-emerald/20 bg-emerald/10 text-emerald";

  return (
    <div className={`rounded-md border px-3 py-3 text-sm ${className}`}>
      {message}
    </div>
  );
}

function StateMessage({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-4 py-6 text-center text-sm text-muted">
      {title}
    </div>
  );
}

function cleanDatasetName(fileName: string) {
  return (
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim() || "Imported Dataset"
  );
}

function formatCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted">NULL</span>;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}
