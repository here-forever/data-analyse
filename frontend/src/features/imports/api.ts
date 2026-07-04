import { apiClient } from "../../lib/apiClient";
import type { Dataset, DatasetField } from "../datasets/api";

export interface FilePreview {
  id: string;
  project_id: string;
  file_name: string;
  file_type: string;
  row_count: number;
  fields: DatasetField[];
  sample_rows: Array<Record<string, string | number | boolean | null>>;
}

export interface DatasetCreatePayload {
  project_id: string;
  preview_id: string;
  name: string;
  fields: DatasetField[];
}

export async function createFilePreview(
  projectId: string,
  file: File,
): Promise<FilePreview> {
  const body = new FormData();
  body.set("project_id", projectId);
  body.set("file", file);

  return apiClient.postForm<FilePreview>("/imports/file-previews", body);
}

export async function createDataset(
  payload: DatasetCreatePayload,
): Promise<Dataset> {
  return apiClient.post<Dataset>("/datasets", payload);
}
