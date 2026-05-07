import { describe, expect, it } from "bun:test";
import type { LinearIssue } from "../src/core/types";
import {
	isIssueInConfiguredProject,
	sortIssuesByPriority,
} from "../src/services/linear";

function createIssue(
	identifier: string,
	priorityValue: number,
	priorityName: string,
	projectId?: string,
): LinearIssue {
	return {
		id: identifier,
		identifier,
		title: identifier,
		url: `https://linear.app/roy/issue/${identifier}`,
		projectId,
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

describe("isIssueInConfiguredProject", () => {
	it("accepts all issues when no project filter is configured", () => {
		expect(isIssueInConfiguredProject("proj_a", undefined)).toBe(true);
		expect(isIssueInConfiguredProject(undefined, undefined)).toBe(true);
	});

	it("accepts only matching project ids when filter is configured", () => {
		expect(isIssueInConfiguredProject("proj_a", "proj_a")).toBe(true);
		expect(isIssueInConfiguredProject("proj_b", "proj_a")).toBe(false);
		expect(isIssueInConfiguredProject(undefined, "proj_a")).toBe(false);
	});
});
