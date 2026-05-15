import { afterEach, describe, expect, it } from "bun:test";
import { createHandleRequest } from "../src/app";
import type { AppDeps } from "../src/app.types";
import {
	type ServerDatabase,
	boardProjectsTable,
	projectBoardsTable,
} from "../src/db";
import type { BoardTaskRow } from "../src/db/board-tasks.types";
import type { TaskChatCreateLinearIssue } from "../src/http/task-chat-create.types";
import {
	type DrizzleServerTestDatabase,
	createDrizzleServerTestDatabase,
} from "./server-db-test-helpers";

let testDatabase: DrizzleServerTestDatabase | undefined;

afterEach(async () => {
	if (testDatabase) {
		await testDatabase.cleanup();
		testDatabase = undefined;
	}
});

describe("chat task create route", () => {
	it("creates and links a board task from structured task intake output", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		await seedProject(testDatabase.db, "project-1");
		const calls: unknown[] = [];
		const app = createApp(testDatabase.db, async (request) => {
			calls.push(request);
			return {
				status: "succeeded",
				request,
				commandResult: {
					code: 0,
					stdout: `${JSON.stringify(createdIntake())}\n`,
					stderr: "",
				},
			};
		});

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create the composed flow",
					projectId: "project-1",
					answers: [{ question: "Where?", answer: "Web" }],
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			status: string;
			issue: TaskChatCreateLinearIssue;
			task: BoardTaskRow;
		};
		expect(body.status).toBe("created");
		expect(body.issue.identifier).toBe("ROY-1");
		expect(body.task.title).toBe("Compose task creation");
		expect(body.task.content).toBe("Create both task records.");
		expect(body.task.linkedPr).toBe("https://linear.example/ROY-1");
		expect(calls).toEqual([
			{
				action: "task",
				taskAction: "create",
				request: "Create the composed flow",
				projectId: "project-1",
				nonInteractive: true,
				clarificationAnswers: [{ question: "Where?", answer: "Web" }],
				json: true,
			},
		]);
	});

	it("returns needs_info from task intake without creating a board task", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		await seedProject(testDatabase.db, "project-1");
		const app = createApp(testDatabase.db, async (request) => ({
			status: "succeeded",
			request,
			commandResult: {
				code: 0,
				stdout: '{"status":"needs_info","questions":["Which project?"]}\n',
				stderr: "",
			},
		}));

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create something",
					projectId: "project-1",
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "needs_info",
			questions: ["Which project?"],
		});
	});

	it("returns db_error when the board task cannot be created", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const app = createApp(testDatabase.db, async (request) => ({
			status: "succeeded",
			request,
			commandResult: {
				code: 0,
				stdout: `${JSON.stringify(createdIntake())}\n`,
				stderr: "",
			},
		}));

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create something",
					projectId: "missing-project",
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as { status: string; error: string };
		expect(body.status).toBe("db_error");
		expect(body.error).toBe("Project not found");
	});

	it("returns linear_error when task intake or Linear creation fails", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		await seedProject(testDatabase.db, "project-1");
		const app = createApp(testDatabase.db, async (request) => ({
			status: "failed",
			request,
			error: "Linear API rejected the issue",
		}));

		const response = await app(
			new Request("http://localhost/api/tasks/chat-create", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					request: "Create something",
					projectId: "project-1",
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "linear_error",
			error: "Linear API rejected the issue",
		});
	});
});

function createApp(
	db: ServerDatabase["db"],
	execute: AppDeps["cliExecutor"]["execute"],
) {
	return createHandleRequest({
		cliExecutor: {
			execute,
			executeStream: async (request) => execute(request),
			getHistory: () => [],
		},
		db,
	});
}

async function seedProject(db: ServerDatabase["db"], projectId: string) {
	await db.insert(projectBoardsTable).values({
		id: "board-1",
		name: "Board",
		description: "Test board",
		ownerId: "owner-1",
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:00:00.000Z",
	});
	await db.insert(boardProjectsTable).values({
		id: projectId,
		boardId: "board-1",
		externalProjectId: null,
		name: "Project",
		description: null,
		ownerId: "owner-1",
		createdAt: "2026-05-13T00:00:00.000Z",
		updatedAt: "2026-05-13T00:00:00.000Z",
	});
}

function createdIntake() {
	return {
		status: "created",
		issue: createdIssue(),
		task: {
			title: "Compose task creation",
			description: "Create both task records.",
		},
	};
}

function createdIssue(): TaskChatCreateLinearIssue {
	return {
		id: "lin-1",
		identifier: "ROY-1",
		title: "Compose task creation",
		url: "https://linear.example/ROY-1",
	};
}
