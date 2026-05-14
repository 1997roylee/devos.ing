import type {
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunState,
} from "../../features/types";
import type { AgentAdapter } from "../../integrations/agent-adapters";
import {
	buildPlanComment,
	buildPlanNeedsInfoComment,
	buildPlanSplitComment,
} from "../../utils/comments";
import { selectPlanningSupplementalSkills } from "../skills/catalog";
import { buildPlanPrompt } from "../skills/prompts";
import { parsePlannerDecision } from "./plan-parsing";
import { applyPlannerIssueRefinement } from "./plan-refinement";
import type {
	HandlePlanningStageDeps,
	PlannerDecision,
	PlanningLinearClient,
} from "./plan.types";
import { loadRunState } from "./state";

export type {
	HandlePlanningStageDeps,
	PlannerDecision,
	PlannerIssueRefinement,
	PlanningLinearClient,
} from "./plan.types";

const DEFAULT_PLANNER_COMPLEXITY_SCORE = 4;
const HUMAN_REVIEW_COMPLEXITY_THRESHOLD = 5;
const DEFAULT_NEEDS_INFO_QUESTIONS = [
	"What outcome should this task accomplish, and how should review/testing verify it?",
];

export async function handlePlanningStage(
	config: ResolvedProjectConfig,
	agent: AgentAdapter,
	notifications: ResolvedNotificationConfig,
	linear: PlanningLinearClient,
	state: RunState,
	deps: HandlePlanningStageDeps,
): Promise<void> {
	deps.loggerInfo(
		deps.buildIssueJobLogFields(state, "planning"),
		"Planning issue",
	);
	const supplemental = await selectPlanningSupplementalSkills(
		config,
		state.issue,
	);
	const prompt = await buildPlanPrompt(config.skills.plan, state.issue, {
		supplementalSkills: supplemental.selected,
		autoSelectWarnings: supplemental.warnings,
	});
	const parentSessionId = await resolveParentPlanningSessionId(
		config.workspacePath,
		config.id,
		state,
	);
	let result = await deps.runAgentWithChatLog({
		workspacePath: config.workspacePath,
		projectId: config.id,
		issue: state.issue,
		agentRole: "planning",
		skillPath: config.skills.plan,
		prompt,
		invoke: () =>
			parentSessionId
				? agent.resume(parentSessionId, prompt)
				: agent.runPlan(prompt),
	});
	state.codexSessionId = result.sessionId ?? state.codexSessionId;
	state.planSummary = result.finalMessage || result.stdout;
	deps.appendCodexUsage(state, "planning", result.usage);
	await applyPlannerIssueRefinement(linear, state.issue, state.planSummary);

	let parsedPlan: PlannerDecision;
	try {
		parsedPlan = parsePlannerDecision(state.planSummary);
	} catch (error) {
		if (!shouldRetryMalformedPlannerOutput(state.planSummary)) {
			throw error;
		}
		const repairPrompt = buildPlannerRepairPrompt(prompt, state.planSummary);
		const resumeSessionId = result.sessionId ?? parentSessionId;
		result = await deps.runAgentWithChatLog({
			workspacePath: config.workspacePath,
			projectId: config.id,
			issue: state.issue,
			agentRole: "planning",
			skillPath: config.skills.plan,
			prompt: repairPrompt,
			invoke: () =>
				resumeSessionId
					? agent.resume(resumeSessionId, repairPrompt)
					: agent.runPlan(repairPrompt),
		});
		state.codexSessionId = result.sessionId ?? state.codexSessionId;
		state.planSummary = result.finalMessage || result.stdout;
		deps.appendCodexUsage(state, "planning", result.usage);
		await applyPlannerIssueRefinement(linear, state.issue, state.planSummary);
		try {
			parsedPlan = parsePlannerDecision(state.planSummary);
		} catch (retryError) {
			if (!shouldRetryMalformedPlannerOutput(state.planSummary)) {
				throw retryError;
			}
			parsedPlan = {
				result: "NEEDS_INFO",
				questions: DEFAULT_NEEDS_INFO_QUESTIONS,
			};
		}
	}
	if (parsedPlan.result === "NEEDS_INFO") {
		state.successGoal = undefined;
		state.complexityScore = undefined;
		state.reviewMode = undefined;
		state.planningNeedsInfoQuestions = parsedPlan.questions;
		state.failedStage = "planning";
		state.lastError = "Planning needs clarification before implementation.";
		Object.assign(state, deps.transitionStage(state, "blocked"));
		await deps.saveRunState(config.workspacePath, state);
		await linear.markStage(state.issue.id, "backlog");
		await linear.clearWorkflowStageLabels(state.issue.id);
		await linear.comment(
			state.issue.id,
			buildPlanNeedsInfoComment({
				issueKey: state.issue.key,
				questions: parsedPlan.questions,
				usage: result.usage,
			}),
		);
		await deps.safeNotifyTaskOutcome(
			notifications,
			state,
			"blocked",
			state.lastError,
		);
		deps.loggerInfo(
			deps.buildIssueJobLogFields(state, "planning"),
			"Plan needs clarification",
		);
		return;
	}
	state.successGoal = parsedPlan.successGoal;
	state.planningNeedsInfoQuestions = undefined;
	state.complexityScore = parsedPlan.complexityScore;
	state.reviewMode = resolveReviewModeForComplexityScore(
		parsedPlan.complexityScore,
	);
	if (parsedPlan.complexity === "SIMPLE") {
		Object.assign(state, deps.transitionStage(state, "implementing"));
		await deps.saveRunState(config.workspacePath, state);
		await linear.markStage(state.issue.id, "implementing");
		await linear.comment(
			state.issue.id,
			buildPlanComment(state.issue.key, state.planSummary, result.usage),
		);
		deps.loggerInfo(
			deps.buildIssueJobLogFields(state, "planning"),
			"Plan completed",
		);
		return;
	}

	const createdTasks = [];
	for (const task of parsedPlan.splitTasks) {
		const created = await linear.createTodoIssueFromPlan(state.issue, task);
		createdTasks.push({
			title: created.title,
			issueKey: created.identifier,
			issueUrl: created.url,
		});
	}
	state.splitTasks = createdTasks;
	Object.assign(state, deps.transitionStage(state, "done"));
	await deps.saveRunState(config.workspacePath, state);
	await linear.markStage(state.issue.id, "backlog");
	await linear.clearWorkflowStageLabels(state.issue.id);
	await linear.comment(
		state.issue.id,
		buildPlanSplitComment(state.issue.key, state.planSummary, createdTasks, {
			usage: result.usage,
		}),
	);
	await deps.safeNotifyTaskOutcome(notifications, state, "done");
	deps.loggerInfo(
		deps.buildIssueJobLogFields(state, "planning"),
		"Plan completed",
	);
}

