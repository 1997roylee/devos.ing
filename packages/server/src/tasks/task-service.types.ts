import type { BoardTaskRow, NewBoardTaskRow } from "../db/board-tasks.types";
import type { NewTaskCommentRow } from "../db/task-comments.types";
import type {
	CreateTaskPayload,
	UpdateTaskPayload,
} from "../http/project-task-api.types";
import type {
	TaskActivityResponse,
	TaskActivitySourceRows,
} from "./task-activity.types";

export interface TaskRepository {
	listTasks(): Promise<BoardTaskRow[]>;
	getTask(id: string): Promise<BoardTaskRow | null>;
	getTaskActivity(id: string): Promise<TaskActivitySourceRows | null>;
	projectExists(id: string): Promise<boolean>;
	nextTaskKey(): Promise<string>;
	createTask(input: NewBoardTaskRow): Promise<BoardTaskRow>;
	updateTask(
		id: string,
		input: Partial<NewBoardTaskRow>,
	): Promise<BoardTaskRow | null>;
	deleteTask(id: string): Promise<BoardTaskRow | null>;
	addTaskComment(input: NewTaskCommentRow): Promise<void>;
}

export type TaskServiceResult<T> =
	| { status: "ok"; value: T }
	| { status: "not_found" }
	| { status: "foreign_key_error" }
	| { status: "invalid_payload" };

export interface TaskService {
	listTasks(): Promise<TaskServiceResult<BoardTaskRow[]>>;
	getTask(id: string): Promise<TaskServiceResult<BoardTaskRow>>;
	getTaskActivity(id: string): Promise<TaskServiceResult<TaskActivityResponse>>;
	createTask(
		input: CreateTaskPayload,
	): Promise<TaskServiceResult<BoardTaskRow>>;
	ensureChatCreatedTask(
		input: { projectId?: string },
		task: BoardTaskRow,
	): Promise<TaskServiceResult<BoardTaskRow>>;
	updateTask(
		id: string,
		input: UpdateTaskPayload,
	): Promise<TaskServiceResult<BoardTaskRow>>;
	deleteTask(id: string): Promise<TaskServiceResult<BoardTaskRow>>;
}
