import type { BoardTaskRow } from "../db/board-tasks.types";
import type { TaskCommentRow } from "../db/task-comments.types";
import type { TaskExecutionLogRow } from "../db/task-execution-logs.types";
import type { TaskExecutionStepRow } from "../db/task-execution-steps.types";

export type TaskActivityKind = "comment" | "created" | "execution";

export interface TaskActivityStepRecord {
	id: string;
	stepNumber: number;
	action: string;
	status: string;
	detail: string | null;
	recordedAt: string;
}

export interface TaskActivityRecord {
	id: string;
	kind: TaskActivityKind;
	actorId: string;
	actorType: string;
	title: string;
	body: string;
	status: string | null;
	createdAt: string;
	steps?: TaskActivityStepRecord[];
}

export interface TaskActivityResponse {
	taskId: string;
	activities: TaskActivityRecord[];
}

export interface TaskActivitySourceRows {
	task: BoardTaskRow;
	comments: TaskCommentRow[];
	executionLogs: TaskExecutionLogRow[];
	executionSteps: TaskExecutionStepRow[];
}
