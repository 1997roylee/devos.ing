import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

import type { DashboardNavItem } from "./dashboard.types";

type Props = {
	items: readonly DashboardNavItem[];
	activeId: DashboardNavItem["id"];
};

export function DashboardNav({ items, activeId }: Props): ReactElement {
	return (
		<nav aria-label="Dashboard sections">
			<ul className="grid gap-2 p-0 sm:grid-cols-2">
				{items.map((item) => {
					const isActive = item.id === activeId;

					return (
						<li key={item.id} className="list-none">
							<a
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"block rounded-md border px-4 py-3 text-sm transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
									isActive
										? "border-slate-700 bg-slate-900 text-slate-50"
										: "border-slate-300 bg-white text-slate-900 hover:border-slate-400",
								)}
								href={`#${item.id}`}
							>
								<span className="block font-medium">{item.label}</span>
								<span
									className={cn(
										"mt-1 block text-xs",
										isActive ? "text-slate-200" : "text-slate-600",
									)}
								>
									{item.description}
								</span>
							</a>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
