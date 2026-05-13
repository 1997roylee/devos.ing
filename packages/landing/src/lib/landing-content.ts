export const navItems = [
	{ href: "#how", label: "How it works" },
	{ href: "#features", label: "Features" },
	{ href: "#faq", label: "FAQ" },
];

export const workflowSteps = [
	{
		kicker: "01 / Route",
		title: "Pull eligible Linear work",
		body: "Project routing rules pick the right workspace, issue, and execution context before an agent starts touching code.",
	},
	{
		kicker: "02 / Plan",
		title: "Turn intent into a run plan",
		body: "The planning stage builds a scoped implementation strategy from issue context, project config, and selected skills.",
	},
	{
		kicker: "03 / Implement",
		title: "Ship changes into PR context",
		body: "The implementation agent works in the project workspace, updates code, and keeps pull request context synchronized.",
	},
	{
		kicker: "04 / Verify",
		title: "Review, test, and loop",
		body: "Structured review output feeds failures back into implementation until the run is done or clearly blocked.",
	},
];

export const features = [
	{
		title: "Auditable project routing",
		body: "Route issues across many repositories without hard-coding behavior to a single workspace.",
	},
	{
		title: "Linear-native status sync",
		body: "Comments, labels, status transitions, and issue state stay aligned with each workflow boundary.",
	},
	{
		title: "PR-aware implementation",
		body: "Agents preserve pull request context and can update draft PRs as review feedback arrives.",
	},
	{
		title: "Stable review contract",
		body: "Review parsing stays machine-readable with RESULT, SUMMARY, and BUGS_JSON outputs.",
	},
	{
		title: "Polling and scheduled sweeps",
		body: "Run one issue, poll for new work, or let server-owned cron automation sweep eligible queues.",
	},
	{
		title: "Operator control",
		body: "Humans can inspect stage, outcome, and risk while devos.ing handles the repetitive loop.",
	},
];

export const faqs = [
	{
		question: "What is devos.ing?",
		answer:
			"devos.ing is ADHD: Agentic Development Hub & Daemon. It turns Linear issues into staged agent workflows for planning, implementation, review, and testing.",
	},
	{
		question: "Does it replace engineers?",
		answer:
			"No. It removes repetitive coordination and execution loops while keeping operators in control of routing, review, and outcomes.",
	},
	{
		question: "Which tools does it work with?",
		answer:
			"The current workflow centers on Linear, GitHub pull requests, CLI execution, server cron jobs, and agent adapters for Codex and Claude Code.",
	},
	{
		question: "Can it run unattended?",
		answer:
			"Yes. It can run one scoped issue, poll locally, or use scheduled server-owned automation sweeps across configured projects.",
	},
	{
		question: "How does review stay reliable?",
		answer:
			"Review output follows a stable contract: RESULT, SUMMARY, and BUGS_JSON. Failures are fed back into implementation.",
	},
	{
		question: "Where is run state stored?",
		answer:
			"Run state is owned by the workflow layer inside the configured workspace, with safe recovery paths for partial runs.",
	},
];

export const footerGroups = [
	{
		title: "Product",
		links: [
			{ href: "#how", label: "How it works" },
			{ href: "#features", label: "Features" },
			{ href: "#faq", label: "FAQ" },
		],
	},
	{
		title: "Docs",
		links: [
			{ href: "/docs/PLANS.md", label: "Plans" },
			{ href: "/docs/RELIABILITY.md", label: "Reliability" },
			{ href: "/docs/SECURITY.md", label: "Security" },
		],
	},
	{
		title: "Start",
		links: [
			{ href: "/README.md", label: "Quick start" },
			{ href: "/ARCHITECTURE.md", label: "Architecture" },
			{
				href: "https://github.com/1997roylee/show-me-ur-agents",
				label: "GitHub",
			},
		],
	},
];
