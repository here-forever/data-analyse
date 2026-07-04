import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithProviders } from "../../test/test-utils";
import { ImportWizardPage } from "./ImportWizardPage";

const fetchMock = vi.fn();

describe("ImportWizardPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  test("creates file preview, edits fields, and creates dataset", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.endsWith("/imports/file-previews")) {
          expect(init?.body).toBeInstanceOf(FormData);
          return Promise.resolve(
            jsonResponse({
              id: "preview_1",
              project_id: "prj_demo",
              file_name: "sales.csv",
              file_type: "csv",
              row_count: 2,
              fields: [
                {
                  name: "order_id",
                  inferred_type: "integer",
                  nullable: false,
                  order: 0,
                },
                {
                  name: "amount",
                  inferred_type: "decimal",
                  nullable: false,
                  order: 1,
                },
              ],
              sample_rows: [
                { order_id: 1, amount: 19.5 },
                { order_id: 2, amount: 42 },
              ],
            }),
          );
        }

        if (url.endsWith("/datasets")) {
          expect(init?.body).toContain("sales_amount");
          return Promise.resolve(
            jsonResponse({
              id: "dataset_1",
              project_id: "prj_demo",
              name: "Sales",
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
                {
                  name: "sales_amount",
                  inferred_type: "decimal",
                  nullable: false,
                  order: 1,
                },
              ],
            }),
          );
        }

        return Promise.resolve(jsonResponse({}));
      },
    );
    const user = userEvent.setup();

    renderWithProviders(<ImportWizardPage />);

    const file = new File(["order_id,amount\n1,19.5\n2,42\n"], "sales.csv", {
      type: "text/csv",
    });
    await user.upload(screen.getByLabelText("Source file"), file);
    await user.click(screen.getByRole("button", { name: "Create preview" }));

    await screen.findByText("19.5");
    expect(screen.getAllByText("sales.csv")).toHaveLength(2);
    expect(screen.getByText("19.5")).toBeInTheDocument();

    const amountInput = screen.getByDisplayValue("amount");
    await user.clear(amountInput);
    await user.type(amountInput, "sales_amount");
    const datasetNameInput = screen.getByLabelText("Dataset name");
    await user.clear(datasetNameInput);
    await user.type(datasetNameInput, "Sales");
    await user.click(screen.getByRole("button", { name: "Create dataset" }));

    expect(
      await screen.findByText("Created Sales (2 rows)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open dataset workspace/i }),
    ).toHaveAttribute(
      "href",
      "/datasets?project_id=prj_demo&dataset_id=dataset_1",
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
