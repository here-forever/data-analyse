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
