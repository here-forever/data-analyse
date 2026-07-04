import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithProviders } from "../../test/test-utils";
import { DataSourcesPage } from "./DataSourcesPage";

const fetchMock = vi.fn();

describe("DataSourcesPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  test("shows local file intake, upload history, and linked datasets", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/imports/uploads")) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                id: "file_1",
                project_id: "prj_demo",
                uploader_id: "usr_admin",
                file_name: "sales.csv",
                file_type: "csv",
                size_bytes: 29,
                status: "parsed",
                error_message: null,
                preview_id: "preview_1",
                preview_row_count: 2,
                created_at: "2026-07-04T10:00:00Z",
                updated_at: "2026-07-04T10:00:01Z",
              },
              {
                id: "file_2",
                project_id: "prj_demo",
                uploader_id: "usr_admin",
                file_name: "notes.txt",
                file_type: "txt",
                size_bytes: 5,
                status: "failed",
                error_message: "Only CSV and Excel files are supported",
                preview_id: null,
                preview_row_count: null,
                created_at: "2026-07-04T09:00:00Z",
                updated_at: "2026-07-04T09:00:01Z",
              },
            ],
          }),
        );
      }

      if (url.includes("/datasets")) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                id: "dataset_1",
                project_id: "prj_demo",
                name: "Sales Orders",
                source_preview_id: "preview_1",
                physical_table_name: "ds_sales",
                row_count: 2,
                fields: [
                  {
                    name: "order_id",
                    inferred_type: "integer",
                    nullable: false,
                    order: 0,
                  },
                ],
              },
            ],
          }),
        );
      }

      if (url.includes("/data-sources/external-databases")) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                id: "src_1",
                project_id: "prj_demo",
                name: "Warehouse readonly",
                database_type: "postgresql",
                host: "warehouse.local",
                port: 5432,
                database_name: "analytics",
                username: "readonly_user",
                read_only: true,
                status: "available",
                last_error: null,
                created_at: "2026-07-04T10:00:00Z",
                updated_at: "2026-07-04T10:01:00Z",
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({}));
    });

    renderWithProviders(<DataSourcesPage />);

    expect(
      await screen.findByRole("heading", { name: "Source intake center" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload file" })).toHaveAttribute(
      "href",
      "/import?project_id=prj_demo",
    );
    expect(
      await screen.findByRole("link", { name: "Resume latest" }),
    ).toHaveAttribute(
      "href",
      "/import?project_id=prj_demo&preview_id=preview_1",
    );
    expect(screen.getAllByText("sales.csv").length).toBeGreaterThan(0);
    expect(screen.getByText("notes.txt")).toBeInTheDocument();
    expect(
      screen.getByText("Only CSV and Excel files are supported"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sales Orders")).toBeInTheDocument();
    expect(screen.getByText("External database")).toBeInTheDocument();
    expect(screen.getByText("Warehouse readonly")).toBeInTheDocument();
    expect(screen.getAllByText("Available").length).toBeGreaterThan(0);
    expect(screen.getByText("API source")).toBeInTheDocument();
  });

  test("saves and tests an external database connection", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes("/imports/uploads")) {
          return Promise.resolve(jsonResponse({ items: [] }));
        }

        if (url.includes("/datasets")) {
          return Promise.resolve(jsonResponse({ items: [] }));
        }

        if (
          url.endsWith("/data-sources/external-databases") &&
          init?.method === "POST"
        ) {
          expect(init.body).toContain('"database_type":"mysql"');
          expect(init.body).toContain('"read_only":true');
          expect(init.body).toContain('"password":"secret-password"');
          return Promise.resolve(
            jsonResponse({
              ...connectionPayload,
              status: "untested",
              last_error: null,
            }),
          );
        }

        if (
          url.endsWith("/data-sources/external-databases/src_1/test") &&
          init?.method === "POST"
        ) {
          return Promise.resolve(
            jsonResponse({
              ok: true,
              message: "Read-only connection test succeeded",
              connection: {
                ...connectionPayload,
                status: "available",
                last_error: null,
              },
            }),
          );
        }

        if (url.includes("/data-sources/external-databases")) {
          return Promise.resolve(
            jsonResponse({
              items: [
                {
                  ...connectionPayload,
                  status: "untested",
                  last_error: null,
                },
              ],
            }),
          );
        }

        return Promise.resolve(jsonResponse({}));
      },
    );
    const user = userEvent.setup();

    renderWithProviders(<DataSourcesPage />);

    await screen.findByText("Warehouse readonly");
    await user.click(screen.getByRole("button", { name: "MySQL" }));
    await user.type(
      screen.getByLabelText("Connection name"),
      "Warehouse readonly",
    );
    await user.type(screen.getByLabelText("Host"), "mysql.local");
    await user.clear(screen.getByLabelText("Database"));
    await user.type(screen.getByLabelText("Database"), "analytics");
    await user.type(screen.getByLabelText("Username"), "readonly_user");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Save connection" }));

    expect(
      await screen.findByText(
        "Saved Warehouse readonly. Run a connection test before importing tables.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Test" }));

    expect(
      await screen.findByText("Read-only connection test succeeded"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/data-sources/external-databases/src_1/test",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}

const connectionPayload = {
  id: "src_1",
  project_id: "prj_demo",
  name: "Warehouse readonly",
  database_type: "mysql",
  host: "mysql.local",
  port: 3306,
  database_name: "analytics",
  username: "readonly_user",
  read_only: true,
  created_at: "2026-07-04T10:00:00Z",
  updated_at: "2026-07-04T10:01:00Z",
};
