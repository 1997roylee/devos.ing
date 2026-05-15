import {
	type NewAgentRow,
	agentsTable,
	initializeServerDatabase,
} from "devos-server/db";
import { eq } from "drizzle-orm";
import type {
	AgentCreateInput,
	AgentProfile,
	AgentUpdateInput,
} from "./agents.types";

const LIST_FIELDS = ["skills", "recentWork", "activity"] as const;

export async function listAgentProfiles(
	databasePath: string,
): Promise<AgentProfile[]> {
	return withAgentDatabase(databasePath, async (database) => {
		const rows = await database.db.select().from(agentsTable);
		return rows.map(toAgentProfile).sort((a, b) => a.id.localeCompare(b.id));
	});
}

export async function getAgentProfile(
	databasePath: string,
	id: string,
): Promise<AgentProfile | null> {
	return withAgentDatabase(databasePath, async (database) => {
		const [row] = await database.db
			.select()
			.from(agentsTable)
			.where(eq(agentsTable.id, id));
		return row ? toAgentProfile(row) : null;
	});
}

export async function addAgentProfile(
	databasePath: string,
	input: AgentCreateInput,
): Promise<AgentProfile> {
	return withAgentDatabase(databasePath, async (database) => {
		const now = new Date().toISOString();
		const [created] = await database.db
			.insert(agentsTable)
			.values(
				toAgentCreateRow({
					...input,
					createdAt: input.createdAt ?? now,
					updatedAt: input.updatedAt ?? now,
				}),
			)
			.returning();
		return toAgentProfile(created);
	});
}

export async function updateAgentProfile(
	databasePath: string,
	id: string,
	input: AgentUpdateInput,
): Promise<AgentProfile | null> {
	return withAgentDatabase(databasePath, async (database) => {
		const [updated] = await database.db
			.update(agentsTable)
			.set(
				toAgentUpdateRow({
					...input,
					updatedAt: input.updatedAt ?? new Date().toISOString(),
				}),
			)
			.where(eq(agentsTable.id, id))
			.returning();
		return updated ? toAgentProfile(updated) : null;
	});
}

export async function removeAgentProfile(
	databasePath: string,
	id: string,
): Promise<boolean> {
	return withAgentDatabase(databasePath, async (database) => {
		const [deleted] = await database.db
			.delete(agentsTable)
			.where(eq(agentsTable.id, id))
			.returning({ id: agentsTable.id });
		return Boolean(deleted);
	});
}

async function withAgentDatabase<T>(
	databasePath: string,
	fn: (
		database: Awaited<ReturnType<typeof initializeServerDatabase>>,
	) => Promise<T>,
): Promise<T> {
	const database = await initializeServerDatabase(databasePath);
	try {
		return await fn(database);
	} finally {
		await database.close();
	}
}

function toAgentCreateRow(input: AgentCreateInput): NewAgentRow {
	return toAgentRow(input) as NewAgentRow;
}

function toAgentUpdateRow(input: AgentUpdateInput): Partial<NewAgentRow> {
	return toAgentRow(input);
}

function toAgentRow(
	input: AgentCreateInput | AgentUpdateInput,
): NewAgentRow | Partial<NewAgentRow> {
	const row: Partial<NewAgentRow> = {};
	for (const [key, value] of Object.entries(input)) {
		if (!LIST_FIELDS.includes(key as (typeof LIST_FIELDS)[number])) {
			row[key as keyof NewAgentRow] = value as never;
		}
	}
	for (const field of LIST_FIELDS) {
		if (field in input && input[field] !== undefined) {
			row[field] = JSON.stringify(input[field]);
		}
	}
	return row;
}

function toAgentProfile(row: typeof agentsTable.$inferSelect): AgentProfile {
	return {
		...row,
		skills: parseList(row.skills),
		recentWork: parseList(row.recentWork),
		activity: parseList(row.activity),
	};
}

function parseList(value: string): string[] {
	const parsed = JSON.parse(value) as unknown;
	return Array.isArray(parsed)
		? parsed.filter((item): item is string => typeof item === "string")
		: [];
}
