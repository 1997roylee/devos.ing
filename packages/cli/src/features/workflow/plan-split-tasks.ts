import type { PlannedSplitTask } from "../../features/types";
import { extractFirstJsonArray, unwrapFencedCodeBlock } from "./planner-json";

export function parsePlannerSplitTasks(
	planSummary: string,
): PlannedSplitTask[] {
	const marker = /\bSPLIT_TASKS_JSON\s*:/i;
	const markerMatch = marker.exec(planSummary);
	if (!markerMatch) {
		throw new Error(
			"Planner marked task as COMPLEX but omitted SPLIT_TASKS_JSON.",
		);
	}
	const markerStart = markerMatch.index + markerMatch[0].length;
	const rawPayload = planSummary.slice(markerStart).trim();
	if (!rawPayload) {
		throw new Error(
			"Planner marked task as COMPLEX but SPLIT_TASKS_JSON was empty.",
		);
	}
	const jsonSource = unwrapFencedCodeBlock(rawPayload);
	const jsonArrayText = extractFirstJsonArray(jsonSource);
	if (!jsonArrayText) {
		throw new Error(
			"Planner marked task as COMPLEX but SPLIT_TASKS_JSON did not contain a JSON array.",
		);
	}
	const parsed = JSON.parse(jsonArrayText) as unknown;
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error(
			"SPLIT_TASKS_JSON must be a non-empty JSON array when COMPLEXITY is COMPLEX.",
		);
	}
	return parsed.map((value, index) => validateSplitTask(value, index));
}

function validateSplitTask(value: unknown, index: number): PlannedSplitTask {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`Split task at index ${index} must be an object.`);
	}
	const record = value as Record<string, unknown>;
	const title =
		typeof record.title === "string" ? record.title.trim() : undefined;
	if (!title) {
		throw new Error(
			`Split task at index ${index} is missing a non-empty title.`,
		);
	}
	const description =
		typeof record.description === "string"
			? record.description.trim() || undefined
			: undefined;
	const labels = parseSplitTaskLabels(record.labels, index);
	const priority = parseSplitTaskPriority(record.priority, index);
	return { title, description, labels, priority };
}

function parseSplitTaskLabels(
	rawLabels: unknown,
	index: number,
): string[] | undefined {
	if (rawLabels === undefined) {
		return undefined;
	}
	if (!Array.isArray(rawLabels)) {
		throw new Error(`Split task at index ${index} has non-array labels.`);
	}
	const labels = rawLabels
		.map((label, labelIndex) => {
			if (typeof label !== "string") {
				throw new Error(
					`Split task at index ${index} has non-string label at position ${labelIndex}.`,
				);
			}
			return label.trim();
		})
		.filter(Boolean);
	return labels.length > 0 ? labels : undefined;
}

function parseSplitTaskPriority(
	rawPriority: unknown,
	index: number,
): number | undefined {
	if (rawPriority === undefined) {
		return undefined;
	}
	if (
		typeof rawPriority !== "number" ||
		!Number.isInteger(rawPriority) ||
		rawPriority < 0 ||
		rawPriority > 4
	) {
		throw new Error(
			`Split task at index ${index} has invalid priority '${String(rawPriority)}'. Expected integer 0-4.`,
		);
	}
	return rawPriority;
}
