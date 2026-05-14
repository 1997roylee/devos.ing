import type {
	HealthRequestOptions,
	ProjectBoardRecord,
	ProjectBoardTaskRecord,
	WorkspaceProjectRecord,
} from "./client.types";

const WORKSPACE_PROJECTS_BASE_PATH = "/api/workspaces";

function assertObjectRecord(
	payload: unknown,
	endpoint: string,
): Record<string, unknown> {
	if (typeof payload !== "object" || payload === null) {
		throw new Error(`Invalid ${endpoint} response payload`);
	}
	return payload as Record<string, unknown>;
}

function readString(
	record: Record<string, unknown>,
	key: string,
	endpoint: string,
): string {
	const value = record[key];
	if (typeof value !== "string") {
		throw new Error(`Invalid ${endpoint} response field '${key}'`);
	}
	return value;
}

function readNumber(
	record: Record<string, unknown>,
	key: string,
	endpoint: string,
): number {
	const value = record[key];
	if (typeof value !== "number") {
		throw new Error(`Invalid ${endpoint} response field '${key}'`);
	}
	return value;
}

function readNullableString(
	record: Record<string, unknown>,
	key: string,
	endpoint: string,
): string | null {
	const value = record[key];
	if (value === null || typeof value === "string") {
		return value;
	}
	throw new Error(`Invalid ${endpoint} response field '${key}'`);
}

function parseWorkspaceProjectRecord(payload: unknown): WorkspaceProjectRecord {
	const row = assertObjectRecord(
		payload,
		"/api/workspaces/:workspaceId/projects",
	);
	return {
		id: readString(row, "id", "/api/workspaces/:workspaceId/projects"),
		boardId: readString(
			row,
			"boardId",
			"/api/workspaces/:workspaceId/projects",
		),
		externalProjectId: readNullableString(
			row,
			"externalProjectId",
			"/api/workspaces/:workspaceId/projects",
		),
		name: readString(row, "name", "/api/workspaces/:workspaceId/projects"),
		description: readNullableString(
			row,
			"description",
			"/api/workspaces/:workspaceId/projects",
		),
		ownerId: readString(
			row,
			"ownerId",
			"/api/workspaces/:workspaceId/projects",
		),
		createdAt: readString(
			row,
			"createdAt",
			"/api/workspaces/:workspaceId/projects",
		),
		updatedAt: readString(
			row,
			"updatedAt",
			"/api/workspaces/:workspaceId/projects",
		),
	};
}

function parseProjectBoardTaskRecord(payload: unknown): ProjectBoardTaskRecord {
	const row = assertObjectRecord(
		payload,
		"/api/workspaces/:workspaceId/projects/:projectId/board",
	);
	return {
		id: readString(
			row,
			"id",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		projectId: readString(
			row,
			"projectId",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		title: readString(
			row,
			"title",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		content: readString(
			row,
			"content",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		priority: readNumber(
			row,
			"priority",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		status: readString(
			row,
			"status",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		dueDate: readNullableString(
			row,
			"dueDate",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		creatorId: readString(
			row,
			"creatorId",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		linkedPr: readNullableString(
			row,
			"linkedPr",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		createdAt: readString(
			row,
			"createdAt",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
		updatedAt: readString(
			row,
			"updatedAt",
			"/api/workspaces/:workspaceId/projects/:projectId/board",
		),
	};
}

function parseListResponse<T>(
	payload: unknown,
	endpoint: string,
	parseItem: (item: unknown) => T,
): T[] {
	if (!Array.isArray(payload)) {
		throw new Error(`Invalid ${endpoint} response payload`);
	}
	return payload.map(parseItem);
}

function parseProjectBoardRecord(payload: unknown): ProjectBoardRecord {
	const endpoint = "/api/workspaces/:workspaceId/projects/:projectId/board";
	const row = assertObjectRecord(payload, endpoint);
	return {
		id: readString(row, "id", endpoint),
		name: readString(row, "name", endpoint),
		description: readNullableString(row, "description", endpoint),
		ownerId: readString(row, "ownerId", endpoint),
		createdAt: readString(row, "createdAt", endpoint),
		updatedAt: readString(row, "updatedAt", endpoint),
		projects: parseListResponse(
			row.projects,
			`${endpoint}:projects`,
			parseWorkspaceProjectRecord,
		),
		tasks: parseListResponse(
			row.tasks,
			`${endpoint}:tasks`,
			parseProjectBoardTaskRecord,
		),
	};
}

function encodePathSegment(value: string): string {
	return encodeURIComponent(value);
}

function workspaceProjectsPath(workspaceId: string): string {
	return `${WORKSPACE_PROJECTS_BASE_PATH}/${encodePathSegment(workspaceId)}/projects`;
}

function projectBoardPath(workspaceId: string, projectId: string): string {
	return `${workspaceProjectsPath(workspaceId)}/${encodePathSegment(projectId)}/board`;
}

export interface BoardApiMethods {
	listWorkspaceProjects(
		workspaceId: string,
		options?: HealthRequestOptions,
	): Promise<WorkspaceProjectRecord[]>;
	getProjectBoard(
		workspaceId: string,
		projectId: string,
		options?: HealthRequestOptions,
	): Promise<ProjectBoardRecord>;
}

export function createBoardApiMethods(
	requestJson: (
		path: string,
		options?: HealthRequestOptions,
	) => Promise<unknown>,
): BoardApiMethods {
	return {
		async listWorkspaceProjects(
			workspaceId: string,
			options?: HealthRequestOptions,
		): Promise<WorkspaceProjectRecord[]> {
			const payload = await requestJson(
				workspaceProjectsPath(workspaceId),
				options,
			);
			return parseListResponse(
				payload,
				"/api/workspaces/:workspaceId/projects",
				parseWorkspaceProjectRecord,
			);
		},
		async getProjectBoard(
			workspaceId: string,
			projectId: string,
			options?: HealthRequestOptions,
		): Promise<ProjectBoardRecord> {
			const payload = await requestJson(
				projectBoardPath(workspaceId, projectId),
				options,
			);
			return parseProjectBoardRecord(payload);
		},
	};
}
