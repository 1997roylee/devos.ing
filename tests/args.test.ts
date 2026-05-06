import { describe, expect, it } from "bun:test";
import { parseArgs } from "../src/args";

describe("parseArgs", () => {
	it("parses run command with issue", () => {
		const parsed = parseArgs(["bun", "piv-loop", "run", "--issue", "ABC-1"]);
		expect(parsed).toEqual({
			kind: "run",
			options: { issueArg: "ABC-1", projectId: undefined, allProjects: false },
		});
	});

	it("parses run with project", () => {
		const parsed = parseArgs(["bun", "piv-loop", "run", "--project", "api"]);
		expect(parsed).toEqual({
			kind: "run",
			options: { projectId: "api", allProjects: false },
		});
	});

	it("parses status command", () => {
		const parsed = parseArgs([
			"bun",
			"piv-loop",
			"status",
			"--project",
			"api",
			"--issue",
			"ABC-1",
		]);
		expect(parsed).toEqual({
			kind: "status",
			issueKey: "ABC-1",
			projectId: "api",
		});
	});
});
