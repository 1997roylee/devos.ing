"use client";

import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type {
	AgentRecord,
	CommandHistoryRecord,
	JobRecord,
	ProjectBoardRecord,
	SkillRecord,
	TaskCreateResponse,
	TokenUsageRecord,
	WorkspaceProjectRecord,
} from "./client.types";
import type {
	ServerStateQueryOptions,
	TaskCreateMutationInput,
} from "./queries.types";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();

export const serverStateQueryKeys = {
	tokenUsage: ["server-state", "token-usage"] as const,
	jobs: ["server-state", "jobs"] as const,
	agents: ["server-state", "agents"] as const,
	skills: ["server-state", "skills"] as const,
	commandHistory: ["server-state", "command-history"] as const,
	workspaceProjects: (workspaceId: string | null) =>
		["server-state", "workspace-projects", workspaceId] as const,
	projectBoard: (workspaceId: string | null, projectId: string | null) =>
		["server-state", "project-board", workspaceId, projectId] as const,
};

export const taskCreationMutationKeys = {
	createTask: ["task-creation", "create-task"] as const,
};

export function useTokenUsageQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<TokenUsageRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.tokenUsage,
		queryFn: () => apiClient.listTokenUsage(),
		enabled: options?.enabled,
	});
}

export function useJobsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<JobRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.jobs,
		queryFn: () => apiClient.listJobs(),
		enabled: options?.enabled,
	});
}

export function useAgentsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<AgentRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.agents,
		queryFn: () => apiClient.listAgents(),
		enabled: options?.enabled,
	});
}

export function useSkillsQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<SkillRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.skills,
		queryFn: () => apiClient.listSkills(),
		enabled: options?.enabled,
	});
}

export function useCommandHistoryQuery(
	options?: ServerStateQueryOptions,
): UseQueryResult<CommandHistoryRecord[], Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.commandHistory,
		queryFn: () => apiClient.listCommandHistory(),
		enabled: options?.enabled,
	});
}

export function useCreateTaskMutation(): UseMutationResult<
	TaskCreateResponse,
	Error,
	TaskCreateMutationInput
> {
	return useMutation({
		mutationKey: taskCreationMutationKeys.createTask,
		mutationFn: (input) =>
			apiClient.createTask({
				request: input.request,
				projectId: input.projectId,
				answers: input.answers,
			}),
	});
}
