import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	type ServerDatabase,
	boardProjectsTable,
	boardTasksTable,
	initializeServerDatabase,
	projectBoardsTable,
	taskCommentsTable,
	taskPullRequestsTable,
} from "devos-server/db";
import type { BoardTaskRow } from "devos-server/db";
import { eq } from "drizzle-orm";
import { createBoardTaskWorkflowClient } from "../src/features/workflow/board-task-workflow-client";
import { project } from "./smoke-fixtures";

interface TestDatabase {
	database: ServerDatabase;
	path: string;
	root: string;
}

let testDatabase: TestDatabase | undefined;

afterEach(async () => {
	if (!testDatabase) {
		return;
	}
	await testDatabase.database.close();
	await rm(testDatabase.root, { recursive: true, force: true });
	testDatabase = undefined;
});

describe("BoardTaskWorkflowClient", () => {
	it("polls planning tasks and allows targeted task lookup by key", async () => {
		const { database, config } = await setupDatabase();
		await seedTask(database, { id: "task-1", taskKey: "TASK-000001" });
		await seedTask(database, {
			id: "task-2",
			taskKey: "TASK-000002",
			status: "implementing",
		});
		await seedTask(database, {
			id: "task-3",
			taskKey: "TASK-000003",
			projectId: "other-project",
		});
		const client = createBoardTaskWorkflowClient(config);

		expect((await client.fetchWork()).map((task) => task.identifier)).toEqual([
			"TASK-000001",
		]);
		expect(
			(await client.fetchWork("TASK-000002")).map((task) => task.identifier),
		).toEqual(["TASK-000002"]);
	});

	it("updates task status and freshness when marking a stage", async () => {
		const { database, config, databasePath } = await setupDatabase();
		await seedTask(database, { id: "task-1", taskKey: "TASK-000001" });
		const client = createBoardTaskWorkflowClient(config);

		await client.markStage("task-1", "implementing");

		const task = await readTask(databasePath, "task-1");
		const comments = await readComments(databasePath);
		expect(task?.status).toBe("implementing");
		expect(task?.updatedAt).not.toBe("2026-05-12T00:00:00.000Z");
		expect(comments).toContainEqual(
			expect.objectContaining({
				authorType: "system",
				comment: "changed status from `planning` to `implementing`",
			}),
		);
	});

	it("persists task comments and bumps task freshness", async () => {
		const { database, config, databasePath } = await setupDatabase();
		await seedTask(database, { id: "task-1", taskKey: "TASK-000001" });
		const client = createBoardTaskWorkflowClient(config);

		await client.comment("task-1", "Implementation started.");

		const comments = await readComments(databasePath);
		const task = await readTask(databasePath, "task-1");
		expect(comments).toHaveLength(1);
		expect(comments[0]?.taskId).toBe("task-1");
		expect(comments[0]?.comment).toBe("Implementation started.");
		expect(task?.updatedAt).not.toBe("2026-05-12T00:00:00.000Z");
	});

	it("links pull requests without duplicating task PR rows", async () => {
		const { database, config, databasePath } = await setupDatabase();
		await seedTask(database, { id: "task-1", taskKey: "TASK-000001" });
		const client = createBoardTaskWorkflowClient(config);
		const pullRequest = {
			number: 42,
			url: "https://github.com/acme/project/pull/42",
			branch: "codex/task-000001",
			title: "Task PR",
		};

		await client.linkPullRequest?.("task-1", pullRequest);
		await client.linkPullRequest?.("task-1", pullRequest);

		const task = await readTask(databasePath, "task-1");
		const prs = await readPullRequests(databasePath);
		const comments = await readComments(databasePath);
		expect(task?.linkedPr).toBe(pullRequest.url);
		expect(prs).toHaveLength(1);
		expect(prs[0]?.repository).toBe("acme/project");
		expect(prs[0]?.prNumber).toBe("42");
		expect(prs[0]?.prUrl).toBe(pullRequest.url);
		expect(comments).toHaveLength(1);
		expect(comments[0]?.comment).toContain("changed linked PR");
	});

	it("returns review-only tasks with persisted pull request refs", async () => {
		const { database, config } = await setupDatabase();
		await seedTask(database, {
			id: "task-1",
			taskKey: "TASK-000001",
			status: "reviewing",
			linkedPr: "https://github.com/acme/project/pull/7",
		});
		const client = createBoardTaskWorkflowClient(config);

		const [task] = await client.fetchReviewOnlyWork();

		expect(task?.identifier).toBe("TASK-000001");
		expect(task?.pullRequest?.url).toBe(
			"https://github.com/acme/project/pull/7",
		);
		expect(task?.pullRequest?.number).toBe(7);
		expect(task?.pullRequest?.branch).toBe("codex/task-000001");
	});
});

async function setupDatabase() {
	const root = await mkdtemp(path.join(os.tmpdir(), "devos-board-client-"));
	const databasePath = path.join(root, "server.pgdata");
	const database = await initializeServerDatabase(databasePath);
	testDatabase = { database, path: databasePath, root };
	await database.db.insert(projectBoardsTable).values({
		id: "board-1",
		name: "Board",
		description: null,
		ownerId: "owner-1",
		createdAt: "2026-05-12T00:00:00.000Z",
		updatedAt: "2026-05-12T00:00:00.000Z",
	});
	await database.db.insert(boardProjectsTable).values({
		id: "project-1",
		boardId: "board-1",
		externalProjectId: null,
		name: "Project",
		description: null,
		ownerId: "owner-1",
		createdAt: "2026-05-12T00:00:00.000Z",
		updatedAt: "2026-05-12T00:00:00.000Z",
	});
	await database.db.insert(boardProjectsTable).values({
		id: "other-project",
		boardId: "board-1",
		externalProjectId: null,
		name: "Other Project",
		description: null,
		ownerId: "owner-1",
		createdAt: "2026-05-12T00:00:00.000Z",
		updatedAt: "2026-05-12T00:00:00.000Z",
	});
	const config = project("project-1");
	config.server.database.databasePath = databasePath;
	config.repo.owner = "acme";
	config.repo.name = "project";
	return { database, config, databasePath };
}

async function seedTask(
	database: ServerDatabase,
	overrides: Partial<BoardTaskRow>,
) {
	await database.db.insert(boardTasksTable).values({
		id: "task-1",
		taskKey: "TASK-000001",
		projectId: "project-1",
		title: "Task",
		content: "Task content",
		priority: 1,
		status: "planning",
		dueDate: null,
		creatorId: "owner-1",
		linkedPr: null,
		linearIssueId: null,
		linearIdentifier: null,
		linearUrl: null,
		createdAt: "2026-05-12T00:00:00.000Z",
		updatedAt: "2026-05-12T00:00:00.000Z",
		...overrides,
	});
}

async function readTask(databasePath: string, id: string) {
	return withFreshDatabase(databasePath, async (database) => {
		const [task] = await database.db
			.select()
			.from(boardTasksTable)
			.where(eq(boardTasksTable.id, id));
		return task;
	});
}

async function readComments(databasePath: string) {
	return withFreshDatabase(databasePath, (database) =>
		database.db.select().from(taskCommentsTable),
	);
}

async function readPullRequests(databasePath: string) {
	return withFreshDatabase(databasePath, (database) =>
		database.db.select().from(taskPullRequestsTable),
	);
}

async function withFreshDatabase<T>(
	databasePath: string,
	run: (database: ServerDatabase) => Promise<T>,
) {
	const database = await initializeServerDatabase(databasePath);
	try {
		return await run(database);
	} finally {
		await database.close();
	}
}
