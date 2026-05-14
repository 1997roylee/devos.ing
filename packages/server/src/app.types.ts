import type {
	CliCommandExecutionHistoryEntry,
	CliCommandExecutionResult,
	CliCommandRequest,
	NotificationServerRequest,
} from "adhdai/features/server";
import type { BoardRepository } from "./board";

export interface CliExecutor {
	execute(request: CliCommandRequest): Promise<CliCommandExecutionResult>;
	getHistory(): CliCommandExecutionHistoryEntry[];
}

export interface AppDeps {
	cliExecutor: CliExecutor;
	notificationSender: {
		sendNotification(request: NotificationServerRequest): Promise<void>;
	};
}

export type RouteHandler = (request: Request) => Response | Promise<Response>;

export interface WorkspaceProjectRecord {
	id: string;
	boardId: string;
	externalProjectId: string | null;
	name: string;
	description: string | null;
	ownerId: string;
	createdAt: string;
	updatedAt: string;
}

export interface ProjectBoardTaskRecord {
	id: string;
	projectId: string;
	title: string;
	content: string;
	priority: number;
	status: string;
	dueDate: string | null;
	creatorId: string;
	linkedPr: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ProjectBoardRecord {
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
	createdAt: string;
	updatedAt: string;
	projects: WorkspaceProjectRecord[];
	tasks: ProjectBoardTaskRecord[];
}

export interface BoardReadModels {
	listWorkspaceProjects(workspaceId: string): Promise<WorkspaceProjectRecord[]>;
	getProjectBoard(
		workspaceId: string,
		projectId: string,
	): Promise<ProjectBoardRecord>;
}
