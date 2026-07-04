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
  accessToken?: string;
}

export interface ApiClient {
  get<TResponse>(path: string, params?: Record<string, string | number | boolean | null | undefined>): Promise<TResponse>;
}

function joinUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export function createApiClient({
  baseUrl,
  fetcher = fetch,
  accessToken,
}: ApiClientOptions): ApiClient {
  return {
    async get<TResponse>(
      path: string,
      params?: Record<string, string | number | boolean | null | undefined>,
    ): Promise<TResponse> {
      const response = await fetcher(joinUrl(baseUrl, path, params), {
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
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
  accessToken:
    import.meta.env.VITE_DEV_ACCESS_TOKEN ??
    (import.meta.env.DEV ? "local-dev-token-usr_admin" : undefined),
  fetcher: (...args) => fetch(...args),
});
