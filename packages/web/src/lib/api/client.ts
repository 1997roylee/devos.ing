import type {
	AgentRecord,
	ApiClient,
	ApiClientOptions,
	CommandHistoryRecord,
	HealthRequestOptions,
	HealthResponse,
	JobRecord,
	SkillRecord,
	TokenUsageRecord,
} from "./client.types";

function assertObjectRecord(
	payload: unknown,
	endpoint: string,
): Record<string, unknown> {
	if (typeof payload !== "object" || payload === null) {
		throw new Error(`Invalid ${endpoint} response payload`);
	}

	return payload as Record<string, unknown>;
}

function readString(
	record: Record<string, unknown>,
	key: string,
	endpoint: string,
): string {
	const value = record[key];
	if (typeof value !== "string") {
		throw new Error(`Invalid ${endpoint} response field '${key}'`);
	}

	return value;
}

function readNumber(
	record: Record<string, unknown>,
	key: string,
	endpoint: string,
): number {
	const value = record[key];
	if (typeof value !== "number") {
		throw new Error(`Invalid ${endpoint} response field '${key}'`);
	}

	return value;
}

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

function parseTokenUsageRecord(payload: unknown): TokenUsageRecord {
	const row = assertObjectRecord(payload, "/api/token-usage");
	return {
		id: readString(row, "id", "/api/token-usage"),
		runId: readString(row, "runId", "/api/token-usage"),
		stage: readString(row, "stage", "/api/token-usage"),
		inputTokens: readNumber(row, "inputTokens", "/api/token-usage"),
		outputTokens: readNumber(row, "outputTokens", "/api/token-usage"),
		totalTokens: readNumber(row, "totalTokens", "/api/token-usage"),
		recordedAt: readString(row, "recordedAt", "/api/token-usage"),
	};
}

function parseJobRecord(payload: unknown): JobRecord {
	const row = assertObjectRecord(payload, "/api/jobs");
	return {
		id: readString(row, "id", "/api/jobs"),
		projectId: readString(row, "projectId", "/api/jobs"),
		issueKey: readString(row, "issueKey", "/api/jobs"),
		stage: readString(row, "stage", "/api/jobs"),
		status: readString(row, "status", "/api/jobs"),
		createdAt: readString(row, "createdAt", "/api/jobs"),
	};
}

function parseAgentRecord(payload: unknown): AgentRecord {
	const row = assertObjectRecord(payload, "/api/agents");
	return {
		id: readString(row, "id", "/api/agents"),
		name: readString(row, "name", "/api/agents"),
		backend: readString(row, "backend", "/api/agents"),
		model: readString(row, "model", "/api/agents"),
		createdAt: readString(row, "createdAt", "/api/agents"),
	};
}

function parseSkillRecord(payload: unknown): SkillRecord {
	const row = assertObjectRecord(payload, "/api/skills");
	return {
		id: readString(row, "id", "/api/skills"),
		name: readString(row, "name", "/api/skills"),
		description: readString(row, "description", "/api/skills"),
		source: readString(row, "source", "/api/skills"),
		updatedAt: readString(row, "updatedAt", "/api/skills"),
	};
}

function parseCommandHistoryRecord(payload: unknown): CommandHistoryRecord {
	const row = assertObjectRecord(payload, "/api/command-history");
	return {
		id: readString(row, "id", "/api/command-history"),
		command: readString(row, "command", "/api/command-history"),
		exitCode: readNumber(row, "exitCode", "/api/command-history"),
		executedAt: readString(row, "executedAt", "/api/command-history"),
	};
}

function parseListResponse<T>(
	payload: unknown,
	endpoint: string,
	parseItem: (item: unknown) => T,
): T[] {
	if (!Array.isArray(payload)) {
		throw new Error(`Invalid ${endpoint} response payload`);
	}

	return payload.map(parseItem);
}

async function requestJson(
	baseUrl: string,
	path: string,
	fetchFn: typeof fetch,
	headers: HeadersInit | undefined,
	options: HealthRequestOptions | undefined,
): Promise<unknown> {
	const response = await fetchFn(`${baseUrl}${path}`, {
		method: "GET",
		headers,
		signal: options?.signal,
	});

	if (!response.ok) {
		throw new Error(`${path} request failed with status ${response.status}`);
	}

	return (await response.json()) as unknown;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
	const baseUrl = options.baseUrl ?? "";
	const fetchFn = options.fetchFn ?? fetch;
	const headers = options.headers;

	return {
		async getHealth(
			requestOptions?: HealthRequestOptions,
		): Promise<HealthResponse> {
			const payload = await requestJson(
				baseUrl,
				"/health",
				fetchFn,
				headers,
				requestOptions,
			);
			return parseHealthResponse(payload);
		},
		async listTokenUsage(
			requestOptions?: HealthRequestOptions,
		): Promise<TokenUsageRecord[]> {
			const payload = await requestJson(
				baseUrl,
				"/api/token-usage",
				fetchFn,
				headers,
				requestOptions,
			);
			return parseListResponse(
				payload,
				"/api/token-usage",
				parseTokenUsageRecord,
			);
		},
		async listJobs(
			requestOptions?: HealthRequestOptions,
		): Promise<JobRecord[]> {
			const payload = await requestJson(
				baseUrl,
				"/api/jobs",
				fetchFn,
				headers,
				requestOptions,
			);
			return parseListResponse(payload, "/api/jobs", parseJobRecord);
		},
		async listAgents(
			requestOptions?: HealthRequestOptions,
		): Promise<AgentRecord[]> {
			const payload = await requestJson(
				baseUrl,
				"/api/agents",
				fetchFn,
				headers,
				requestOptions,
			);
			return parseListResponse(payload, "/api/agents", parseAgentRecord);
		},
		async listSkills(
			requestOptions?: HealthRequestOptions,
		): Promise<SkillRecord[]> {
			const payload = await requestJson(
				baseUrl,
				"/api/skills",
				fetchFn,
				headers,
				requestOptions,
			);
			return parseListResponse(payload, "/api/skills", parseSkillRecord);
		},
		async listCommandHistory(
			requestOptions?: HealthRequestOptions,
		): Promise<CommandHistoryRecord[]> {
			const payload = await requestJson(
				baseUrl,
				"/api/command-history",
				fetchFn,
				headers,
				requestOptions,
			);
			return parseListResponse(
				payload,
				"/api/command-history",
				parseCommandHistoryRecord,
			);
		},
	};
}
