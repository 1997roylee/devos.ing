import { eq } from "drizzle-orm";
import type { ServerDatabase } from "../db";
import { boardProjectsTable, projectBoardsTable } from "../db";
import {
	badRequest,
	isForeignKeyError,
	methodNotAllowed,
	notFound,
	optionalStringOrNull,
	parseObjectJsonBody,
	readPathId,
	requireString,
} from "./http-utils";
import type {
	CreateProjectPayload,
	UpdateProjectPayload,
} from "./project-task-api.types";

export async function handleProjectsRoute(
	request: Request,
	db: ServerDatabase["db"],
	pathname: string,
): Promise<Response | null> {
	if (pathname === "/api/projects") {
		if (request.method === "GET") {
			return Response.json(await db.select().from(boardProjectsTable));
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
			const [board] = await db
				.select({ id: projectBoardsTable.id })
				.from(projectBoardsTable)
				.where(eq(projectBoardsTable.id, payload.value.boardId));
			if (!board) {
				return badRequest("Foreign key constraint failed");
			}
			const now = new Date().toISOString();
			try {
				const [created] = await db
					.insert(boardProjectsTable)
					.values({
						id: crypto.randomUUID(),
						boardId: payload.value.boardId,
						externalProjectId: payload.value.externalProjectId ?? null,
						name: payload.value.name,
						description: payload.value.description ?? null,
						ownerId: payload.value.ownerId,
						createdAt: now,
						updatedAt: now,
					})
					.returning();
				return Response.json(created, { status: 201 });
			} catch (error) {
				return isForeignKeyError(error)
					? badRequest("Foreign key constraint failed")
					: badRequest("Invalid project create payload");
			}
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
		const [project] = await db
			.select()
			.from(boardProjectsTable)
			.where(eq(boardProjectsTable.id, id));
		return project ? Response.json(project) : notFound("Project not found");
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
		if (Object.keys(payload.value).length === 0) {
			return badRequest("Update payload must include at least one field");
		}
		if (payload.value.boardId) {
			const [board] = await db
				.select({ id: projectBoardsTable.id })
				.from(projectBoardsTable)
				.where(eq(projectBoardsTable.id, payload.value.boardId));
			if (!board) {
				return badRequest("Foreign key constraint failed");
			}
		}
		try {
			const [updated] = await db
				.update(boardProjectsTable)
				.set({ ...payload.value, updatedAt: new Date().toISOString() })
				.where(eq(boardProjectsTable.id, id))
				.returning();
			return updated ? Response.json(updated) : notFound("Project not found");
		} catch (error) {
			return isForeignKeyError(error)
				? badRequest("Foreign key constraint failed")
				: badRequest("Invalid project update payload");
		}
	}

	if (request.method === "DELETE") {
		try {
			const [deleted] = await db
				.delete(boardProjectsTable)
				.where(eq(boardProjectsTable.id, id))
				.returning();
			return deleted ? Response.json(deleted) : notFound("Project not found");
		} catch (error) {
			return isForeignKeyError(error)
				? badRequest("Foreign key constraint failed")
				: badRequest("Invalid project delete payload");
		}
	}

	return methodNotAllowed();
}

function parseCreateProjectPayload(
	body: Record<string, unknown>,
): { ok: true; value: CreateProjectPayload } | { ok: false; error: string } {
	const boardId = requireString(body.boardId, "boardId");
	if (!boardId.ok) {
		return boardId;
	}
	const name = requireString(body.name, "name");
	if (!name.ok) {
		return name;
	}
	const ownerId = requireString(body.ownerId, "ownerId");
	if (!ownerId.ok) {
		return ownerId;
	}
	const externalProjectId = optionalStringOrNull(
		body.externalProjectId,
		"externalProjectId",
	);
	if (!externalProjectId.ok) {
		return externalProjectId;
	}
	const description = optionalStringOrNull(body.description, "description");
	if (!description.ok) {
		return description;
	}
	return {
		ok: true,
		value: {
			boardId: boardId.value,
			name: name.value,
			ownerId: ownerId.value,
			externalProjectId: externalProjectId.value,
			description: description.value,
		},
	};
}

function parseUpdateProjectPayload(
	body: Record<string, unknown>,
): { ok: true; value: UpdateProjectPayload } | { ok: false; error: string } {
	const update: UpdateProjectPayload = {};
	if ("boardId" in body) {
		const boardId = requireString(body.boardId, "boardId");
		if (!boardId.ok) {
			return boardId;
		}
		update.boardId = boardId.value;
	}
	if ("name" in body) {
		const name = requireString(body.name, "name");
		if (!name.ok) {
			return name;
		}
		update.name = name.value;
	}
	if ("ownerId" in body) {
		const ownerId = requireString(body.ownerId, "ownerId");
		if (!ownerId.ok) {
			return ownerId;
		}
		update.ownerId = ownerId.value;
	}
	if ("externalProjectId" in body) {
		const externalProjectId = optionalStringOrNull(
			body.externalProjectId,
			"externalProjectId",
		);
		if (!externalProjectId.ok) {
			return externalProjectId;
		}
		update.externalProjectId = externalProjectId.value;
	}
	if ("description" in body) {
		const description = optionalStringOrNull(body.description, "description");
		if (!description.ok) {
			return description;
		}
		update.description = description.value;
	}
	return { ok: true, value: update };
}
