import type { ReactElement } from "react";

import { navItems } from "@/lib/landing-content";

export function LandingHeader(): ReactElement {
	return (
		<header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/92 backdrop-blur">
			<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
				<a
					className="font-mono text-sm font-black uppercase tracking-[0.22em]"
					href="/"
				>
					devos.ing
				</a>
				<nav
					aria-label="Primary navigation"
					className="hidden items-center gap-7 font-mono text-xs font-bold uppercase md:flex"
				>
					{navItems.map((item) => (
						<a
							className="transition hover:text-copper"
							href={item.href}
							key={item.href}
						>
							{item.label}
						</a>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<a
						className="hidden border-2 border-ink px-3 py-2 font-mono text-xs font-black uppercase transition hover:bg-ink hover:text-bone sm:inline-flex"
						href="/README.md"
					>
						Docs
					</a>
					<a
						className="border-2 border-ink bg-circuit px-3 py-2 font-mono text-xs font-black uppercase shadow-[4px_4px_0_#10110d] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#10110d]"
						href="https://github.com/1997roylee/show-me-ur-agents"
					>
						GitHub
					</a>
				</div>
			</div>
		</header>
	);
}
