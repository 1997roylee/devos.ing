import type { WorkflowProgressEvent } from "devos/features/server";
import { eq } from "drizzle-orm";
import { type BoardTaskRow, boardTasksTable } from "../../db";
import { normalizeError } from "../../logger";
import {
	createInternalTaskExecutionLog,
	formatStreamLogEvent,
} from "./internal-task-execution-log";
import type {
	InternalTaskPollingScheduler,
	InternalTaskPollingSchedulerDeps,
	InternalTaskPollingSchedulerOptions,
} from "./polling.types";

const READY_STATUS = "todo";

export function startInternalTaskPollingScheduler(
	options: InternalTaskPollingSchedulerOptions,
	deps: InternalTaskPollingSchedulerDeps = {},
): InternalTaskPollingScheduler {
	const intervalMs = options.config.polling.intervalMs;
	const setIntervalFn = deps.setIntervalFn ?? setInterval;
	const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
	let stopped = false;
	let inFlight = false;

	const runTick = async (): Promise<void> => {
		if (stopped) {
			return;
		}
		if (inFlight) {
			options.logger.info(
				{ intervalMs },
				"Skipping overlapping internal task polling tick",
			);
			return;
		}

		inFlight = true;
		try {
			const tasks = await options.db
				.select()
				.from(boardTasksTable)
				.where(eq(boardTasksTable.status, READY_STATUS));
			for (const task of tasks) {
				if (!task.projectId) {
					continue;
				}
				await runInternalTask(options, task);
			}
		} catch (error) {
			options.logger.error(
				{ intervalMs, err: normalizeError(error) },
				"Internal task polling command failed",
			);
		} finally {
			inFlight = false;
		}
	};

	const intervalHandle = setIntervalFn(() => {
		void runTick();
	}, intervalMs);

	options.logger.info(
		{ intervalMs },
		"Internal task polling scheduler started",
	);
	void runTick();

	return {
		stop: () => {
			if (stopped) {
				return;
			}
			stopped = true;
			clearIntervalFn(intervalHandle);
			options.logger.info(
				{ intervalMs },
				"Internal task polling scheduler stopped",
			);
		},
	};
}

async function runInternalTask(
	options: InternalTaskPollingSchedulerOptions,
	task: BoardTaskRow,
): Promise<void> {
	const executionLog = await createInternalTaskExecutionLog({
		db: options.db,
		taskId: task.id,
	});
	let appendQueue = Promise.resolve();
	const appendEvent = (event: WorkflowProgressEvent): void => {
		if (event.kind === "log" && !event.message) {
			return;
		}
		appendQueue = appendQueue.then(async () => {
			await executionLog.appendEvent(event);
			options.realtimeEvents?.publish({
				type: "task.execution.event",
				execution: {
					taskId: task.id,
					executionLogId: executionLog.id,
					event,
				},
			});
		});
	};
	const request = {
		action: "run" as const,
		projectId: task.projectId ?? undefined,
		issueKey: task.taskKey,
	};

	try {
		const result = options.cliExecutor.executeStream
			? await options.cliExecutor.executeStream(request, (event) => {
					if (event.type === "stdout" || event.type === "stderr") {
						appendEvent(
							formatStreamLogEvent({ type: event.type, text: event.text }),
						);
					}
					if (event.type === "progress") {
						appendEvent(event.event);
					}
					if (event.type === "error") {
						appendEvent(
							formatStreamLogEvent({ type: "error", error: event.error }),
						);
					}
				})
			: await options.cliExecutor.execute(request);
		if (!options.cliExecutor.executeStream) {
			appendEvent(
				formatStreamLogEvent({
					type: "stdout",
					text: result.commandResult?.stdout ?? "",
				}),
			);
			appendEvent(
				formatStreamLogEvent({
					type: "stderr",
					text: result.commandResult?.stderr ?? "",
				}),
			);
		}
		await appendQueue;
		await executionLog.finish(result);
		if (result.status !== "succeeded") {
			await blockTaskIfStillReady(options, task.id);
			options.logger.error(
				{
					taskKey: task.taskKey,
					projectId: task.projectId,
					status: result.status,
					error: result.error,
				},
				"Internal task polling command returned non-success status",
			);
		}
	} catch (error) {
		await appendQueue.catch(() => undefined);
		await executionLog.fail(error);
		await blockTaskIfStillReady(options, task.id);
		options.logger.error(
			{
				taskKey: task.taskKey,
				projectId: task.projectId,
				err: normalizeError(error),
			},
			"Internal task polling command failed",
		);
	}
}

async function blockTaskIfStillReady(
	options: InternalTaskPollingSchedulerOptions,
	taskId: string,
): Promise<void> {
	const [task] = await options.db
		.select({ status: boardTasksTable.status })
		.from(boardTasksTable)
		.where(eq(boardTasksTable.id, taskId));
	if (task?.status !== READY_STATUS) {
		return;
	}
	await options.db
		.update(boardTasksTable)
		.set({ status: "blocked", updatedAt: new Date().toISOString() })
		.where(eq(boardTasksTable.id, taskId));
}
