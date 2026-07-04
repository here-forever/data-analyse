import { screen } from "@testing-library/react";
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
    expect(screen.getByText("API source")).toBeInTheDocument();
  });
});

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
