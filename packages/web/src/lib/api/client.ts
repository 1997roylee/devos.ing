import type {
	ApiClient,
	ApiClientOptions,
	HealthRequestOptions,
	HealthResponse,
} from "./client.types";

function parseHealthResponse(payload: unknown): HealthResponse {
	if (
		typeof payload !== "object" ||
		payload === null ||
		!("status" in payload) ||
		payload.status !== "ok"
	) {
		throw new Error("Invalid /health response payload");
	}

	return payload as HealthResponse;
}

async function requestHealth(
	baseUrl: string,
	fetchFn: typeof fetch,
	headers: HeadersInit | undefined,
	options: HealthRequestOptions | undefined,
): Promise<HealthResponse> {
	const response = await fetchFn(`${baseUrl}/health`, {
		method: "GET",
		headers,
		signal: options?.signal,
	});

	if (!response.ok) {
		throw new Error(`Health request failed with status ${response.status}`);
	}

	const payload = (await response.json()) as unknown;
	return parseHealthResponse(payload);
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
	const baseUrl = options.baseUrl ?? "";
	const fetchFn = options.fetchFn ?? fetch;

	return {
		async getHealth(
			requestOptions?: HealthRequestOptions,
		): Promise<HealthResponse> {
			return requestHealth(baseUrl, fetchFn, options.headers, requestOptions);
		},
	};
}
