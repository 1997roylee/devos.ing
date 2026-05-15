import type { CliExecutor } from "../app.types";
import type { ServerDatabase } from "../db";
import { createTaskRepository, createTaskService } from "../tasks";
import type { TaskServiceResult } from "../tasks";
import {
	badRequest,
	methodNotAllowed,
	notFound,
	parseObjectJsonBody,
	readPathId,
} from "./http-utils";
import {
	parseCreateTaskPayload,
	parseUpdateTaskPayload,
} from "./project-task-schemas";
import { handleTaskChatCreateRoute } from "./task-chat-create";

export async function handleTasksRoute(
	request: Request,
	db: ServerDatabase["db"],
	cliExecutor: CliExecutor,
	pathname: string,
): Promise<Response | null> {
	if (pathname === "/api/tasks/chat-create") {
		return handleTaskChatCreateRoute(request, db, cliExecutor);
	}

	const service = createTaskService(createTaskRepository(db));
	if (pathname === "/api/tasks") {
		if (request.method === "GET") {
			return mapTaskResult(await service.listTasks(), "Invalid task list");
		}
		if (request.method === "POST") {
			const parsedBody = await parseObjectJsonBody(request);
			if (!parsedBody.ok) {
				return badRequest(parsedBody.error);
			}
			const payload = parseCreateTaskPayload(parsedBody.value);
			if (!payload.ok) {
				return badRequest(payload.error);
			}
			return mapTaskResult(
				await service.createTask(payload.value),
				"Invalid task create payload",
				201,
			);
		}
		return methodNotAllowed();
	}
	if (pathname === "/api/tasks/") {
		return notFound("Task not found");
	}

	const id = readPathId(pathname, "/api/tasks/");
	if (!id) {
		return null;
	}

	if (request.method === "GET") {
		return mapTaskResult(
			await service.getTask(id),
			"Invalid task read payload",
		);
	}

	if (request.method === "PATCH") {
		const parsedBody = await parseObjectJsonBody(request);
		if (!parsedBody.ok) {
			return badRequest(parsedBody.error);
		}
		const payload = parseUpdateTaskPayload(parsedBody.value);
		if (!payload.ok) {
			return badRequest(payload.error);
		}
		return mapTaskResult(
			await service.updateTask(id, payload.value),
			"Invalid task update payload",
		);
	}

	if (request.method === "DELETE") {
		return mapTaskResult(
			await service.deleteTask(id),
			"Invalid task delete payload",
		);
	}

	return methodNotAllowed();
}

function mapTaskResult<T>(
	result: TaskServiceResult<T>,
	invalidPayloadError: string,
	successStatus = 200,
): Response {
	if (result.status === "ok") {
		return Response.json(result.value, { status: successStatus });
	}
	if (result.status === "not_found") {
		return notFound("Task not found");
	}
	if (result.status === "foreign_key_error") {
		return badRequest("Foreign key constraint failed");
	}
	return badRequest(
		invalidPayloadError === "Invalid task update payload"
			? "Update payload must include at least one field"
			: invalidPayloadError,
	);
}
