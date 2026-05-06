import path from "node:path";
import type { DeepPartial, PivLoopRootConfig } from "./src/types";

const cwd = process.cwd();

const config: DeepPartial<PivLoopRootConfig> = {
	projects: [
		{
			id: "default",
			name: "Default Project",
			workspacePath: process.env.PIV_WORKSPACE_PATH ?? cwd,
		},
	],
	repo: {
		owner: process.env.GITHUB_REPO_OWNER ?? "",
		name: process.env.GITHUB_REPO_NAME ?? "",
		baseBranch: process.env.GITHUB_BASE_BRANCH ?? "main",
	},
	linear: {
		statusMap: {
			assigned: process.env.LINEAR_STATUS_ASSIGNED ?? "",
			planning: process.env.LINEAR_STATUS_PLANNING ?? "",
			implementing: process.env.LINEAR_STATUS_IMPLEMENTING ?? "",
			pr_created: process.env.LINEAR_STATUS_PR_CREATED ?? "",
			reviewing: process.env.LINEAR_STATUS_REVIEWING ?? "",
			testing: process.env.LINEAR_STATUS_TESTING ?? "",
			blocked: process.env.LINEAR_STATUS_BLOCKED ?? "",
			done: process.env.LINEAR_STATUS_DONE ?? "",
		},
	},
	skills: {
		plan: path.join(cwd, "skills", "piv-plan", "SKILL.md"),
		implement: path.join(cwd, "skills", "piv-implement", "SKILL.md"),
		reviewTest: path.join(cwd, "skills", "piv-review-test", "SKILL.md"),
	},
};

export default config;
