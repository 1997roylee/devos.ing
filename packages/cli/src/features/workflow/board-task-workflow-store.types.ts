import type { BoardTaskRow, TaskPullRequestRow } from "devos-server/db";
import type { PullRequestRef } from "../../features/types";

export interface BoardTaskWorkflowRecord {
	task: BoardTaskRow;
	pullRequest?: PullRequestRef;
}

export interface BoardTaskPullRequestLink {
	taskId: string;
	repository: string;
	pullRequest: PullRequestRef;
}

export interface BoardTaskCreateInput {
	projectId: string | null;
	title: string;
	content: string;
	priority: number;
	status: string;
	dueDate: string | null;
	creatorId: string;
	linkedPr: string | null;
	linearIssueId: string | null;
	linearIdentifier: string | null;
	linearUrl: string | null;
}

export interface BoardTaskWorkflowStore {
	listTasks(): Promise<BoardTaskWorkflowRecord[]>;
	updateTask(taskId: string, values: Partial<BoardTaskRow>): Promise<void>;
	createTask(input: BoardTaskCreateInput): Promise<BoardTaskRow>;
	addComment(taskId: string, body: string): Promise<void>;
	linkPullRequest(input: BoardTaskPullRequestLink): Promise<void>;
}

export interface BoardTaskPrSelection {
	linkedPr: string | null;
	taskKey: string;
	title: string;
	pullRequest?: TaskPullRequestRow;
}
