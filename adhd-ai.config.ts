import path from "node:path";
import type { AdhdAiRootConfig, DeepPartial } from "./src/types";

const cwd = process.cwd();

const config: DeepPartial<AdhdAiRootConfig> = {
	projects: [
		{
			id: "adhd-47ea7f022b5d",
			name: "Default Project",
		},
	],
	codex: {
		models: {
			plan: "gpt-5.5",
			implement: "gpt-5.3-codex",
			reviewTest: "gpt-5.3-codex",
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
