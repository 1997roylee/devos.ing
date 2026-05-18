import { emitWorkflowProgress } from "../server/workflow-progress";
import type { AgentChatLogRole, PlannedSplitTask, RunState } from "../types";

const PLAN_HEADINGS = [
	"Title",
	"Summary",
	"Key Changes",
	"Checkpoints (Steps)",
	"Test plan",
	"Assumptions",
];

export function emitStageProgress(
	state: RunState,
	stage: string,
	status: "started" | "succeeded" | "failed" | "blocked",
	summary?: string,
): void {
	emitWorkflowProgress({
		kind: "stage",
		projectId: state.projectId,
		issueKey: state.issue.key,
		stage,
		status,
		...(summary ? { summary } : {}),
	});
}

export function emitActionProgress(
	state: RunState,
	stage: string,
	action: string,
	status: "started" | "succeeded" | "failed" | "blocked",
	input?: { agentRole?: AgentChatLogRole; detail?: string; error?: string },
): void {
	emitWorkflowProgress({
		kind: "action",
		projectId: state.projectId,
		issueKey: state.issue.key,
		stage,
		action,
		status,
		...(input?.agentRole ? { agentRole: input.agentRole } : {}),
		...(input?.detail ? { detail: input.detail } : {}),
		...(input?.error ? { error: input.error } : {}),
	});
}

export function emitPlanningSummaryProgress(
	state: RunState,
	input: { planSummary: string; splitTasks?: PlannedSplitTask[] },
): void {
	const checkpoints = extractPlanSectionItems(
		input.planSummary,
		"Checkpoints (Steps)",
	);
	const testPlan = extractPlanSectionItems(input.planSummary, "Test plan");
	emitWorkflowProgress({
		kind: "summary",
		projectId: state.projectId,
		issueKey: state.issue.key,
		stage: "planning",
		summary: trimSummary(input.planSummary),
		successGoal: state.successGoal,
		checkpoints,
		testPlan,
		splitTasks: input.splitTasks ?? [],
	});
	for (const title of checkpoints) {
		emitWorkflowProgress({
			kind: "checkpoint",
			projectId: state.projectId,
			issueKey: state.issue.key,
			stage: "planning",
			title,
			status: "pending",
		});
	}
}

export function extractPlanSectionItems(
	planSummary: string,
	heading: string,
): string[] {
	const section = extractPlanSection(planSummary, heading);
	return section
		.split("\n")
		.map((line) =>
			line
				.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "")
				.replace(/\s+/g, " ")
				.trim(),
		)
		.filter(Boolean);
}

function extractPlanSection(planSummary: string, heading: string): string {
	const lines = planSummary.split(/\r?\n/);
	const start = lines.findIndex((line) => normalizeHeading(line) === heading);
	if (start < 0) {
		return "";
	}
	const collected: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (PLAN_HEADINGS.includes(normalizeHeading(line))) {
			break;
		}
		collected.push(line);
	}
	return collected.join("\n").trim();
}

function normalizeHeading(line: string): string {
	return line
		.replace(/^#+\s*/, "")
		.replace(/:$/, "")
		.trim();
}

function trimSummary(planSummary: string): string {
	const trimmed = planSummary.replace(/\s+/g, " ").trim();
	return trimmed.length > 500 ? `${trimmed.slice(0, 497)}...` : trimmed;
}