export async function resolveParentPlanningSessionId(
	workspacePath: string,
	projectId: string,
	state: RunState,
): Promise<string | undefined> {
	const parentIssueKey = state.issue.parentIssue?.key;
	if (!parentIssueKey) {
		return undefined;
	}
	const parentState = await loadRunState(
		workspacePath,
		projectId,
		parentIssueKey,
	);
	return parentState?.codexSessionId;
}

export function resolveReviewModeForComplexityScore(
	complexityScore: number,
): "bot" | "human" {
	return complexityScore < HUMAN_REVIEW_COMPLEXITY_THRESHOLD ? "bot" : "human";
}

export function shouldSquashMergePullRequestForComplexityScore(
	complexityScore: number,
): boolean {
	return complexityScore < HUMAN_REVIEW_COMPLEXITY_THRESHOLD;
}

function shouldRetryMalformedPlannerOutput(planSummary: string): boolean {
	return (
		!/(?:^|\n)\s*PLANNING_RESULT\s*:\s*(READY|NEEDS_INFO)\s*(?:\n|$)/i.test(
			planSummary,
		) && !/(?:^|\n)\s*SUCCESS_GOAL\s*:\s*[^\n]+\s*(?:\n|$)/i.test(planSummary)
	);
}

function buildPlannerRepairPrompt(
	originalPrompt: string,
	malformedOutput: string,
): string {
	return [
		originalPrompt,
		"",
		"The previous planning response did not follow the required routing contract.",
		"Return only one corrected final planning response using exactly one of:",
		"- PLANNING_RESULT: READY with SUCCESS_GOAL, COMPLEXITY, COMPLEXITY_SCORE, and ISSUE_REFINEMENT_JSON.",
		"- PLANNING_RESULT: NEEDS_INFO with QUESTIONS_JSON when no concise acceptance goal can be stated safely.",
		"Do not invent a success goal when the requirements are unclear.",
		"",
		"Previous malformed response:",
		malformedOutput.trim() || "(empty)",
	].join("\n");
}
