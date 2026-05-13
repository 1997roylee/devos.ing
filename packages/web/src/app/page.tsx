import type { ReactElement } from "react";

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
			<section style={{ maxWidth: "40rem", textAlign: "center" }}>
				<h1 style={{ marginBottom: "0.75rem" }}>devos.ing</h1>
				<p style={{ margin: "0 0 0.75rem", color: "#334155" }}>
					ADHD (Agentic Development Hub & Daemon) is an all-in-one workflow for
					managing agentic development and reducing human involvement.
				</p>
				<p style={{ margin: 0, color: "#475569" }}>
					Talk is cheap, show me your agent system.
				</p>
			</section>
		</main>
	);
}
