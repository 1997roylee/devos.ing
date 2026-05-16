"use client";

import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { serverStateQueryKeys } from "./queries";
import type { ServerStateQueryOptions } from "./queries.types";
import { isApiRequestError } from "./response-utils";
import type { TaskActivityResponse } from "./task-activity.types";
import { createWebApiClient } from "./web-client";

const apiClient = createWebApiClient();
const DEFAULT_POLL_INTERVAL_MS = 5000;

export function useTaskActivityQuery(
	taskId: string,
	options?: ServerStateQueryOptions,
): UseQueryResult<TaskActivityResponse, Error> {
	return useQuery({
		queryKey: serverStateQueryKeys.taskActivity(taskId),
		queryFn: () => apiClient.listTaskActivity(taskId),
		enabled: Boolean(taskId) && options?.enabled !== false,
		retry: (failureCount, error) =>
			!(isApiRequestError(error) && error.status === 404) && failureCount < 3,
		refetchInterval: options?.refetchIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
	});
}
