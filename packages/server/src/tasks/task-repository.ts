import { eq, inArray } from "drizzle-orm";
import type { ServerDatabase } from "../db";
import {
	boardProjectsTable,
	boardTasksTable,
	generateBoardTaskKey,
	taskCommentsTable,
	taskExecutionLogsTable,
	taskExecutionStepsTable,
} from "../db";
import type { NewBoardTaskRow } from "../db/board-tasks.types";
import type { TaskRepository } from "./task-service.types";

export function createTaskRepository(db: ServerDatabase["db"]): TaskRepository {
	return {
		async listTasks() {
			return db.select().from(boardTasksTable);
		},
		async getTask(id) {
			const [task] = await db
				.select()
				.from(boardTasksTable)
				.where(eq(boardTasksTable.id, id));
			return task ?? null;
		},
		async getTaskActivity(id) {
			const [task] = await db
				.select()
				.from(boardTasksTable)
				.where(eq(boardTasksTable.id, id));
			if (!task) {
				return null;
			}
			const comments = await db
				.select()
				.from(taskCommentsTable)
				.where(eq(taskCommentsTable.taskId, id));
			const executionLogs = await db
				.select()
				.from(taskExecutionLogsTable)
				.where(eq(taskExecutionLogsTable.taskId, id));
			const logIds = executionLogs.map((log) => log.id);
			const executionSteps =
				logIds.length > 0
					? await db
							.select()
							.from(taskExecutionStepsTable)
							.where(inArray(taskExecutionStepsTable.executionLogId, logIds))
					: [];
			return { comments, executionLogs, executionSteps, task };
		},
		async projectExists(id) {
			const [project] = await db
				.select({ id: boardProjectsTable.id })
				.from(boardProjectsTable)
				.where(eq(boardProjectsTable.id, id));
			return Boolean(project);
		},
		async nextTaskKey() {
			return generateBoardTaskKey(db);
		},
		async createTask(input) {
			const [created] = await db
				.insert(boardTasksTable)
				.values(input)
				.returning();
			return created;
		},
		async updateTask(id, input: Partial<NewBoardTaskRow>) {
			const [updated] = await db
				.update(boardTasksTable)
				.set(input)
				.where(eq(boardTasksTable.id, id))
				.returning();
			return updated ?? null;
		},
		async deleteTask(id) {
			return db.transaction(async (tx) => {
				await tx
					.delete(taskCommentsTable)
					.where(eq(taskCommentsTable.taskId, id));
				const [deleted] = await tx
					.delete(boardTasksTable)
					.where(eq(boardTasksTable.id, id))
					.returning();
				return deleted ?? null;
			});
		},
		async addTaskComment(input) {
			await db.insert(taskCommentsTable).values(input);
		},
	};
}
