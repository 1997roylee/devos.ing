export type ProjectCronJobTargetType = "script" | "hook";

export interface ProjectCronJobDefinition {
	projectId: string;
	cronExpression: string;
	targetType: ProjectCronJobTargetType;
	target: string;
	skills: string[];
	enabled?: boolean;
}

export interface ProjectCronJobValidationError {
	field: string;
	message: string;
}

export type ProjectCronJobValidationResult =
	| { ok: true; value: ProjectCronJobDefinition }
	| { ok: false; errors: ProjectCronJobValidationError[] };
