import type { IssueRef } from "../../features/types";
import type {
	PlannerIssueRefinement,
	PlanningLinearClient,
} from "./plan.types";
import { extractFirstJsonObject, unwrapFencedCodeBlock } from "./planner-json";

export function parsePlannerIssueRefinement(
	planSummary: string,
): PlannerIssueRefinement | null {
	const marker = /\bISSUE_REFINEMENT_JSON\s*:/i;
	const markerMatch = marker.exec(planSummary);
	if (!markerMatch) {
		return null;
	}
	const markerStart = markerMatch.index + markerMatch[0].length;
	const rawPayload = planSummary.slice(markerStart).trim();
	if (!rawPayload) {
		throw new Error(
			"Planner included ISSUE_REFINEMENT_JSON marker but no JSON payload.",
		);
	}
	const jsonSource = unwrapFencedCodeBlock(rawPayload);
	const jsonObjectText = extractFirstJsonObject(jsonSource);
	if (!jsonObjectText) {
		throw new Error(
			"ISSUE_REFINEMENT_JSON must contain a JSON object with title and description.",
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonObjectText);
	} catch (error) {
		throw new Error(
			`Failed to parse ISSUE_REFINEMENT_JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("ISSUE_REFINEMENT_JSON must be a JSON object.");
	}
	const record = parsed as Record<string, unknown>;
	const title =
		typeof record.title === "string" ? record.title.trim() : undefined;
	const description =
		typeof record.description === "string"
			? record.description.trim()
			: undefined;
	if (!title) {
		throw new Error("ISSUE_REFINEMENT_JSON.title must be a non-empty string.");
	}
	if (!description) {
		throw new Error(
			"ISSUE_REFINEMENT_JSON.description must be a non-empty string.",
		);
	}
	return { title, description };
}

export async function applyPlannerIssueRefinement(
	linear: Pick<PlanningLinearClient, "updateIssueDetails">,
	issue: IssueRef,
	planSummary: string,
): Promise<boolean> {
	const refinement = parsePlannerIssueRefinement(planSummary);
	if (!refinement) {
		return false;
	}
	const currentDescription = issue.description?.trim() ?? "";
	if (
		issue.title.trim() === refinement.title &&
		currentDescription === refinement.description
	) {
		return false;
	}
	await linear.updateIssueDetails(
		issue.id,
		refinement.title,
		refinement.description,
	);
	issue.title = refinement.title;
	issue.description = refinement.description;
	return true;
}
