import { isForeignKeyError } from "../http/http-utils";
import type { TaskRepository, TaskService } from "./task-service.types";

export function createTaskService(repository: TaskRepository): TaskService {
	return {
		async listTasks() {
			return { status: "ok", value: await repository.listTasks() };
		},
		async getTask(id) {
			const task = await repository.getTask(id);
			return task ? { status: "ok", value: task } : { status: "not_found" };
		},
		async createTask(input) {
			if (
				input.projectId &&
				!(await repository.projectExists(input.projectId))
			) {
				return { status: "foreign_key_error" };
			}
			const now = new Date().toISOString();
			try {
				const created = await repository.createTask({
					id: crypto.randomUUID(),
					taskKey: input.taskKey ?? (await repository.nextTaskKey()),
					projectId: input.projectId ?? null,
					title: input.title,
					content: input.content,
					priority: input.priority,
					status: input.status,
					dueDate: input.dueDate ?? null,
					creatorId: input.creatorId,
					linkedPr: input.linkedPr ?? null,
					linearIssueId: input.linearIssueId ?? null,
					linearIdentifier: input.linearIdentifier ?? null,
					linearUrl: input.linearUrl ?? null,
					createdAt: now,
					updatedAt: now,
				});
				return { status: "ok", value: created };
			} catch (error) {
				return mapMutationError(error);
			}
		},
		async updateTask(id, input) {
			if (Object.keys(input).length === 0) {
				return { status: "invalid_payload" };
			}
			if (
				input.projectId &&
				!(await repository.projectExists(input.projectId))
			) {
				return { status: "foreign_key_error" };
			}
			try {
				const updated = await repository.updateTask(id, {
					...input,
					updatedAt: new Date().toISOString(),
				});
				return updated
					? { status: "ok", value: updated }
					: { status: "not_found" };
			} catch (error) {
				return mapMutationError(error);
			}
		},
		async deleteTask(id) {
			try {
				const deleted = await repository.deleteTask(id);
				return deleted
					? { status: "ok", value: deleted }
					: { status: "not_found" };
			} catch (error) {
				return mapMutationError(error);
			}
		},
	};
}

function mapMutationError(error: unknown) {
	return isForeignKeyError(error)
		? { status: "foreign_key_error" as const }
		: { status: "invalid_payload" as const };
}
