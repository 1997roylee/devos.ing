import { eq } from "drizzle-orm";
import type { ServerDatabase } from "../db";
import {
	boardProjectsTable,
	boardTasksTable,
	generateBoardTaskKey,
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
			const [deleted] = await db
				.delete(boardTasksTable)
				.where(eq(boardTasksTable.id, id))
				.returning();
			return deleted ?? null;
		},
	};
}
