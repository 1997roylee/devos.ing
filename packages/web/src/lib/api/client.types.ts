export type HealthStatus = "ok";

export interface HealthResponse {
	status: HealthStatus;
}

export interface HealthRequestOptions {
	signal?: AbortSignal;
}

export interface TokenUsageRecord {
	id: string;
	runId: string;
	stage: string;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	recordedAt: string;
}

export interface JobRecord {
	id: string;
	projectId: string;
	issueKey: string;
	stage: string;
	status: string;
	createdAt: string;
}

export interface AgentRecord {
	id: string;
	name: string;
	backend: string;
	model: string;
	createdAt: string;
}

export interface SkillRecord {
	id: string;
	name: string;
	description: string;
	source: string;
	updatedAt: string;
}

export interface CommandHistoryRecord {
	id: string;
	command: string;
	exitCode: number;
	executedAt: string;
}

export interface TaskCreateAnswer {
	question: string;
	answer: string;
}

export interface TaskCreateRequest {
	request: string;
	projectId?: string;
	answers?: TaskCreateAnswer[];
}

export interface CreatedTaskRef {
	identifier: string;
	url: string;
}

export type TaskCreateResponse =
	| {
			status: "created";
			issue: CreatedTaskRef;
			rawOutput: string;
	  }
	| {
			status: "needs_info";
			questions: string[];
			rawOutput: string;
	  }
	| {
			status: "error";
			error: string;
			rawOutput: string;
	  };

export interface ApiClientOptions {
	baseUrl?: string;
	fetchFn?: typeof fetch;
	headers?: HeadersInit;
}

export interface ApiClient {
	getHealth(options?: HealthRequestOptions): Promise<HealthResponse>;
	listTokenUsage(options?: HealthRequestOptions): Promise<TokenUsageRecord[]>;
	listJobs(options?: HealthRequestOptions): Promise<JobRecord[]>;
	listAgents(options?: HealthRequestOptions): Promise<AgentRecord[]>;
	listSkills(options?: HealthRequestOptions): Promise<SkillRecord[]>;
	listCommandHistory(
		options?: HealthRequestOptions,
	): Promise<CommandHistoryRecord[]>;
	createTask(
		request: TaskCreateRequest,
		options?: HealthRequestOptions,
	): Promise<TaskCreateResponse>;
}
