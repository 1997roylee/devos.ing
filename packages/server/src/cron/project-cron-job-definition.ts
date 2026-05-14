import type {
	ProjectCronJobDefinition,
	ProjectCronJobTargetType,
	ProjectCronJobValidationError,
	ProjectCronJobValidationResult,
} from "./project-cron-job-definition.types";

const TARGET_TYPES: ReadonlySet<ProjectCronJobTargetType> = new Set([
	"script",
	"hook",
]);

export function validateProjectCronJobDefinition(
	input: unknown,
): ProjectCronJobValidationResult {
	if (!isRecord(input)) {
		return {
			ok: false,
			errors: [{ field: "root", message: "Expected object body" }],
		};
	}

	const errors: ProjectCronJobValidationError[] = [];
	const projectId = stringField(input.projectId, "projectId", errors);
	const cronExpression = cronExpressionField(input.cronExpression, errors);
	const targetType = targetTypeField(input.targetType, errors);
	const target = stringField(input.target, "target", errors);
	const skills = skillsField(input.skills, errors);
	const enabled = booleanField(input.enabled, "enabled", errors);

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		value: {
			projectId,
			cronExpression,
			targetType,
			target,
			skills,
			enabled,
		},
	};
}

export function serializeProjectCronJobSkills(skills: string[]): string {
	return JSON.stringify(skills);
}

export function parseProjectCronJobSkills(
	raw: string,
): string[] | { error: string } {
	try {
		const parsed = JSON.parse(raw);
		if (
			!Array.isArray(parsed) ||
			parsed.some((item) => typeof item !== "string")
		) {
			return { error: "skills must be a JSON string array" };
		}
		return parsed;
	} catch {
		return { error: "skills must be valid JSON" };
	}
}

function stringField(
	value: unknown,
	field: string,
	errors: ProjectCronJobValidationError[],
): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		errors.push({ field, message: `${field} must be a non-empty string` });
		return "";
	}
	return value;
}

function cronExpressionField(
	value: unknown,
	errors: ProjectCronJobValidationError[],
): string {
	const cronExpression = stringField(value, "cronExpression", errors);
	if (cronExpression.length === 0) {
		return cronExpression;
	}
	if (!isValidCronExpression(cronExpression)) {
		errors.push({
			field: "cronExpression",
			message: "cronExpression must be a valid 5-field cron expression",
		});
		return "";
	}
	return cronExpression;
}

function targetTypeField(
	value: unknown,
	errors: ProjectCronJobValidationError[],
): ProjectCronJobTargetType {
	if (value !== "script" && value !== "hook") {
		errors.push({
			field: "targetType",
			message: "targetType must be one of: script, hook",
		});
		return "script";
	}
	if (!TARGET_TYPES.has(value)) {
		errors.push({
			field: "targetType",
			message: "targetType must be one of: script, hook",
		});
		return "script";
	}
	return value;
}

function skillsField(
	value: unknown,
	errors: ProjectCronJobValidationError[],
): string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		errors.push({
			field: "skills",
			message: "skills must be an array of strings",
		});
		return [];
	}
	return value;
}

function booleanField(
	value: unknown,
	field: string,
	errors: ProjectCronJobValidationError[],
): boolean | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== "boolean") {
		errors.push({ field, message: `${field} must be a boolean when provided` });
		return undefined;
	}
	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCronExpression(expression: string): boolean {
	const fields = expression.trim().split(/\s+/);
	if (fields.length !== 5) {
		return false;
	}

	const ranges: Array<[number, number]> = [
		[0, 59],
		[0, 23],
		[1, 31],
		[1, 12],
		[0, 6],
	];

	return fields.every((field, index) =>
		isValidCronField(field, ranges[index][0], ranges[index][1]),
	);
}

function isValidCronField(field: string, min: number, max: number): boolean {
	return field
		.split(",")
		.every((segment) => isValidCronSegment(segment, min, max));
}

function isValidCronSegment(
	segment: string,
	min: number,
	max: number,
): boolean {
	if (segment === "*") {
		return true;
	}

	const stepParts = segment.split("/");
	if (stepParts.length > 2 || stepParts.some((part) => part.length === 0)) {
		return false;
	}

	const [base, stepRaw] = stepParts;
	if (!isValidCronBase(base, min, max)) {
		return false;
	}

	if (stepRaw === undefined) {
		return true;
	}
	if (!isInteger(stepRaw)) {
		return false;
	}
	const step = Number(stepRaw);
	return step > 0;
}

function isValidCronBase(base: string, min: number, max: number): boolean {
	if (base === "*") {
		return true;
	}

	if (base.includes("-")) {
		const [startRaw, endRaw, ...extra] = base.split("-");
		if (extra.length > 0) {
			return false;
		}
		if (!isInteger(startRaw) || !isInteger(endRaw)) {
			return false;
		}
		const start = Number(startRaw);
		const end = Number(endRaw);
		return start >= min && end <= max && start <= end;
	}

	if (!isInteger(base)) {
		return false;
	}
	const value = Number(base);
	return value >= min && value <= max;
}

function isInteger(value: string): boolean {
	return /^\d+$/.test(value);
}
