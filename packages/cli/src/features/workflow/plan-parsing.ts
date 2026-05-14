import { parsePlannerSplitTasks } from "./plan-split-tasks";
import type { PlannerDecision } from "./plan.types";
import { extractMarkerJsonArray } from "./planner-json";

const DEFAULT_PLANNER_COMPLEXITY_SCORE = 4;

export function parsePlannerDecision(planSummary: string): PlannerDecision {
	const planningResult = parsePlannerResult(planSummary);
	if (planningResult === "NEEDS_INFO") {
		return {
			result: planningResult,
			questions: parsePlannerQuestions(planSummary),
		};
	}
	const successGoal = parsePlannerSuccessGoal(planSummary);
	const complexity = parsePlannerComplexity(planSummary);
	const complexityScore = parsePlannerComplexityScore(planSummary);
	if (complexity === "SIMPLE") {
		return {
			result: "READY",
			complexity,
			splitTasks: [],
			complexityScore,
			successGoal,
		};
	}
	return {
		result: "READY",
		complexity,
		splitTasks: parsePlannerSplitTasks(planSummary),
		complexityScore,
		successGoal,
	};
}

export function parsePlannerResult(
	planSummary: string,
): "READY" | "NEEDS_INFO" {
	const match = planSummary.match(
		/(?:^|\n)\s*PLANNING_RESULT\s*:\s*(READY|NEEDS_INFO)\s*(?:\n|$)/i,
	);
	if (!match?.[1]) {
		return "READY";
	}
	return match[1].toUpperCase() === "NEEDS_INFO" ? "NEEDS_INFO" : "READY";
}

export function parsePlannerQuestions(planSummary: string): string[] {
	const jsonText = extractMarkerJsonArray(planSummary, "QUESTIONS_JSON");
	if (!jsonText) {
		throw new Error("NEEDS_INFO planner output must include QUESTIONS_JSON.");
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonText);
	} catch (error) {
		throw new Error(
			`Failed to parse QUESTIONS_JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (!Array.isArray(parsed)) {
		throw new Error("QUESTIONS_JSON must be a JSON array.");
	}
	const questions = parsed
		.map((item, index) => {
			if (typeof item !== "string") {
				throw new Error(`QUESTIONS_JSON item ${index} must be a string.`);
			}
			return item.trim();
		})
		.filter(Boolean);
	if (questions.length === 0) {
		throw new Error("QUESTIONS_JSON must include at least one question.");
	}
	return questions;
}

export function parsePlannerSuccessGoal(planSummary: string): string {
	const match = planSummary.match(
		/(?:^|\n)\s*SUCCESS_GOAL\s*:\s*([^\n]+)\s*(?:\n|$)/i,
	);
	const successGoal = match?.[1]?.trim();
	if (!successGoal) {
		throw new Error(
			"Planner output must include SUCCESS_GOAL with a concise acceptance goal.",
		);
	}
	return successGoal;
}

export function parsePlannerComplexity(
	planSummary: string,
): "SIMPLE" | "COMPLEX" {
	const match = planSummary.match(
		/(?:^|\n)\s*COMPLEXITY\s*:\s*(SIMPLE|COMPLEX)\s*(?:\n|$)/i,
	);
	if (!match?.[1]) {
		return "SIMPLE";
	}
	return match[1].toUpperCase() === "COMPLEX" ? "COMPLEX" : "SIMPLE";
}

export function parsePlannerComplexityScore(planSummary: string): number {
	const match = planSummary.match(
		/(?:^|\n)\s*COMPLEXITY_SCORE\s*:\s*([^\n]+)\s*(?:\n|$)/i,
	);
	if (!match?.[1]) {
		return DEFAULT_PLANNER_COMPLEXITY_SCORE;
	}
	const rawScore = match[1].trim();
	if (!/^\d+$/.test(rawScore)) {
		throw new Error(
			`Invalid COMPLEXITY_SCORE '${rawScore}'. Expected an integer between 0 and 10.`,
		);
	}
	const score = Number(rawScore);
	if (!Number.isInteger(score) || score < 0 || score > 10) {
		throw new Error(
			`Invalid COMPLEXITY_SCORE '${rawScore}'. Expected an integer between 0 and 10.`,
		);
	}
	return score;
}
