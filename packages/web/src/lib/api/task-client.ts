import type {
	HealthRequestOptions,
	ProjectBoardTaskRecord,
	TaskCreateRequest,
	TaskCreateResponse,
	TaskMutationRequest,
} from "./client.types";
import {
	assertObjectRecord,
	encodePathSegment,
	readNullableString,
	readNumber,
	readString,
	requestJson,
} from "./response-utils";

function parseCreatedTaskRef(output: string): TaskCreateResponse {
	const createdMatch = output.match(
		/Created Linear task\s+([A-Za-z]+-\d+):\s+(\S+)/,
	);
	if (createdMatch) {
		return {
			status: "created",
			issue: { identifier: createdMatch[1], url: createdMatch[2] },
			rawOutput: output,
		};
	}
	const questions = parseNeedsInfoQuestions(output);
	if (questions.length > 0) {
		return { status: "needs_info", questions, rawOutput: output };
	}
	return {
		status: "error",
		error: "Task create completed without a parseable result",
		rawOutput: output,
	};
}

function parseNeedsInfoQuestions(output: string): string[] {
	const questions: string[] = [];
	let inQuestionsSection = false;
	for (const line of output.split("\n")) {
		const trimmed = line.trim();
		if (!inQuestionsSection && trimmed === "Remaining questions:") {
			inQuestionsSection = true;
			continue;
		}
		if (inQuestionsSection && trimmed.startsWith("- ")) {
			questions.push(trimmed.slice(2).trim());
		} else if (inQuestionsSection && trimmed.length > 0) {
			break;
		}
	}
	return questions.filter(Boolean);
}

export function parseTaskCreateResponse(payload: unknown): TaskCreateResponse {
	const row = assertObjectRecord(payload, "/api/cli/dispatch");
	const status = row.status;
	if (status !== "succeeded" && status !== "failed" && status !== "rejected") {
		throw new Error("Invalid /api/cli/dispatch response field 'status'");
	}
	const output =
		typeof row.commandResult === "object" &&
		row.commandResult !== null &&
		"stdout" in row.commandResult &&
		typeof row.commandResult.stdout === "string"
			? row.commandResult.stdout
			: "";
	if (status !== "succeeded") {
		const error =
			typeof row.error === "string" ? row.error : "Task create failed";
		return { status: "error", error, rawOutput: output };
	}
	return parseCreatedTaskRef(output);
}

export function parseProjectBoardTaskRecord(
	payload: unknown,
): ProjectBoardTaskRecord {
	const endpoint = "/api/tasks";
	const row = assertObjectRecord(payload, endpoint);
	return {
		id: readString(row, "id", endpoint),
		projectId: readString(row, "projectId", endpoint),
		title: readString(row, "title", endpoint),
		content: readString(row, "content", endpoint),
		priority: readNumber(row, "priority", endpoint),
		status: readString(row, "status", endpoint),
		dueDate: readNullableString(row, "dueDate", endpoint),
		creatorId: readString(row, "creatorId", endpoint),
		linkedPr: readNullableString(row, "linkedPr", endpoint),
		createdAt: readString(row, "createdAt", endpoint),
		updatedAt: readString(row, "updatedAt", endpoint),
	};
}

export interface TaskApiMethods {
	createTaskFromCli(
		request: TaskCreateRequest,
		options?: HealthRequestOptions,
	): Promise<TaskCreateResponse>;
	createBoardTask(
		request: TaskMutationRequest,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord>;
	updateBoardTask(
		taskId: string,
		request: Partial<TaskMutationRequest>,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord>;
	deleteBoardTask(
		taskId: string,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardTaskRecord>;
}

export function createTaskApiMethods(
	requestWithBase: (
		path: string,
		method: "GET" | "POST" | "PATCH" | "DELETE",
		options?: HealthRequestOptions,
		body?: unknown,
	) => Promise<unknown>,
): TaskApiMethods {
	return {
		async createTaskFromCli(request, options) {
			const { answers, ...taskRequest } = request;
			const payload = await requestWithBase(
				"/api/cli/dispatch",
				"POST",
				options,
				{
					action: "task",
					taskAction: "create",
					...taskRequest,
					clarificationAnswers: answers,
				},
			);
			return parseTaskCreateResponse(payload);
		},
		async createBoardTask(request, options) {
			const payload = await requestWithBase(
				"/api/tasks",
				"POST",
				options,
				request,
			);
			return parseProjectBoardTaskRecord(payload);
		},
		async updateBoardTask(taskId, request, options) {
			const payload = await requestWithBase(
				`/api/tasks/${encodePathSegment(taskId)}`,
				"PATCH",
				options,
				request,
			);
			return parseProjectBoardTaskRecord(payload);
		},
		async deleteBoardTask(taskId, options) {
			const payload = await requestWithBase(
				`/api/tasks/${encodePathSegment(taskId)}`,
				"DELETE",
				options,
			);
			return parseProjectBoardTaskRecord(payload);
		},
	};
}
