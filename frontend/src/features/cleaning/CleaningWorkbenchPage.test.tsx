import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithProviders } from "../../test/test-utils";
import { CleaningWorkbenchPage } from "./CleaningWorkbenchPage";

const fetchMock = vi.fn();

describe("CleaningWorkbenchPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  test("builds cleaning steps, previews rows, and saves recipe", async () => {
    fetchMock.mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes("/datasets?")) {
          return Promise.resolve(
            jsonResponse({
              items: [
                {
                  id: "dataset_1",
                  project_id: "prj_demo",
                  name: "Customers",
                  source_preview_id: "preview_1",
                  physical_table_name: "ds_customers",
                  row_count: 3,
                  fields: [
                    {
                      name: "customer",
                      inferred_type: "text",
                      nullable: false,
                      order: 0,
                    },
                    {
                      name: "region",
                      inferred_type: "text",
                      nullable: true,
                      order: 1,
                    },
                    {
                      name: "amount",
                      inferred_type: "decimal",
                      nullable: false,
                      order: 2,
                    },
                  ],
                },
              ],
            }),
          );
        }

        if (url.endsWith("/cleaning/preview")) {
          expect(init?.body).toContain('"operation":"fill_null"');
          expect(init?.body).toContain('"field":"region"');
          expect(init?.body).toContain('"value":"Unknown"');
          return Promise.resolve(
            jsonResponse({
              source_dataset_id: "dataset_1",
              page: 1,
              page_size: 20,
              total_rows: 3,
              fields: ["_das_row_id", "customer", "region", "amount"],
              rows: [
                {
                  _das_row_id: 1,
                  customer: "Ada",
                  region: "Unknown",
                  amount: 19.5,
                },
                { _das_row_id: 2, customer: "Lin", region: "East", amount: 42 },
              ],
            }),
          );
        }

        if (url.endsWith("/cleaning/recipes")) {
          expect(init?.body).toContain('"name":"Customer cleanup"');
          return Promise.resolve(
            jsonResponse({
              id: "clean_1",
              project_id: "prj_demo",
              source_dataset_id: "dataset_1",
              name: "Customer cleanup",
              description: null,
              steps: [
                {
                  id: "cstep_1",
                  operation: "fill_null",
                  order: 0,
                  config: { field: "region", value: "Unknown" },
                },
              ],
            }),
          );
        }

        return Promise.resolve(jsonResponse({}));
      },
    );
    const user = userEvent.setup();

    renderWithProviders(<CleaningWorkbenchPage />);

    expect(await screen.findByText("Customers")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Recipe name"));
    await user.type(screen.getByLabelText("Recipe name"), "Customer cleanup");
    await user.click(screen.getByRole("button", { name: "Fill null" }));
    await user.selectOptions(screen.getByLabelText("Field"), "region");
    await user.type(screen.getByLabelText("Fill value"), "Unknown");
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("19.5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(
      await screen.findByText("Saved Customer cleanup"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });
});

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}
