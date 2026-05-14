export interface ServerStateQueryOptions {
	enabled?: boolean;
}

export interface TaskCreateMutationInput {
	request: string;
	projectId?: string;
	answers?: Array<{ question: string; answer: string }>;
}
