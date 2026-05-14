import type { ReactElement } from "react";

import { HeroVisual } from "@/components/hero-visual";
import type { SectionIntroProps } from "@/components/landing-sections.types";
import { faqs, features, workflowSteps } from "@/lib/landing-content";

export function HeroSection(): ReactElement {
	return (
		<section className="relative border-b-2 border-ink bg-paper px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
			<div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
				<div className="reveal">
					<p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-copper">
						Agentic Development Hub & Daemon
					</p>
					<h1 className="mt-6 max-w-4xl font-display text-6xl leading-[0.92] sm:text-7xl lg:text-8xl">
						devos.ing
					</h1>
					<p className="mt-6 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
						Talk is cheap, show me your agent system.
					</p>
					<p className="mt-6 max-w-xl text-lg leading-8 text-ink/76">
						Turn Linear issues into an agent-driven engineering workflow: plan,
						implement, review, test, and loop with operators still in control.
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<a
							className="border-2 border-ink bg-circuit px-5 py-4 text-center font-mono text-xs font-black uppercase tracking-[0.18em] shadow-[6px_6px_0_#10110d] transition hover:-translate-y-0.5"
							href="https://github.com/1997roylee/show-me-ur-agents"
						>
							Show the system
						</a>
						<a
							className="border-2 border-ink bg-bone px-5 py-4 text-center font-mono text-xs font-black uppercase tracking-[0.18em] transition hover:bg-ink hover:text-bone"
							href="/README.md"
						>
							bun run setup
						</a>
					</div>
				</div>
				<div className="reveal [animation-delay:140ms]">
					<HeroVisual />
				</div>
			</div>
		</section>
	);
}

export function HowItWorksSection(): ReactElement {
	return (
		<section
			className="border-b-2 border-ink bg-bone px-4 py-16 sm:px-6 lg:px-8"
			id="how"
		>
			<div className="mx-auto max-w-7xl">
				<SectionIntro
					kicker="How this works"
					title="A staged loop for real engineering work."
				/>
				<div className="mt-10 grid gap-4 md:grid-cols-4">
					{workflowSteps.map((step) => (
						<article
							className="border-2 border-ink bg-paper p-5"
							key={step.title}
						>
							<p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-copper">
								{step.kicker}
							</p>
							<h3 className="mt-5 font-display text-3xl leading-tight">
								{step.title}
							</h3>
							<p className="mt-4 text-sm leading-6 text-ink/72">{step.body}</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

export function FeatureSection(): ReactElement {
	return (
		<section
			className="border-b-2 border-ink bg-ink px-4 py-16 text-bone sm:px-6 lg:px-8"
			id="features"
		>
			<div className="mx-auto max-w-7xl">
				<SectionIntro
					kicker="Features"
					title="Built for repeatable agent operations."
					inverted
				/>
				<div className="mt-10 grid gap-px overflow-hidden border-2 border-bone/30 bg-bone/30 md:grid-cols-3">
					{features.map((feature) => (
						<article className="bg-ink p-6" key={feature.title}>
							<h3 className="font-display text-3xl leading-tight text-circuit">
								{feature.title}
							</h3>
							<p className="mt-4 leading-7 text-bone/74">{feature.body}</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

export function FaqSection(): ReactElement {
	return (
		<section className="bg-paper px-4 py-16 sm:px-6 lg:px-8" id="faq">
			<div className="mx-auto max-w-7xl">
				<SectionIntro kicker="FAQ" title="The useful answers first." />
				<div className="mt-10 grid gap-4 md:grid-cols-2">
					{faqs.map((faq) => (
						<details
							className="group border-2 border-ink bg-bone p-5"
							key={faq.question}
						>
							<summary className="cursor-pointer list-none font-display text-2xl leading-tight">
								<span>{faq.question}</span>
								<span className="float-right font-mono text-copper group-open:rotate-45">
									+
								</span>
							</summary>
							<p className="mt-4 leading-7 text-ink/72">{faq.answer}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

function SectionIntro({
	inverted = false,
	kicker,
	title,
}: SectionIntroProps): ReactElement {
	return (
		<div className="max-w-3xl">
			<p
				className={`font-mono text-xs font-black uppercase tracking-[0.24em] ${
					inverted ? "text-circuit" : "text-copper"
				}`}
			>
				{kicker}
			</p>
			<h2 className="mt-4 font-display text-5xl leading-none sm:text-6xl">
				{title}
			</h2>
		</div>
	);
}
