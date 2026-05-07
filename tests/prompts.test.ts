import { describe, expect, it } from "bun:test";
import type { IssueRef, PullRequestRef } from "../src/core/types";
import { buildFixPrompt } from "../src/skills/prompts";

const issue: IssueRef = {
	id: "lin_123",
	key: "ENG-1",
	title: "Fix workflow loop",
	url: "https://linear.app/acme/issue/ENG-1/fix-workflow-loop",
};

const pr: PullRequestRef = {
	branch: "codex/eng-1",
	title: "[codex] ENG-1: Fix workflow loop",
	url: "https://github.com/acme/repo/pull/10",
};

describe("buildFixPrompt", () => {
	it("includes review feedback and bug JSON for retry implementation", async () => {
		const prompt = await buildFixPrompt(
			"/tmp/missing-skill-file.md",
			issue,
			"Update workflow stage transitions.",
			"Regression found in verify stage.",
			[{ title: "Bug A", body: "Implement retry behavior." }],
			pr,
		);

		expect(prompt).toContain(
			"This is a fix pass after review/testing found bugs.",
		);
		expect(prompt).toContain("Linear issue: ENG-1");
		expect(prompt).toContain("PR: https://github.com/acme/repo/pull/10");
		expect(prompt).toContain("Regression found in verify stage.");
		expect(prompt).toContain('"title": "Bug A"');
		expect(prompt).toContain(
			"Address every bug, update the existing branch/PR",
		);
	});
});
