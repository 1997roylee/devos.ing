"use client";

import { useAgentHealthQuery } from "./agent-monitor-query";
import type { AgentHealthViewModel } from "./agent-monitor.types";

interface UseAgentMonitorResult {
	health: AgentHealthViewModel;
}

function deriveHealthStatus(
	isPending: boolean,
	isError: boolean,
): AgentHealthViewModel["status"] {
	if (isPending) {
		return "loading";
	}

	if (isError) {
		return "error";
	}

	return "healthy";
}

function deriveHealthSummary(status: AgentHealthViewModel["status"]): string {
	switch (status) {
		case "loading":
			return "Loading latest server health...";
		case "error":
			return "Unable to fetch server health";
		case "healthy":
			return "Server health endpoint reports ok";
	}
}

export function useAgentMonitor(): UseAgentMonitorResult {
	const { isPending, isError } = useAgentHealthQuery();
	const status = deriveHealthStatus(isPending, isError);

	return {
		health: {
			status,
			summary: deriveHealthSummary(status),
		},
	};
}
