import { eq } from "drizzle-orm";
import type { ServerDatabase } from "../db";
import { boardProjectsTable, boardTasksTable } from "../db";
import {
	badRequest,
	isForeignKeyError,
	methodNotAllowed,
	notFound,
	optionalInteger,
	optionalStringOrNull,
	optionalTimestampStringOrNull,
	parseObjectJsonBody,
	readPathId,
	requireString,
} from "./http-utils";
import type {
	CreateTaskPayload,
	UpdateTaskPayload,
} from "./project-task-api.types";

export async function handleTasksRoute(
	request: Request,
	db: ServerDatabase["db"],
	pathname: string,
): Promise<Response | null> {
	if (pathname === "/api/tasks") {
		if (request.method === "GET") {
			return Response.json(await db.select().from(boardTasksTable));
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
			const [project] = await db
				.select({ id: boardProjectsTable.id })
				.from(boardProjectsTable)
				.where(eq(boardProjectsTable.id, payload.value.projectId));
			if (!project) {
				return badRequest("Foreign key constraint failed");
			}
			const now = new Date().toISOString();
			try {
				const [created] = await db
					.insert(boardTasksTable)
					.values({
						id: crypto.randomUUID(),
						projectId: payload.value.projectId,
						title: payload.value.title,
						content: payload.value.content,
						priority: payload.value.priority,
						status: payload.value.status,
						dueDate: payload.value.dueDate ?? null,
						creatorId: payload.value.creatorId,
						linkedPr: payload.value.linkedPr ?? null,
						createdAt: now,
						updatedAt: now,
					})
					.returning();
				return Response.json(created, { status: 201 });
			} catch (error) {
				return isForeignKeyError(error)
					? badRequest("Foreign key constraint failed")
					: badRequest("Invalid task create payload");
			}
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
		const [task] = await db
			.select()
			.from(boardTasksTable)
			.where(eq(boardTasksTable.id, id));
		return task ? Response.json(task) : notFound("Task not found");
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
		if (Object.keys(payload.value).length === 0) {
			return badRequest("Update payload must include at least one field");
		}
		if (payload.value.projectId) {
			const [project] = await db
				.select({ id: boardProjectsTable.id })
				.from(boardProjectsTable)
				.where(eq(boardProjectsTable.id, payload.value.projectId));
			if (!project) {
				return badRequest("Foreign key constraint failed");
			}
		}
		try {
			const [updated] = await db
				.update(boardTasksTable)
				.set({ ...payload.value, updatedAt: new Date().toISOString() })
				.where(eq(boardTasksTable.id, id))
				.returning();
			return updated ? Response.json(updated) : notFound("Task not found");
		} catch (error) {
			return isForeignKeyError(error)
				? badRequest("Foreign key constraint failed")
				: badRequest("Invalid task update payload");
		}
	}

	if (request.method === "DELETE") {
		try {
			const [deleted] = await db
				.delete(boardTasksTable)
				.where(eq(boardTasksTable.id, id))
				.returning();
			return deleted ? Response.json(deleted) : notFound("Task not found");
		} catch (error) {
			return isForeignKeyError(error)
				? badRequest("Foreign key constraint failed")
				: badRequest("Invalid task delete payload");
		}
	}

	return methodNotAllowed();
}

function parseCreateTaskPayload(
	body: Record<string, unknown>,
): { ok: true; value: CreateTaskPayload } | { ok: false; error: string } {
	const projectId = requireString(body.projectId, "projectId");
	if (!projectId.ok) {
		return projectId;
	}
	const title = requireString(body.title, "title");
	if (!title.ok) {
		return title;
	}
	const content = requireString(body.content, "content");
	if (!content.ok) {
		return content;
	}
	const priority = optionalInteger(body.priority, "priority");
	if (!priority.ok || priority.value === undefined) {
		return { ok: false, error: "priority must be an integer" };
	}
	const status = requireString(body.status, "status");
	if (!status.ok) {
		return status;
	}
	const creatorId = requireString(body.creatorId, "creatorId");
	if (!creatorId.ok) {
		return creatorId;
	}
	const dueDate = optionalTimestampStringOrNull(body.dueDate, "dueDate");
	if (!dueDate.ok) {
		return dueDate;
	}
	const linkedPr = optionalStringOrNull(body.linkedPr, "linkedPr");
	if (!linkedPr.ok) {
		return linkedPr;
	}
	return {
		ok: true,
		value: {
			projectId: projectId.value,
			title: title.value,
			content: content.value,
			priority: priority.value,
			status: status.value,
			creatorId: creatorId.value,
			dueDate: dueDate.value,
			linkedPr: linkedPr.value,
		},
	};
}

function parseUpdateTaskPayload(
	body: Record<string, unknown>,
): { ok: true; value: UpdateTaskPayload } | { ok: false; error: string } {
	const update: UpdateTaskPayload = {};
	if ("projectId" in body) {
		const projectId = requireString(body.projectId, "projectId");
		if (!projectId.ok) {
			return projectId;
		}
		update.projectId = projectId.value;
	}
	if ("title" in body) {
		const title = requireString(body.title, "title");
		if (!title.ok) {
			return title;
		}
		update.title = title.value;
	}
	if ("content" in body) {
		const content = requireString(body.content, "content");
		if (!content.ok) {
			return content;
		}
		update.content = content.value;
	}
	if ("priority" in body) {
		const priority = optionalInteger(body.priority, "priority");
		if (!priority.ok || priority.value === undefined) {
			return { ok: false, error: "priority must be an integer" };
		}
		update.priority = priority.value;
	}
	if ("status" in body) {
		const status = requireString(body.status, "status");
		if (!status.ok) {
			return status;
		}
		update.status = status.value;
	}
	if ("creatorId" in body) {
		const creatorId = requireString(body.creatorId, "creatorId");
		if (!creatorId.ok) {
			return creatorId;
		}
		update.creatorId = creatorId.value;
	}
	if ("dueDate" in body) {
		const dueDate = optionalTimestampStringOrNull(body.dueDate, "dueDate");
		if (!dueDate.ok) {
			return dueDate;
		}
		update.dueDate = dueDate.value;
	}
	if ("linkedPr" in body) {
		const linkedPr = optionalStringOrNull(body.linkedPr, "linkedPr");
		if (!linkedPr.ok) {
			return linkedPr;
		}
		update.linkedPr = linkedPr.value;
	}
	return { ok: true, value: update };
}
