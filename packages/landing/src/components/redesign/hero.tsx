import { ArrowRight, Play } from "lucide-react";
import type { ReactElement } from "react";

import { FloatingDecor } from "@/components/redesign/hero-illustrations";
import { ProductPreview } from "@/components/redesign/product-preview";

export function Hero(): ReactElement {
	return (
		<section className="relative overflow-hidden border-foreground border-b-2">
			<HeroBackdrop />
			<FloatingDecor />
			<div className="relative mx-auto max-w-7xl px-4 pt-16 pb-16 sm:px-6 md:pt-28 md:pb-28">
				<div className="mb-8 flex justify-center px-2">
					<a
						className="inline-flex max-w-full items-center gap-2 border-2 border-foreground bg-[var(--neon-yellow)] py-1 pr-3 pl-1 text-xs shadow-retro-sm"
						href="#start"
					>
						<span className="shrink-0 bg-foreground px-2 py-0.5 font-mono text-[var(--neon-yellow)] text-[10px]">
							NEW
						</span>
						<span className="truncate font-mono">v0.0.1 / early access</span>
						<ArrowRight className="h-3 w-3 shrink-0" />
					</a>
				</div>
				<h1 className="mx-auto max-w-4xl break-words text-center font-pixel text-[clamp(2.25rem,9vw,6rem)] uppercase leading-[0.95]">
					<span className="text-[var(--neon-pink)] text-glow-pink">
						Code is cheap,
					</span>
					<br />
					show me your
					<br />
					<span className="text-[var(--neon-cyan)] text-glow-cyan">
						agent system.
					</span>
				</h1>
				<p className="mx-auto mt-8 max-w-xl px-2 text-center text-base text-foreground/80 leading-relaxed sm:text-lg">
					devos.ing is the agentic workflow OS. Manage every task on a project
					board, watch your agents run the loop, and stay in sync from Telegram,
					wherever you are.
				</p>
				<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
					<a
						className="inline-flex items-center gap-2 border-2 border-foreground bg-[var(--neon-pink)] px-5 py-3 text-foreground shadow-retro transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_var(--foreground)]"
						href="#start"
					>
						RUN LOCALLY
						<ArrowRight className="h-4 w-4" />
					</a>
					<a
						className="inline-flex items-center gap-2 border-2 border-foreground bg-[var(--neon-cyan)] px-5 py-3 text-foreground shadow-retro transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_var(--foreground)]"
						href="#platform"
					>
						<Play className="h-3.5 w-3.5 fill-current" />
						WATCH DEMO
					</a>
				</div>
				<p className="mt-6 px-2 text-center font-mono text-foreground/60 text-xs">
					RUNS LOCALLY / YOUR MACHINE / YOUR KEYS
				</p>
				<div className="mt-16 sm:mt-20">
					<ProductPreview />
				</div>
			</div>
		</section>
	);
}

function HeroBackdrop(): ReactElement {
	return (
		<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
			<div
				className="-translate-x-1/2 absolute top-32 left-1/2 h-[640px] w-[640px] rounded-full blur-sm"
				style={{
					background:
						"radial-gradient(circle, var(--neon-yellow) 0%, var(--neon-pink) 45%, var(--neon-purple) 75%, transparent 80%)",
					opacity: 0.35,
				}}
			/>
			<div className="-translate-x-1/2 absolute top-[420px] left-1/2 flex w-[600px] flex-col gap-2 opacity-70">
				{[3, 5, 7, 10, 14, 20].map((height, index) => (
					<div
						key={height}
						style={{
							height,
							background: "var(--foreground)",
							opacity: 1 - index * 0.12,
						}}
					/>
				))}
			</div>
			<div className="absolute inset-0 scanlines opacity-50" />
		</div>
	);
}
