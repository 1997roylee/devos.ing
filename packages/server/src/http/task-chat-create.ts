import { eq } from "drizzle-orm";
import { z } from "zod";
import type { CliExecutor } from "../app.types";
import type { ServerDatabase } from "../db";
import { boardProjectsTable, boardTasksTable } from "../db";
import type { BoardTaskRow } from "../db/board-tasks.types";
import {
	badRequest,
	methodNotAllowed,
	parseObjectJsonBody,
} from "./http-utils";
import { jsonSuccess } from "./response";
import type {
	TaskChatCreateIntakeResult,
	TaskChatCreateRequest,
	TaskChatCreateResponse,
} from "./task-chat-create.types";

const answerSchema = z.object({
	question: z.string().trim().min(1),
	answer: z.string().trim().min(1),
});

const requestSchema = z.object({
	request: z.string().trim().min(1),
	projectId: z.string().trim().min(1),
	answers: z.array(answerSchema).optional(),
});

export async function handleTaskChatCreateRoute(
	request: Request,
	db: ServerDatabase["db"],
	cliExecutor: CliExecutor,
): Promise<Response> {
	if (request.method !== "POST") {
		return methodNotAllowed();
	}
	const parsedBody = await parseObjectJsonBody(request);
	if (!parsedBody.ok) {
		return badRequest(parsedBody.error);
	}
	const parsed = requestSchema.safeParse(parsedBody.value);
	if (!parsed.success) {
		return badRequest("Invalid chat task create payload");
	}
	const result = await composeTaskChatCreate(parsed.data, {
		runTaskIntake: (input) => runTaskIntake(cliExecutor, input),
		createBoardTask: (input, resolvedTask, issueUrl) =>
			createBoardTask(db, input, resolvedTask, issueUrl),
		linkBoardTask: (taskId, issueUrl) => linkBoardTask(db, taskId, issueUrl),
	});
	return jsonSuccess(result);
}

export async function composeTaskChatCreate(
	input: TaskChatCreateRequest,
	deps: {
		runTaskIntake(
			input: TaskChatCreateRequest,
		): Promise<TaskChatCreateIntakeResult>;
		createBoardTask(
			input: TaskChatCreateRequest,
			task: { title: string; description: string },
			issueUrl: string,
		): Promise<BoardTaskRow>;
		linkBoardTask(taskId: string, issueUrl: string): Promise<BoardTaskRow>;
	},
): Promise<TaskChatCreateResponse> {
	const intake = await settle(() => deps.runTaskIntake(input));
	if (!intake.ok) {
		return { status: "linear_error", error: intake.error };
	}
	if (intake.value.status === "needs_info") {
		return intake.value;
	}
	const { issue, task: resolvedTask } = intake.value;
	const created = await settle(() =>
		deps.createBoardTask(input, resolvedTask, issue.url),
	);
	if (!created.ok) {
		return { status: "db_error", error: created.error, issue };
	}
	const linked = await settle(() =>
		deps.linkBoardTask(created.value.id, issue.url),
	);
	if (!linked.ok) {
		return {
			status: "link_error",
			error: linked.error,
			issue,
			task: created.value,
		};
	}
	return { status: "created", issue, task: linked.value };
}

async function runTaskIntake(
	cliExecutor: CliExecutor,
	input: TaskChatCreateRequest,
): Promise<TaskChatCreateIntakeResult> {
	const result = await cliExecutor.execute({
		action: "task",
		taskAction: "create",
		request: input.request,
		projectId: input.projectId,
		nonInteractive: true,
		clarificationAnswers: input.answers,
		json: true,
	});
	if (result.status !== "succeeded") {
		throw new Error(result.error ?? "Linear task creation failed");
	}
	return parseTaskIntakeOutput(result.commandResult?.stdout ?? "");
}

function parseTaskIntakeOutput(output: string): TaskChatCreateIntakeResult {
	const line = output
		.split("\n")
		.map((value) => value.trim())
		.filter(Boolean)
		.at(-1);
	if (!line) {
		throw new Error("Linear task creation returned no structured output");
	}
	const parsed = JSON.parse(line) as unknown;
	return intakeResultSchema.parse(parsed);
}

async function createBoardTask(
	db: ServerDatabase["db"],
	input: TaskChatCreateRequest,
	task: { title: string; description: string },
	_issueUrl: string,
): Promise<BoardTaskRow> {
	const [project] = await db
		.select({ id: boardProjectsTable.id, ownerId: boardProjectsTable.ownerId })
		.from(boardProjectsTable)
		.where(eq(boardProjectsTable.id, input.projectId));
	if (!project) {
		throw new Error("Project not found");
	}
	const now = new Date().toISOString();
	const [created] = await db
		.insert(boardTasksTable)
		.values({
			id: crypto.randomUUID(),
			projectId: project.id,
			title: task.title,
			content: task.description,
			priority: 1,
			status: "open",
			dueDate: null,
			creatorId: project.ownerId,
			linkedPr: null,
			createdAt: now,
			updatedAt: now,
		})
		.returning();
	if (!created) {
		throw new Error("Board task was not created");
	}
	return created;
}

async function linkBoardTask(
	db: ServerDatabase["db"],
	taskId: string,
	issueUrl: string,
): Promise<BoardTaskRow> {
	const [linked] = await db
		.update(boardTasksTable)
		.set({ linkedPr: issueUrl, updatedAt: new Date().toISOString() })
		.where(eq(boardTasksTable.id, taskId))
		.returning();
	if (!linked) {
		throw new Error("Board task link was not updated");
	}
	return linked;
}

const linearIssueSchema = z.object({
	id: z.string().min(1),
	identifier: z.string().min(1),
	title: z.string().min(1),
	url: z.string().min(1),
});

const intakeResultSchema = z.union([
	z.object({
		status: z.literal("created"),
		issue: linearIssueSchema,
		task: z.object({
			title: z.string().min(1),
			description: z.string().min(1),
		}),
	}),
	z.object({
		status: z.literal("needs_info"),
		questions: z.array(z.string().min(1)).min(1),
	}),
]);

async function settle<T>(
	run: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
	try {
		return { ok: true, value: await run() };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
