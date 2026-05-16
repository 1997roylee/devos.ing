import {
	boardTasksTable,
	generateBoardTaskKey,
	initializeServerDatabase,
	taskCommentsTable,
	taskPullRequestsTable,
} from "devos-server/db";
import { eq } from "drizzle-orm";
import type { ResolvedProjectConfig } from "../../features/types";
import type {
	BoardTaskPrSelection,
	BoardTaskPullRequestLink,
	BoardTaskWorkflowRecord,
	BoardTaskWorkflowStore,
} from "./board-task-workflow-store.types";

export function createBoardTaskWorkflowStore(
	config: ResolvedProjectConfig,
): BoardTaskWorkflowStore {
	const databasePath = config.server.database.databasePath;
	return {
		async listTasks() {
			return withDatabase(databasePath, async (db) => {
				const tasks = await db.select().from(boardTasksTable);
				const pullRequests = await db.select().from(taskPullRequestsTable);
				const prsByTaskId = new Map(
					pullRequests.map((row) => [row.taskId, row]),
				);
				return tasks.map((task) => ({
					task,
					pullRequest: toPullRequest({
						linkedPr: task.linkedPr,
						taskKey: task.taskKey,
						title: task.title,
						pullRequest: prsByTaskId.get(task.id),
					}),
				}));
			});
		},
		async updateTask(taskId, values) {
			await withDatabase(databasePath, async (db) => {
				await db
					.update(boardTasksTable)
					.set({ ...values, updatedAt: new Date().toISOString() })
					.where(eq(boardTasksTable.id, taskId));
			});
		},
		async createTask(input) {
			return withDatabase(databasePath, async (db) => {
				const now = new Date().toISOString();
				const [created] = await db
					.insert(boardTasksTable)
					.values({
						...input,
						id: crypto.randomUUID(),
						taskKey: await generateBoardTaskKey(db),
						createdAt: now,
						updatedAt: now,
					})
					.returning();
				if (!created) {
					throw new Error("Board task was not created");
				}
				return created;
			});
		},
		async addComment(taskId, body) {
			await withDatabase(databasePath, async (db) => {
				const now = new Date().toISOString();
				await db.insert(taskCommentsTable).values({
					id: crypto.randomUUID(),
					taskId,
					authorId: "devos",
					authorType: "agent",
					comment: body,
					createdAt: now,
				});
				await db
					.update(boardTasksTable)
					.set({ updatedAt: now })
					.where(eq(boardTasksTable.id, taskId));
			});
		},
		async linkPullRequest(input) {
			await linkPullRequest(databasePath, input);
		},
	};
}

async function linkPullRequest(
	databasePath: string,
	input: BoardTaskPullRequestLink,
): Promise<void> {
	const prUrl = input.pullRequest.url;
	const prNumber = input.pullRequest.number ?? parsePrNumber(prUrl);
	await withDatabase(databasePath, async (db) => {
		const now = new Date().toISOString();
		await db
			.update(boardTasksTable)
			.set({ ...(prUrl ? { linkedPr: prUrl } : {}), updatedAt: now })
			.where(eq(boardTasksTable.id, input.taskId));
		if (!prNumber) {
			return;
		}
		await db
			.insert(taskPullRequestsTable)
			.values({
				id: crypto.randomUUID(),
				taskId: input.taskId,
				repository: input.repository,
				prNumber: String(prNumber),
				prUrl: prUrl ?? null,
				createdAt: now,
			})
			.onConflictDoUpdate({
				target: [
					taskPullRequestsTable.taskId,
					taskPullRequestsTable.repository,
					taskPullRequestsTable.prNumber,
				],
				set: { prUrl: prUrl ?? null },
			});
	});
}

async function withDatabase<T>(
	databasePath: string,
	run: (
		db: Awaited<ReturnType<typeof initializeServerDatabase>>["db"],
	) => Promise<T>,
): Promise<T> {
	const database = await initializeServerDatabase(databasePath);
	try {
		return await run(database.db);
	} finally {
		await database.close();
	}
}

function toPullRequest(input: BoardTaskPrSelection) {
	const url = input.pullRequest?.prUrl ?? input.linkedPr ?? undefined;
	const number = input.pullRequest?.prNumber
		? Number(input.pullRequest.prNumber)
		: parsePrNumber(url);
	if (!url && !number) {
		return undefined;
	}
	const numberValue =
		typeof number === "number" && Number.isFinite(number) ? number : undefined;
	return {
		number: numberValue,
		url,
		branch: `codex/${input.taskKey.toLowerCase()}`,
		title: `[codex] ${input.taskKey}: ${input.title}`,
	};
}

function parsePrNumber(prUrl: string | undefined): number | undefined {
	const match = prUrl?.match(/\/pull\/(\d+)/);
	return match ? Number(match[1]) : undefined;
}
