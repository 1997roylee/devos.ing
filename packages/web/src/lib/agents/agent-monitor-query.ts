import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { type HealthResponse, createWebApiClient } from "@/lib/api";

const apiClient = createWebApiClient();

export const agentMonitorQueryKey = ["agent-monitor", "health"] as const;

export function useAgentHealthQuery(): UseQueryResult<HealthResponse, Error> {
	return useQuery({
		queryKey: agentMonitorQueryKey,
		queryFn: ({ signal }) => apiClient.getHealth({ signal }),
		refetchInterval: 30_000,
	});
}
