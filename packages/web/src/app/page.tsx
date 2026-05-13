import type { ReactElement } from "react";

import { AgentMonitorShell } from "@/components/agent-monitor/agent-monitor-shell";

export default function HomePage(): ReactElement {
	return (
		<main
			style={{
				display: "grid",
				minHeight: "100vh",
				placeItems: "center",
				padding: "2rem",
			}}
		>
			<AgentMonitorShell />
		</main>
	);
}
