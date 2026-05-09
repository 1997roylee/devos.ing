import path from "node:path";
import type { AdhdAiRootConfig, DeepPartial } from "./src/core/types";

const cwd = process.cwd();

const config: DeepPartial<AdhdAiRootConfig> = {
	automations: {
		jobs: [
			{
				id: "hourly-pr-review",
				name: "Hourly PR Review",
				schedule: { frequency: "hourly", every: 1, minute: 0 },
				run: { allProjects: true, reviewOnly: true },
			},
			{
				id: "daily-codebase-maintenance",
				name: "Daily Codebase Maintenance",
				schedule: { frequency: "daily", time: "09:00" },
				run: {
					allProjects: true,
					poll: true,
					maxPollCycles: 1,
					exitWhenIdle: true,
				},
			},
		],
	},
	projects: [
		{
			id: "adhd-47ea7f022b5d",
			name: "Default Project",
		},
	],
	codex: {
		reasoningEfforts: {
			plan: "low",
		},
		models: {
			plan: "gpt-5.5",
			implement: "gpt-5.3-codex",
			reviewTest: "gpt-5.5",
		},
		plugins: ["github@openai-curated", "linear@openai-curated"],
		skillsets: ["adhd-ai"],
		configOverrides: {
			"features.codex_hooks": "true",
		},
	},
	skills: {
		plan: path.join(cwd, "skills", "piv-plan", "SKILL.md"),
		implement: path.join(cwd, "skills", "piv-implement", "SKILL.md"),
		reviewTest: path.join(cwd, "skills", "piv-review-test", "SKILL.md"),
	},
};

export default config;
