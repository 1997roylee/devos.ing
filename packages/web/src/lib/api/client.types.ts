export type HealthStatus = "ok";

export interface HealthResponse {
	status: HealthStatus;
}

export interface HealthRequestOptions {
	signal?: AbortSignal;
}

export interface ApiClientOptions {
	baseUrl?: string;
	fetchFn?: typeof fetch;
	headers?: HeadersInit;
}

export interface ApiClient {
	getHealth(options?: HealthRequestOptions): Promise<HealthResponse>;
}
