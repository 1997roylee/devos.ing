"use client";

import type { ReactElement } from "react";

import type {
	AgentHealthViewModel,
	WorkflowTab,
} from "@/lib/agents/agent-monitor.types";

interface AgentMonitorPanelProps {
	health: AgentHealthViewModel;
	activeWorkflowTab: WorkflowTab;
	showDetails: boolean;
	onWorkflowTabChange: (tab: WorkflowTab) => void;
	onToggleDetails: () => void;
}

export function AgentMonitorPanel({
	health,
	activeWorkflowTab,
	showDetails,
	onWorkflowTabChange,
	onToggleDetails,
}: AgentMonitorPanelProps): ReactElement {
	return (
		<section style={{ maxWidth: "44rem", width: "100%" }}>
			<h1 style={{ margin: "0 0 0.75rem" }}>ADHD.ai Agent Monitor</h1>
			<p style={{ margin: "0 0 1rem", color: "#334155" }}>{health.summary}</p>
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
				<button
					type="button"
					onClick={() => onWorkflowTabChange("overview")}
					aria-pressed={activeWorkflowTab === "overview"}
				>
					Overview
				</button>
				<button
					type="button"
					onClick={() => onWorkflowTabChange("reviews")}
					aria-pressed={activeWorkflowTab === "reviews"}
				>
					Reviews
				</button>
				<button type="button" onClick={onToggleDetails}>
					{showDetails ? "Hide details" : "Show details"}
				</button>
			</div>
			<div style={{ color: "#0f172a" }}>
				<p style={{ margin: "0 0 0.5rem" }}>Server status: {health.status}</p>
				{showDetails ? (
					<p style={{ margin: 0 }}>
						Active workflow view: <strong>{activeWorkflowTab}</strong>
					</p>
				) : null}
			</div>
		</section>
	);
}
