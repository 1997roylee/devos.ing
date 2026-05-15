"use client";

import { type ReactElement, useState } from "react";

import type { WorkflowTab } from "@/lib/agents/agent-monitor.types";
import { useAgentMonitor } from "@/lib/agents/use-agent-monitor";
import {
	useAgentsQuery,
	useCreateAgentMutation,
	useDeleteAgentMutation,
	useUpdateAgentMutation,
} from "@/lib/api/queries";

import { AgentMonitorPanel } from "./agent-monitor-panel";

export function AgentMonitorShell(): ReactElement {
	const { health } = useAgentMonitor();
	const agentsQuery = useAgentsQuery();
	const createAgent = useCreateAgentMutation();
	const updateAgent = useUpdateAgentMutation();
	const deleteAgent = useDeleteAgentMutation();
	const [activeWorkflowTab, setActiveWorkflowTab] =
		useState<WorkflowTab>("overview");
	const [showDetails, setShowDetails] = useState<boolean>(false);

	return (
		<AgentMonitorPanel
			health={health}
			activeWorkflowTab={activeWorkflowTab}
			showDetails={showDetails}
			agents={agentsQuery.data ?? []}
			isAgentsLoading={agentsQuery.isPending}
			isSavingAgent={createAgent.isPending || updateAgent.isPending}
			isDeletingAgent={deleteAgent.isPending}
			onWorkflowTabChange={setActiveWorkflowTab}
			onToggleDetails={() => setShowDetails((value) => !value)}
			onSaveAgent={(agent) => {
				if (agentsQuery.data?.some((current) => current.id === agent.id)) {
					const { id, ...input } = agent;
					updateAgent.mutate({ id, input });
					return;
				}
				createAgent.mutate(agent);
			}}
			onDeleteAgent={(id) => deleteAgent.mutate(id)}
		/>
	);
}
