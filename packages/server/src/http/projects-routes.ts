import type { ServerDatabase } from "../db";
import { createProjectRepository, createProjectService } from "../projects";
import type { ProjectServiceResult } from "../projects";
import {
	badRequest,
	methodNotAllowed,
	notFound,
	parseObjectJsonBody,
	readPathId,
} from "./http-utils";
import {
	parseCreateProjectPayload,
	parseUpdateProjectPayload,
} from "./project-task-schemas";

export async function handleProjectsRoute(
	request: Request,
	db: ServerDatabase["db"],
	pathname: string,
): Promise<Response | null> {
	const service = createProjectService(createProjectRepository(db));
	if (pathname === "/api/projects") {
		if (request.method === "GET") {
			return mapProjectResult(
				await service.listProjects(),
				"Invalid project list",
			);
		}
		if (request.method === "POST") {
			const parsedBody = await parseObjectJsonBody(request);
			if (!parsedBody.ok) {
				return badRequest(parsedBody.error);
			}
			const payload = parseCreateProjectPayload(parsedBody.value);
			if (!payload.ok) {
				return badRequest(payload.error);
			}
			return mapProjectResult(
				await service.createProject(payload.value),
				"Invalid project create payload",
				201,
			);
		}
		return methodNotAllowed();
	}
	if (pathname === "/api/projects/") {
		return notFound("Project not found");
	}

	const id = readPathId(pathname, "/api/projects/");
	if (!id) {
		return null;
	}

	if (request.method === "GET") {
		return mapProjectResult(
			await service.getProject(id),
			"Invalid project read payload",
		);
	}

	if (request.method === "PATCH") {
		const parsedBody = await parseObjectJsonBody(request);
		if (!parsedBody.ok) {
			return badRequest(parsedBody.error);
		}
		const payload = parseUpdateProjectPayload(parsedBody.value);
		if (!payload.ok) {
			return badRequest(payload.error);
		}
		return mapProjectResult(
			await service.updateProject(id, payload.value),
			"Invalid project update payload",
		);
	}

	if (request.method === "DELETE") {
		return mapProjectResult(
			await service.deleteProject(id),
			"Invalid project delete payload",
		);
	}

	return methodNotAllowed();
}

function mapProjectResult<T>(
	result: ProjectServiceResult<T>,
	invalidPayloadError: string,
	successStatus = 200,
): Response {
	if (result.status === "ok") {
		return Response.json(result.value, { status: successStatus });
	}
	if (result.status === "not_found") {
		return notFound("Project not found");
	}
	if (result.status === "foreign_key_error") {
		return badRequest("Foreign key constraint failed");
	}
	return badRequest(
		invalidPayloadError === "Invalid project update payload"
			? "Update payload must include at least one field"
			: invalidPayloadError,
	);
}
