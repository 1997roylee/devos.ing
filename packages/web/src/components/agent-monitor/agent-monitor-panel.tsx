"use client";

import { type ReactElement, useEffect, useMemo, useState } from "react";

import type {
	AgentHealthViewModel,
	WorkflowTab,
} from "@/lib/agents/agent-monitor.types";
import type { AgentCreateRequest, AgentRecord } from "@/lib/api";

import { AgentMonitorSkeleton } from "./agent-monitor-skeleton";
import { AgentProfileEditor } from "./agent-profile-editor";

interface AgentMonitorPanelProps {
	health: AgentHealthViewModel;
	activeWorkflowTab: WorkflowTab;
	showDetails: boolean;
	agents: AgentRecord[];
	isAgentsLoading: boolean;
	isSavingAgent: boolean;
	isDeletingAgent: boolean;
	onWorkflowTabChange: (tab: WorkflowTab) => void;
	onToggleDetails: () => void;
	onSaveAgent: (agent: AgentCreateRequest) => void;
	onDeleteAgent: (id: string) => void;
}

export function AgentMonitorPanel({
	health,
	activeWorkflowTab,
	showDetails,
	agents,
	isAgentsLoading,
	isSavingAgent,
	isDeletingAgent,
	onWorkflowTabChange,
	onToggleDetails,
	onSaveAgent,
	onDeleteAgent,
}: AgentMonitorPanelProps): ReactElement {
	const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
	const selectedAgent = useMemo(
		() => agents.find((agent) => agent.id === selectedAgentId) ?? null,
		[agents, selectedAgentId],
	);

	useEffect(() => {
		if (!selectedAgentId && agents[0]) {
			setSelectedAgentId(agents[0].id);
		}
	}, [agents, selectedAgentId]);

	if (health.status === "loading") {
		return <AgentMonitorSkeleton />;
	}

	return (
		<section style={{ display: "grid", gap: "1rem", width: "100%" }}>
			<h1 style={{ margin: "0 0 0.75rem" }}>ADHD.ai Agent Monitor</h1>
			<p style={{ margin: "0 0 1rem", color: "#a1a1aa" }}>{health.summary}</p>
			<div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
				<button
					type="button"
					onClick={() => onWorkflowTabChange("overview")}
					aria-pressed={activeWorkflowTab === "overview"}
					style={buttonStyle}
				>
					Overview
				</button>
				<button
					type="button"
					onClick={() => onWorkflowTabChange("reviews")}
					aria-pressed={activeWorkflowTab === "reviews"}
					style={buttonStyle}
				>
					Reviews
				</button>
				<button type="button" onClick={onToggleDetails} style={buttonStyle}>
					{showDetails ? "Hide details" : "Show details"}
				</button>
				<button
					type="button"
					onClick={() => setSelectedAgentId(null)}
					style={buttonStyle}
				>
					New Agent
				</button>
			</div>
			<div style={{ color: "#e4e4e7" }}>
				<p style={{ margin: "0 0 0.5rem" }}>Server status: {health.status}</p>
				{showDetails ? (
					<p style={{ margin: 0 }}>
						Active workflow view: <strong>{activeWorkflowTab}</strong>
					</p>
				) : null}
			</div>
			<div style={workspaceStyle}>
				<div style={listStyle}>
					<h2 style={subheadingStyle}>Profiles</h2>
					{isAgentsLoading ? (
						<p style={mutedStyle}>Loading agents</p>
					) : agents.length === 0 ? (
						<p style={mutedStyle}>No database-backed agents yet</p>
					) : (
						agents.map((agent) => (
							<button
								key={agent.id}
								type="button"
								onClick={() => setSelectedAgentId(agent.id)}
								aria-pressed={selectedAgentId === agent.id}
								style={agentButtonStyle}
							>
								<strong>{agent.title}</strong>
								<span style={mutedStyle}>
									{agent.runtime} / {agent.model}
								</span>
							</button>
						))
					)}
				</div>
				<AgentProfileEditor
					agent={selectedAgent}
					onSave={onSaveAgent}
					onDelete={onDeleteAgent}
					isSaving={isSavingAgent}
					isDeleting={isDeletingAgent}
				/>
			</div>
		</section>
	);
}

const buttonStyle = {
	border: "1px solid #3f3f46",
	borderRadius: "6px",
	background: "#27272a",
	color: "#f4f4f5",
	cursor: "pointer",
	padding: "0.5rem 0.75rem",
} as const;
const workspaceStyle = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
	gap: "1rem",
	alignItems: "start",
} as const;
const listStyle = {
	border: "1px solid #27272a",
	borderRadius: "8px",
	background: "#18191d",
	padding: "1rem",
	display: "grid",
	gap: "0.6rem",
} as const;
const subheadingStyle = { margin: 0, fontSize: "1rem" } as const;
const mutedStyle = { margin: 0, color: "#a1a1aa" } as const;
const agentButtonStyle = {
	border: "1px solid #3f3f46",
	borderRadius: "6px",
	background: "#0f1013",
	color: "#f4f4f5",
	cursor: "pointer",
	padding: "0.65rem",
	display: "grid",
	gap: "0.2rem",
	textAlign: "left",
} as const;
