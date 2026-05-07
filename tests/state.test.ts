import { describe, expect, it } from "bun:test";
import { normalizeIssueKey, transitionStage } from "../src/core/state";
import type { RunState } from "../src/core/types";

describe("state helpers", () => {
	it("normalizes issue key from URL", () => {
		const key = normalizeIssueKey(
			"https://linear.app/acme/issue/ENG-321/task-name",
		);
		expect(key).toBe("ENG-321");
	});

	it("transitions stage", () => {
		const now = new Date().toISOString();
		const state: RunState = {
			projectId: "default",
			projectName: "Default",
			workspacePath: "/tmp/work",
			repository: {
				owner: "o",
				name: "n",
				baseBranch: "main",
			},
			issue: { id: "1", key: "ENG-1", title: "t", url: "u" },
			stage: "planning",
			bugs: [],
			startedAt: now,
			updatedAt: now,
		};
		const next = transitionStage(state, "implementing");
		expect(next.stage).toBe("implementing");
	});
});
