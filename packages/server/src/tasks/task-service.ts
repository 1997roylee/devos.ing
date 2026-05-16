import { isForeignKeyError } from "../http/http-utils";
import type { UpdateTaskPayload } from "../http/project-task-api.types";
import type {
	TaskActivityRecord,
	TaskActivitySourceRows,
} from "./task-activity.types";
import type { TaskRepository, TaskService } from "./task-service.types";

const UPDATE_ACTIVITY_FIELDS: Array<keyof UpdateTaskPayload> = [
	"taskKey",
	"projectId",
	"title",
	"content",
	"priority",
	"status",
	"creatorId",
	"dueDate",
	"linkedPr",
	"linearIssueId",
	"linearIdentifier",
	"linearUrl",
];

export function createTaskService(repository: TaskRepository): TaskService {
	return {
		async listTasks() {
			return { status: "ok", value: await repository.listTasks() };
		},
		async getTask(id) {
			const task = await repository.getTask(id);
			return task ? { status: "ok", value: task } : { status: "not_found" };
		},
		async getTaskActivity(id) {
			const rows = await repository.getTaskActivity(id);
			return rows
				? { status: "ok", value: composeTaskActivity(rows) }
				: { status: "not_found" };
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
		async ensureChatCreatedTask(input, task) {
			const existing = await repository.getTask(task.id);
			if (existing) {
				return { status: "ok", value: existing };
			}
			const projectId = input.projectId ?? task.projectId;
			if (projectId && !(await repository.projectExists(projectId))) {
				return { status: "foreign_key_error" };
			}
			try {
				const created = await repository.createTask({
					...task,
					projectId: projectId ?? null,
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
				const existing = await repository.getTask(id);
				if (!existing) {
					return { status: "not_found" };
				}
				const updated = await repository.updateTask(id, {
					...input,
					updatedAt: new Date().toISOString(),
				});
				if (updated) {
					const body = describeTaskUpdate(existing, updated, input);
					if (body) {
						await repository.addTaskComment({
							id: crypto.randomUUID(),
							taskId: id,
							authorId: "system",
							authorType: "system",
							comment: body,
							createdAt: updated.updatedAt,
						});
					}
				}
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

function composeTaskActivity(rows: TaskActivitySourceRows) {
	const stepsByLog = new Map(
		rows.executionLogs.map((log) => [
			log.id,
			rows.executionSteps
				.filter((step) => step.executionLogId === log.id)
				.sort((left, right) => left.stepNumber - right.stepNumber)
				.map((step) => ({
					id: step.id,
					stepNumber: step.stepNumber,
					action: step.action,
					status: step.status,
					detail: step.detail,
					recordedAt: step.recordedAt,
				})),
		]),
	);
	const activities: TaskActivityRecord[] = [
		{
			id: `${rows.task.id}:created`,
			kind: "created",
			actorId: rows.task.creatorId,
			actorType: "human",
			title: "created this issue",
			body: "",
			status: rows.task.status,
			createdAt: rows.task.createdAt,
		},
		...rows.comments.map((comment) => ({
			id: comment.id,
			kind: "comment" as const,
			actorId: comment.authorId,
			actorType: comment.authorType,
			title:
				comment.authorType === "system"
					? "updated this issue"
					: "commented on this issue",
			body: comment.comment,
			status: null,
			createdAt: comment.createdAt,
		})),
		...rows.executionLogs.map((log) => ({
			id: log.id,
			kind: "execution" as const,
			actorId: "devos",
			actorType: "agent",
			title: "recorded execution output",
			body: log.log,
			status: log.status,
			createdAt: log.startedAt,
			steps: stepsByLog.get(log.id) ?? [],
		})),
	];
	return {
		taskId: rows.task.id,
		activities: activities.sort((left, right) =>
			left.createdAt.localeCompare(right.createdAt),
		),
	};
}

function describeTaskUpdate(
	existing: TaskActivitySourceRows["task"],
	updated: TaskActivitySourceRows["task"],
	input: UpdateTaskPayload,
): string | null {
	const lines = UPDATE_ACTIVITY_FIELDS.flatMap((field) => {
		if (!(field in input) || existing[field] === updated[field]) {
			return [];
		}
		return [
			`changed ${fieldLabel(field)} from ${formatValue(
				existing[field],
			)} to ${formatValue(updated[field])}`,
		];
	});
	return lines.length > 0 ? lines.join("\n") : null;
}

function fieldLabel(field: keyof UpdateTaskPayload): string {
	return field === "content"
		? "description"
		: field.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`);
}

function formatValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined || value === "") {
		return "`empty`";
	}
	const text = String(value).replace(/\s+/g, " ").trim();
	const truncated = text.length > 120 ? `${text.slice(0, 117)}...` : text;
	return `\`${truncated}\``;
}

function mapMutationError(error: unknown) {
	return isForeignKeyError(error)
		? { status: "foreign_key_error" as const }
		: { status: "invalid_payload" as const };
}
