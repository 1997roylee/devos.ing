import type { TaskServiceResult } from "../tasks";
import { badRequest, notFound } from "./http-utils";

export function readTaskActivityPath(pathname: string): string | null {
	const prefix = "/api/tasks/";
	const suffix = "/activity";
	if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) {
		return null;
	}
	const id = pathname.slice(prefix.length, -suffix.length);
	return id.length > 0 ? id : null;
}

export function mapTaskResult<T>(
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
