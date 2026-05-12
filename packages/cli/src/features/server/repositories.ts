import { Database } from "bun:sqlite";
import type {
	AgentRecord,
	CommandHistoryRecord,
	JobRecord,
	ReadRepositories,
	SkillRecord,
	TokenUsageRecord,
} from "./repositories.types";

interface SqliteRow {
	[key: string]: string | number | null;
}

function readRows<T>(
	dbPath: string,
	sql: string,
	map: (row: SqliteRow) => T,
): T[] {
	const db = new Database(dbPath, { readonly: true, create: false });
	try {
		const rows = db.query(sql).all() as SqliteRow[];
		return rows.map(map);
	} finally {
		db.close(false);
	}
}

export function createReadRepositories(dbPath: string): ReadRepositories {
	return {
		listTokenUsage: () =>
			readRows(
				dbPath,
				`SELECT id, run_id, stage, input_tokens, output_tokens, total_tokens, recorded_at
				 FROM token_usage
				 ORDER BY id ASC`,
				(row): TokenUsageRecord => ({
					id: String(row.id),
					runId: String(row.run_id),
					stage: String(row.stage),
					inputTokens: Number(row.input_tokens),
					outputTokens: Number(row.output_tokens),
					totalTokens: Number(row.total_tokens),
					recordedAt: String(row.recorded_at),
				}),
			),
		listJobs: () =>
			readRows(
				dbPath,
				`SELECT id, project_id, issue_key, stage, status, created_at
				 FROM jobs
				 ORDER BY id ASC`,
				(row): JobRecord => ({
					id: String(row.id),
					projectId: String(row.project_id),
					issueKey: String(row.issue_key),
					stage: String(row.stage),
					status: String(row.status),
					createdAt: String(row.created_at),
				}),
			),
		listAgents: () =>
			readRows(
				dbPath,
				`SELECT id, name, backend, model, created_at
				 FROM agents
				 ORDER BY id ASC`,
				(row): AgentRecord => ({
					id: String(row.id),
					name: String(row.name),
					backend: String(row.backend),
					model: String(row.model),
					createdAt: String(row.created_at),
				}),
			),
		listSkills: () =>
			readRows(
				dbPath,
				`SELECT id, name, description, source, updated_at
				 FROM skills
				 ORDER BY id ASC`,
				(row): SkillRecord => ({
					id: String(row.id),
					name: String(row.name),
					description: String(row.description),
					source: String(row.source),
					updatedAt: String(row.updated_at),
				}),
			),
		listCommandHistory: () =>
			readRows(
				dbPath,
				`SELECT id, command, exit_code, executed_at
				 FROM command_history
				 ORDER BY id ASC`,
				(row): CommandHistoryRecord => ({
					id: String(row.id),
					command: String(row.command),
					exitCode: Number(row.exit_code),
					executedAt: String(row.executed_at),
				}),
			),
	};
}
