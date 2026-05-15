import { asc, eq } from "drizzle-orm";
import type { ServerDatabase } from "../db";
import { agentsTable } from "../db";
import {
	serializeAgentCreatePayload,
	serializeAgentUpdatePayload,
	toAgentProfile,
	validateAgentCreatePayload,
	validateAgentUpdatePayload,
} from "./agent-profile";
import { parseJsonBody } from "./entity-crud-validators";
import type { CrudResponseResult } from "./entity-crud.types";

interface AgentCrudDeps {
	db: ServerDatabase["db"];
}

export async function handleAgentRequest(
	request: Request,
	deps: AgentCrudDeps,
	id: string | null,
): Promise<CrudResponseResult> {
	if (id === null) {
		if (request.method === "GET") {
			const rows = await deps.db
				.select()
				.from(agentsTable)
				.orderBy(asc(agentsTable.id));
			return { status: 200, body: rows.map(toAgentProfile) };
		}
		if (request.method === "POST") {
			const parsed = await parseJsonBody(request);
			if (!parsed.ok) {
				return { status: 400, body: { error: parsed.error } };
			}
			const validated = validateAgentCreatePayload(parsed.value);
			if (!validated.ok) {
				return { status: 400, body: { error: validated.error } };
			}
			const [created] = await deps.db
				.insert(agentsTable)
				.values(serializeAgentCreatePayload(validated.value))
				.returning();
			return { status: 201, body: toAgentProfile(created) };
		}
		return { status: 405, body: { error: "Method Not Allowed" } };
	}

	if (request.method === "GET") {
		const [row] = await deps.db
			.select()
			.from(agentsTable)
			.where(eq(agentsTable.id, id));
		if (!row) {
			return { status: 404, body: { error: "Not Found" } };
		}
		return { status: 200, body: toAgentProfile(row) };
	}

	if (request.method === "PATCH") {
		const parsed = await parseJsonBody(request);
		if (!parsed.ok) {
			return { status: 400, body: { error: parsed.error } };
		}
		const validated = validateAgentUpdatePayload(parsed.value);
		if (!validated.ok) {
			return { status: 400, body: { error: validated.error } };
		}
		const [updated] = await deps.db
			.update(agentsTable)
			.set(serializeAgentUpdatePayload(validated.value))
			.where(eq(agentsTable.id, id))
			.returning();
		if (!updated) {
			return { status: 404, body: { error: "Not Found" } };
		}
		return { status: 200, body: toAgentProfile(updated) };
	}

	if (request.method === "DELETE") {
		const [deleted] = await deps.db
			.delete(agentsTable)
			.where(eq(agentsTable.id, id))
			.returning({ id: agentsTable.id });
		if (!deleted) {
			return { status: 404, body: { error: "Not Found" } };
		}
		return { status: 204 };
	}

	return { status: 405, body: { error: "Method Not Allowed" } };
}
