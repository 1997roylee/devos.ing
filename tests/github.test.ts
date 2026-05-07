import { describe, expect, it } from "bun:test";
import { buildBugIssueBody } from "../src/services/github";

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
});
