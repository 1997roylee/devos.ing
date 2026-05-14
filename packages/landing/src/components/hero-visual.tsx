"use client";

import { type ReactElement, useState } from "react";

const stages = [
	{
		label: "Linear",
		value: "ENG-123",
		status: "eligible",
		logs: ["ENG-123", "agent-ready", "core-platform"],
		contract: {
			result: "RESULT: PASS",
			bugs: 'BUGS_JSON: [{"risk":"rules"}]',
		},
	},
	{
		label: "Plan",
		value: "strategy",
		status: "ready",
		logs: ["docs loaded", "skill attached", "plan approved"],
		contract: {
			result: "RESULT: PASS",
			bugs: "BUGS_JSON: []",
		},
	},
	{
		label: "Implement",
		value: "worktree",
		status: "active",
		logs: ["codex/eng-123", "worktree clean", "PR synced"],
		contract: {
			result: "RESULT: ACTIVE",
			bugs: 'BUGS_JSON: [{"watch":"audit"}]',
		},
	},
	{
		label: "Review",
		value: "PASS",
		status: "verified",
		logs: ["check pass", "types pass", "tests pass"],
		contract: {
			result: "RESULT: PASS",
			bugs: "BUGS_JSON: []",
		},
	},
];

const defaultStageIndex = 2;

export function HeroVisual(): ReactElement {
	const [activeStageIndex, setActiveStageIndex] = useState(defaultStageIndex);
	const activeStage = stages[activeStageIndex] ?? stages[defaultStageIndex];

	return (
		<div className="relative mx-auto w-full max-w-3xl lg:mx-0">
			<div className="terminal-float absolute -left-5 top-8 hidden h-28 w-28 border-2 border-ink bg-copper/70 md:block" />
			<div className="terminal-float absolute -right-3 bottom-8 hidden h-20 w-20 border-2 border-ink bg-circuit md:block [animation-delay:900ms]" />
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
				<div className="grid gap-0 md:grid-cols-[0.82fr_1fr]">
					<div className="border-b-2 border-ink p-4 md:border-b-0 md:border-r-2">
						<p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-copper">
							Current issue
						</p>
						<h2 className="mt-3 text-balance font-display text-3xl leading-none sm:text-4xl md:text-3xl">
							Refactor billing events without losing audit history
						</h2>
						<div className="mt-5 grid gap-3">
							{stages.map((stage, index) => {
								const isActive = index === activeStageIndex;

								return (
									<button
										aria-pressed={isActive}
										className={`plan-card grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 border-2 border-ink p-3 text-left ${
											isActive
												? "bg-circuit shadow-[5px_5px_0_#10110d]"
												: "bg-paper"
										}`}
										key={stage.label}
										onFocus={() => setActiveStageIndex(index)}
										onMouseEnter={() => setActiveStageIndex(index)}
										type="button"
									>
										<span
											className={`h-3 w-3 border border-ink shadow-[2px_2px_0_#10110d] ${
												isActive ? "bg-ink" : "bg-circuit"
											}`}
										/>
										<div>
											<p className="font-mono text-[10px] font-black uppercase tracking-[0.18em]">
												{stage.label}
											</p>
											<p className="text-sm text-ink/70">{stage.value}</p>
										</div>
										<span className="border border-ink bg-bone px-2 py-1 font-mono text-[10px] uppercase">
											{stage.status}
										</span>
									</button>
								);
							})}
						</div>
					</div>
					<div className="terminal-panel relative overflow-hidden bg-oxide p-4 text-bone">
						<p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-circuit">
							Daemon trace
						</p>
						<div className="mt-5 min-h-28 space-y-3 font-mono text-sm">
							{activeStage.logs.map((log, index) => (
								<p
									className="trace-line border-l-2 border-circuit pl-3 text-bone/82"
									key={log}
									style={{ animationDelay: `${index * 85}ms` }}
								>
									<span className="text-circuit">0{index + 1}</span> {log}
								</p>
							))}
						</div>
						<div className="terminal-glow mt-8 border-2 border-circuit bg-ink p-4">
							<p className="font-mono text-sm leading-7">
								{activeStage.contract.result}
								<br />
								{activeStage.contract.bugs}
								<span className="terminal-cursor" aria-hidden="true" />
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
