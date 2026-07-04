import { afterEach, describe, expect, test, vi } from "vitest";

import { ApiError, createApiClient } from "./apiClient";

describe("apiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("joins base URL and path when requesting JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    const client = createApiClient({
      baseUrl: "http://127.0.0.1:8000/api",
      fetcher: fetchMock,
    });
    const result = await client.get<{ status: string }>("/health");

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/health", {
      headers: { Accept: "application/json" },
      method: "GET",
    });
    expect(result).toEqual({ status: "ok" });
  });

  test("adds bearer token when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    const client = createApiClient({
      accessToken: "local-dev-token-usr_admin",
      baseUrl: "http://127.0.0.1:8000/api",
      fetcher: fetchMock,
    });
    await client.get("/datasets");

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/datasets", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer local-dev-token-usr_admin",
      },
      method: "GET",
    });
  });

  test("appends query parameters to GET requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const client = createApiClient({
      baseUrl: "http://127.0.0.1:8000/api",
      fetcher: fetchMock,
    });

    await client.get("/datasets", { project_id: "prj_1", page: 2, empty: null });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/datasets?project_id=prj_1&page=2",
      {
        headers: { Accept: "application/json" },
        method: "GET",
      },
    );
  });

  test("throws ApiError with status code when request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "Server failed" } }),
    });

    const client = createApiClient({ baseUrl: "http://localhost/api", fetcher: fetchMock });

    await expect(client.get("/broken")).rejects.toEqual(new ApiError("Server failed", 500));
  });
});
