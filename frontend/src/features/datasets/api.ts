import { apiClient } from "../../lib/apiClient";

export interface DatasetField {
  name: string;
  inferred_type: "integer" | "decimal" | "date" | "datetime" | "boolean" | "text";
  nullable: boolean;
  order: number;
}

export interface Dataset {
  id: string;
  project_id: string;
  name: string;
  source_preview_id: string;
  physical_table_name: string;
  row_count: number;
  fields: DatasetField[];
}

export interface DatasetListResponse {
  items: Dataset[];
}

export interface DatasetPreviewResponse {
  dataset: Dataset;
  page: number;
  page_size: number;
  total_rows: number;
  rows: Array<Record<string, string | number | boolean | null>>;
}

export async function listDatasets(projectId: string): Promise<DatasetListResponse> {
  return apiClient.get<DatasetListResponse>("/datasets", { project_id: projectId });
}

export async function getDataset(datasetId: string): Promise<Dataset> {
  return apiClient.get<Dataset>(`/datasets/${datasetId}`);
}

export async function getDatasetPreview(
  datasetId: string,
  page: number,
  pageSize: number,
): Promise<DatasetPreviewResponse> {
  return apiClient.get<DatasetPreviewResponse>(`/datasets/${datasetId}/preview`, {
    page,
    page_size: pageSize,
  });
}
