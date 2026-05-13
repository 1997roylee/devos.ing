import { describe, expect, it } from "bun:test";
import type { ResolvedProjectConfig, RunState } from "../src/features/types";
import {
	MAX_AUTOMATED_REVIEW_FIX_PASSES,
	handleReviewTestingStage,
} from "../src/features/workflow/review-stage";

function createConfig(): ResolvedProjectConfig {
	return {
		id: "default",
		name: "Default",
		workspacePath: "/tmp/work",
		executionPath: "/tmp/work/repo",
		repo: { owner: "acme", name: "repo", baseBranch: "main" },
		linear: {
			apiKey: "x",
			apiUrl: "https://api.linear.app/graphql",
			pollLimit: 10,
			statusMap: {
				backlog: "backlog",
				assigned: "assigned",
				planning: "planning",
				implementing: "implementing",
				pr_created: "pr_created",
				reviewing: "reviewing",
				testing: "testing",
				blocked: "blocked",
				done: "done",
			},
			labelMap: {},
			autoCreateLabels: true,
		},
		github: { useGhCli: true, defaultBugLabel: "bug" },
		server: { database: { databasePath: "/tmp/adhdai.sqlite" } },
		codex: { binary: "codex", streamLogs: false },
		agent: {},
		workflow: { issueConcurrency: 1 },
		skills: {
			root: "/tmp/skills",
			plan: "/tmp/skills/piv-plan/SKILL.md",
			implement: "/tmp/skills/piv-implement/SKILL.md",
			reviewTest: "/tmp/skills/piv-review-test/SKILL.md",
			githubComment: "/tmp/skills/piv-github-comment/SKILL.md",
		},
		dryRun: false,
	};
}

function createState(fixPasses: number): RunState {
	const now = new Date().toISOString();
	return {
		projectId: "default",
		projectName: "Default",
		workspacePath: "/tmp/work",
		repository: { owner: "acme", name: "repo", baseBranch: "main" },
		issue: {
			id: "lin_1",
			key: "ENG-1",
			title: "Retry cap",
			url: "https://linear.app/acme/issue/ENG-1/retry-cap",
		},
		stage: "reviewing",
		codexSessionId: "implement-session",
		automatedReviewFixPasses: fixPasses,
		successGoal: "Stop automated fixes after three passes.",
		planSummary: "Add a retry cap.",
		pullRequest: {
			branch: "codex/eng-1",
			title: "[codex] ENG-1: Retry cap",
			url: "https://github.com/acme/repo/pull/10",
		},
		bugs: [],
		startedAt: now,
		updatedAt: now,
	};
}

async function runFailedReview(state: RunState) {
	const linearComments: string[] = [];
	const prComments: string[] = [];
	const humanReasons: string[] = [];

	await handleReviewTestingStage(
		createConfig(),
		{
			runPlan: async () => ({ finalMessage: "", stdout: "" }),
			runTaskIntake: async () => ({ finalMessage: "", stdout: "" }),
			resume: async () => ({ finalMessage: "", stdout: "" }),
			runReview: async () => ({
				finalMessage:
					'RESULT: FAIL\nSUMMARY: Still broken.\nBUGS_JSON: [{"title":"Bug A","body":"Fix it."}]',
				stdout: "",
			}),
			runGithubComment: async () => ({
				finalMessage: "Generated review failure comment",
				stdout: "",
			}),
		},
		{
			markStage: async () => {},
			applyStageLabel: async () => {},
			clearWorkflowStageLabels: async () => {},
			comment: async (_issueId, body) => {
				linearComments.push(body);
			},
		},
		state,
		{
			runAgentWithChatLog: async (input) => input.invoke(),
			appendCodexUsage: () => {},
			transitionStage: (current, to) => ({ ...current, stage: to }),
			saveRunState: async () => {},
			safePrComment: async (_config, _state, body) => {
				prComments.push(body);
			},
			safeNotifyHumanReviewRequired: async (_state, reason) => {
				humanReasons.push(reason);
			},
			loggerInfo: () => {},
			buildIssueJobLogFields: () => ({}),
		},
	);

	return { humanReasons, linearComments, prComments };
}

describe("review/testing retry cap", () => {
	it("returns the first three failed review passes to implementation", async () => {
		for (const usedPasses of [0, 1, 2]) {
			const state = createState(usedPasses);

			await runFailedReview(state);

			expect(state.stage).toBe("implementing");
			expect(state.automatedReviewFixPasses).toBe(usedPasses + 1);
		}
	});

	it("routes the fourth failed review to human review", async () => {
		const state = createState(MAX_AUTOMATED_REVIEW_FIX_PASSES);

		const result = await runFailedReview(state);

		expect(state.stage).toBe("human_review");
		expect(state.automatedReviewFixPasses).toBe(
			MAX_AUTOMATED_REVIEW_FIX_PASSES,
		);
		expect(state.humanReviewNotifiedAt).toBeDefined();
		expect(result.humanReasons).toEqual([
			"Review/testing failed after 3 automated fix passes.",
		]);
		expect(result.linearComments.join("\n")).toContain(
			"Parked for human review",
		);
		expect(result.prComments.join("\n")).toContain(
			"Review/testing failed after 3 automated fix passes.",
		);
	});
});
