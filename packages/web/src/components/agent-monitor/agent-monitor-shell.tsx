"use client";

import { type ReactElement, useState } from "react";

import type { WorkflowTab } from "@/lib/agents/agent-monitor.types";
import { useAgentMonitor } from "@/lib/agents/use-agent-monitor";

import { AgentMonitorPanel } from "./agent-monitor-panel";

export function AgentMonitorShell(): ReactElement {
	const { health } = useAgentMonitor();
	const [activeWorkflowTab, setActiveWorkflowTab] =
		useState<WorkflowTab>("overview");
	const [showDetails, setShowDetails] = useState<boolean>(false);

	return (
		<AgentMonitorPanel
			health={health}
			activeWorkflowTab={activeWorkflowTab}
			showDetails={showDetails}
			onWorkflowTabChange={setActiveWorkflowTab}
			onToggleDetails={() => setShowDetails((value) => !value)}
		/>
	);
}
