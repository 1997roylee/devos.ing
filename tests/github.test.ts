import { describe, expect, it, mock } from "bun:test";
import type { PullRequestRef, ResolvedProjectConfig } from "../src/core/types";
import {
	buildBugIssueBody,
	issueBranchName,
	markPrReadyForReview,
} from "../src/services/github";
import type { CommandResult } from "../src/utils/shell";

describe("buildBugIssueBody", () => {
	it("includes linear and optional pr links", () => {
		const body = buildBugIssueBody(
			"Failing test",
			"Stack trace here",
			"https://linear.app/acme/issue/ENG-1",
			"https://github.com/acme/repo/pull/10",
		);
		expect(body).toContain("Linear: https://linear.app/acme/issue/ENG-1");
		expect(body).toContain("PR: https://github.com/acme/repo/pull/10");
		expect(body).toContain("Stack trace here");
	});

	it("builds deterministic issue branch names", () => {
		expect(issueBranchName("ENG-42")).toBe("codex/eng-42");
	});
});

describe("markPrReadyForReview", () => {
	it("marks draft pull requests as ready", async () => {
		const calls: Array<{ command: string; args: string[] }> = [];
		const runCommand = mock(
			async (command: string, args: string[]): Promise<CommandResult> => {
				calls.push({ command, args });
				if (args[1] === "view") {
					return { code: 0, stdout: "true\n", stderr: "" };
				}
				return { code: 0, stdout: "", stderr: "" };
			},
		);
		const ready = await markPrReadyForReview(
			createProjectConfig(),
			createPullRequest(),
			{
				runCommand,
				assertCommandOk: () => {},
				ensureGhAuth: async () => {},
			},
		);

		expect(ready).toBe(true);
		expect(calls).toEqual([
			{
				command: "gh",
				args: [
					"pr",
					"view",
					"https://github.com/acme/repo/pull/42",
					"--json",
					"isDraft",
					"--jq",
					".isDraft",
				],
			},
			{
				command: "gh",
				args: ["pr", "ready", "https://github.com/acme/repo/pull/42"],
			},
		]);
	});

	it("no-ops when pull request is already ready", async () => {
		const calls: Array<{ command: string; args: string[] }> = [];
		const runCommand = mock(
			async (command: string, args: string[]): Promise<CommandResult> => {
				calls.push({ command, args });
				return { code: 0, stdout: "false\n", stderr: "" };
			},
		);
		const ready = await markPrReadyForReview(
			createProjectConfig(),
			createPullRequest(),
			{
				runCommand,
				assertCommandOk: () => {},
				ensureGhAuth: async () => {},
			},
		);

		expect(ready).toBe(false);
		expect(calls).toEqual([
			{
				command: "gh",
				args: [
					"pr",
					"view",
					"https://github.com/acme/repo/pull/42",
					"--json",
					"isDraft",
					"--jq",
					".isDraft",
				],
			},
		]);
	});

	it("does nothing in dry-run mode", async () => {
		const runCommand = mock(
			async (): Promise<CommandResult> => ({ code: 0, stdout: "", stderr: "" }),
		);
		const ready = await markPrReadyForReview(
			{ ...createProjectConfig(), dryRun: true },
			createPullRequest(),
			{
				runCommand,
				assertCommandOk: () => {},
				ensureGhAuth: async () => {},
			},
		);

		expect(ready).toBe(false);
		expect(runCommand).not.toHaveBeenCalled();
	});

	it("throws when no pull request target is available", async () => {
		await expect(
			markPrReadyForReview(createProjectConfig(), {
				branch: "codex/eng-1",
				title: "PR",
			}),
		).rejects.toThrow("PR URL or number is required to mark PR as ready");
	});
});

function createProjectConfig(): ResolvedProjectConfig {
	return {
		id: "default",
		name: "Default",
		workspacePath: "/tmp/workspace",
		executionPath: "/tmp/repo",
		repo: {
			owner: "acme",
			name: "repo",
			baseBranch: "main",
		},
		linear: {
			apiKey: "key",
			apiUrl: "https://api.linear.app/graphql",
			pollLimit: 10,
			statusMap: {
				assigned: "Todo",
				planning: "Planning",
				implementing: "Implementing",
				pr_created: "PR Created",
				reviewing: "Reviewing",
				testing: "Testing",
				blocked: "Blocked",
				done: "Done",
			},
			labelMap: {},
			autoCreateLabels: true,
		},
		github: {
			useGhCli: true,
			defaultBugLabel: "bug",
		},
		codex: {
			binary: "codex",
			streamLogs: false,
		},
		skills: {
			root: "/tmp/skills",
			plan: "/tmp/plan.md",
			implement: "/tmp/implement.md",
			reviewTest: "/tmp/review.md",
		},
		dryRun: false,
	};
}

function createPullRequest(): PullRequestRef {
	return {
		branch: "codex/eng-1",
		title: "PR",
		url: "https://github.com/acme/repo/pull/42",
	};
}
