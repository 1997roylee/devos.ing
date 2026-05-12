import type { ReactElement } from "react";

import { DashboardNav } from "./dashboard-nav";
import type { DashboardNavItem } from "./dashboard.types";

const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [
	{
		id: "token-usage",
		label: "Token usage",
		description: "Monitor usage volume and burn trends.",
	},
	{
		id: "jobs",
		label: "Jobs",
		description: "Track run queue, status, and retries.",
	},
	{
		id: "agents",
		label: "Agents",
		description: "Inspect active agents and run ownership.",
	},
	{
		id: "skills",
		label: "Skills",
		description: "Review loaded skills and capability coverage.",
	},
];

export function DashboardShell(): ReactElement {
	return (
		<main className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight text-slate-950">
					Monitoring Dashboard
				</h1>
				<p className="max-w-2xl text-sm text-slate-600">
					Operational overview for token usage, jobs, agents, and skills.
				</p>
			</header>

			<DashboardNav activeId="token-usage" items={DASHBOARD_NAV_ITEMS} />

			<section
				aria-label="Dashboard panels"
				className="grid gap-4 md:grid-cols-2"
			>
				{DASHBOARD_NAV_ITEMS.map((item) => (
					<article
						className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
						id={item.id}
						key={item.id}
					>
						<h2 className="text-base font-medium text-slate-900">
							{item.label}
						</h2>
						<p className="mt-2 text-sm text-slate-600">{item.description}</p>
					</article>
				))}
			</section>
		</main>
	);
}
