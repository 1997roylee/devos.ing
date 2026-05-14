import type { ReactElement } from "react";

import { AgentMonitorShell } from "@/components/agent-monitor/agent-monitor-shell";
import { TaskCreatePanel } from "@/components/task-create/task-create-panel";

export default function HomePage(): ReactElement {
	return (
		<main
			style={{
				display: "grid",
				minHeight: "100vh",
				padding: "2rem",
				alignItems: "start",
			}}
		>
			<div
				style={{
					width: "100%",
					maxWidth: "70rem",
					margin: "0 auto",
					display: "grid",
					gap: "1rem",
					gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
				}}
			>
				<TaskCreatePanel />
				<AgentMonitorShell />
			</div>
		</main>
	);
}
