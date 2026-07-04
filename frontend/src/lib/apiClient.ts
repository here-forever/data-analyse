export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Fetcher = typeof fetch;

export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: Fetcher;
}

export interface ApiClient {
  get<TResponse>(path: string): Promise<TResponse>;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export function createApiClient({ baseUrl, fetcher = fetch }: ApiClientOptions): ApiClient {
  return {
    async get<TResponse>(path: string): Promise<TResponse> {
      const response = await fetcher(joinUrl(baseUrl, path), {
        headers: { Accept: "application/json" },
        method: "GET",
      });

      if (!response.ok) {
        throw new ApiError(await readErrorMessage(response), response.status);
      }

      return (await response.json()) as TResponse;
    },
  };
}

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api",
});
