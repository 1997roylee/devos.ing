import { describe, expect, it } from "bun:test";
import { sortIssuesByPriority } from "../src/linear";
import type { LinearIssue } from "../src/types";

function createIssue(
	identifier: string,
	priorityValue: number,
	priorityName: string,
): LinearIssue {
	return {
		id: identifier,
		identifier,
		title: identifier,
		url: `https://linear.app/roy/issue/${identifier}`,
		priority: {
			value: priorityValue,
			name: priorityName,
		},
		state: {
			id: "state",
			name: "Todo",
		},
		labels: [],
	};
}

describe("sortIssuesByPriority", () => {
	it("sorts issues from urgent to no priority", () => {
		const issues = [
			createIssue("ROY-4", 4, "Low"),
			createIssue("ROY-0", 0, "No priority"),
			createIssue("ROY-2", 2, "High"),
			createIssue("ROY-1", 1, "Urgent"),
			createIssue("ROY-3", 3, "Medium"),
		];

		const sorted = sortIssuesByPriority(issues);
		expect(sorted.map((issue) => issue.identifier)).toEqual([
			"ROY-1",
			"ROY-2",
			"ROY-3",
			"ROY-4",
			"ROY-0",
		]);
	});

	it("keeps input order for issues with equal priority", () => {
		const issues = [
			createIssue("ROY-10", 2, "High"),
			createIssue("ROY-11", 2, "High"),
			createIssue("ROY-12", 2, "High"),
		];

		const sorted = sortIssuesByPriority(issues);
		expect(sorted.map((issue) => issue.identifier)).toEqual([
			"ROY-10",
			"ROY-11",
			"ROY-12",
		]);
	});
});
