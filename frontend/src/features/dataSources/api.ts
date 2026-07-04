import { apiClient } from "../../lib/apiClient";
import type { Dataset } from "../datasets/api";

export type DatabaseType = "postgresql" | "mysql";
export type ExternalConnectionStatus = "untested" | "available" | "failed";

export interface ExternalDatabaseConnection {
  id: string;
  project_id: string;
  name: string;
  database_type: DatabaseType;
  host: string;
  port: number;
  database_name: string;
  username: string;
  read_only: boolean;
  status: ExternalConnectionStatus;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalDatabaseConnectionCreatePayload {
  project_id: string;
  name: string;
  database_type: DatabaseType;
  host: string;
  port?: number;
  database_name: string;
  username: string;
  password: string;
  read_only: boolean;
}

export interface ExternalDatabaseConnectionListResponse {
  items: ExternalDatabaseConnection[];
}

export interface ExternalDatabaseConnectionTestResponse {
  connection: ExternalDatabaseConnection;
  ok: boolean;
  message: string;
}

export interface ExternalTableColumn {
  name: string;
  data_type: string;
  inferred_type: string;
  nullable: boolean;
  order: number;
}

export interface ExternalTable {
  schema_name: string;
  table_name: string;
  columns: ExternalTableColumn[];
}

export interface ExternalDatabaseSchemaResponse {
  connection: ExternalDatabaseConnection;
  tables: ExternalTable[];
}

export interface ExternalTableImportPayload {
  project_id: string;
  dataset_name: string;
  schema_name: string;
  table_name: string;
  limit: number;
}

export interface ExternalSqlImportPayload {
  project_id: string;
  dataset_name: string;
  sql: string;
  limit: number;
}

export interface ExternalDatasetImportResponse {
  dataset: Dataset;
  source_type: "external_table" | "external_sql";
  row_count: number;
}

export async function createExternalDatabaseConnection(
  payload: ExternalDatabaseConnectionCreatePayload,
): Promise<ExternalDatabaseConnection> {
  return apiClient.post<ExternalDatabaseConnection>(
    "/data-sources/external-databases",
    payload,
  );
}

export async function listExternalDatabaseConnections(
  projectId: string,
): Promise<ExternalDatabaseConnectionListResponse> {
  return apiClient.get<ExternalDatabaseConnectionListResponse>(
    "/data-sources/external-databases",
    {
      project_id: projectId,
    },
  );
}

export async function testExternalDatabaseConnection(
  connectionId: string,
): Promise<ExternalDatabaseConnectionTestResponse> {
  return apiClient.post<ExternalDatabaseConnectionTestResponse>(
    `/data-sources/external-databases/${connectionId}/test`,
  );
}

export async function inspectExternalDatabaseSchema(
  connectionId: string,
): Promise<ExternalDatabaseSchemaResponse> {
  return apiClient.get<ExternalDatabaseSchemaResponse>(
    `/data-sources/external-databases/${connectionId}/schema`,
  );
}

export async function importExternalTable(
  connectionId: string,
  payload: ExternalTableImportPayload,
): Promise<ExternalDatasetImportResponse> {
  return apiClient.post<ExternalDatasetImportResponse>(
    `/data-sources/external-databases/${connectionId}/import-table`,
    payload,
  );
}

export async function importExternalSql(
  connectionId: string,
  payload: ExternalSqlImportPayload,
): Promise<ExternalDatasetImportResponse> {
  return apiClient.post<ExternalDatasetImportResponse>(
    `/data-sources/external-databases/${connectionId}/import-sql`,
    payload,
  );
}
