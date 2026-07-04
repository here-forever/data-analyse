import { apiClient } from "../../lib/apiClient";

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
