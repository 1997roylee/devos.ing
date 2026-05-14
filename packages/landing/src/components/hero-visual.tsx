import type { ReactElement } from "react";

const stages = [
	{ label: "Linear", value: "ENG-123", status: "eligible" },
	{ label: "Plan", value: "strategy", status: "ready" },
	{ label: "Implement", value: "worktree", status: "active" },
	{ label: "Review", value: "PASS", status: "verified" },
];

const logs = [
	"route project: core-platform",
	"attach skill: piv-implement",
	"create draft PR: codex/eng-123",
	"RESULT: PASS",
];

export function HeroVisual(): ReactElement {
	return (
		<div className="relative mx-auto w-full max-w-2xl lg:mx-0">
			<div className="absolute -left-5 top-8 hidden h-28 w-28 border-2 border-ink bg-copper/70 md:block" />
			<div className="absolute -right-3 bottom-8 hidden h-20 w-20 border-2 border-ink bg-circuit md:block" />
			<section className="relative border-2 border-ink bg-bone shadow-hard-ink">
				<div className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-3 text-bone">
					<div className="flex items-center gap-2">
						<span className="h-3 w-3 bg-circuit" />
						<span className="h-3 w-3 bg-copper" />
						<span className="h-3 w-3 bg-bone" />
					</div>
					<p className="font-mono text-[11px] font-black uppercase tracking-[0.22em]">
						run console
					</p>
				</div>
				<div className="grid gap-0 md:grid-cols-[1fr_0.82fr]">
					<div className="border-b-2 border-ink p-4 md:border-b-0 md:border-r-2">
						<p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-copper">
							Current issue
						</p>
						<h2 className="mt-3 font-display text-3xl leading-none">
							Refactor billing events without losing audit history
						</h2>
						<div className="mt-5 grid gap-3">
							{stages.map((stage) => (
								<div
									className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-2 border-ink bg-paper p-3"
									key={stage.label}
								>
									<span className="h-3 w-3 bg-circuit shadow-[2px_2px_0_#10110d]" />
									<div>
										<p className="font-mono text-[10px] font-black uppercase tracking-[0.18em]">
											{stage.label}
										</p>
										<p className="text-sm text-ink/70">{stage.value}</p>
									</div>
									<span className="border border-ink bg-bone px-2 py-1 font-mono text-[10px] uppercase">
										{stage.status}
									</span>
								</div>
							))}
						</div>
					</div>
					<div className="bg-oxide p-4 text-bone">
						<p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-circuit">
							Daemon trace
						</p>
						<div className="mt-5 space-y-3 font-mono text-xs">
							{logs.map((log, index) => (
								<p
									className="border-l-2 border-circuit pl-3 text-bone/82"
									key={log}
								>
									<span className="text-circuit">0{index + 1}</span> {log}
								</p>
							))}
						</div>
						<div className="mt-8 border-2 border-circuit bg-ink p-4">
							<p className="font-mono text-[10px] uppercase tracking-[0.2em] text-circuit">
								Review contract
							</p>
							<p className="mt-3 font-mono text-sm leading-7">
								RESULT: PASS
								<br />
								SUMMARY: ready for merge
								<br />
								BUGS_JSON: []
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
