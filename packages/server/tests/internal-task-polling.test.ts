import { afterEach, describe, expect, it } from "bun:test";
import type { WorkflowProgressEvent } from "devos/features/server";
import { boardTasksTable, taskExecutionLogsTable } from "../src/db";
import { startInternalTaskPollingScheduler } from "../src/features/polling";
import type { InternalTaskPollingIntervalHandle } from "../src/features/polling";
import {
	createConfig,
	createLogger,
	parseLogLines,
	rejectedResult,
	seedProjectTask,
	succeededResult,
	waitFor,
} from "./internal-task-polling.test-helpers";
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

describe("startInternalTaskPollingScheduler", () => {
	it("streams daemon output into task execution logs", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const db = testDatabase.db;
		await seedProjectTask(db, "todo");
		const intervalCalls: number[] = [];
		let release: (() => void) | undefined;
		const running = new Promise<void>((resolve) => {
			release = resolve;
		});
		const requests: unknown[] = [];
		const realtimeEvents: unknown[] = [];
		const progressEvent: WorkflowProgressEvent = {
			schema: "devos.workflow.stream.v1",
			emittedAt: "2026-05-16T00:00:00.000Z",
			kind: "stage",
			projectId: "project-1",
			issueKey: "TASK-000001",
			stage: "planning",
			status: "started",
		};

		const scheduler = startInternalTaskPollingScheduler(
			{
				config: createConfig(30000),
				db,
				cliExecutor: {
					execute: async (request) => succeededResult(request),
					executeStream: async (request, emit) => {
						requests.push(request);
						emit({ type: "stdout", text: "hello " });
						emit({ type: "progress", event: progressEvent });
						emit({ type: "stderr", text: "warn\n" });
						await running;
						return succeededResult(request);
					},
					getHistory: () => [],
				},
				logger: createLogger(),
				realtimeEvents: { publish: (event) => realtimeEvents.push(event) },
			},
			{
				setIntervalFn: (_handler, timeoutMs) => {
					intervalCalls.push(timeoutMs);
					return 1 as unknown as InternalTaskPollingIntervalHandle;
				},
				clearIntervalFn: () => {},
			},
		);

		await waitFor(async () => {
			const [log] = await db.select().from(taskExecutionLogsTable);
			return parseLogLines(log?.log).length === 3 && log?.status === "running";
		});
		const runningLog = (await db.select().from(taskExecutionLogsTable))[0];
		const lines = parseLogLines(runningLog?.log);
		expect(lines.map((line) => line.event.kind)).toEqual([
			"log",
			"stage",
			"log",
		]);
		expect(realtimeEvents).toHaveLength(3);
		release?.();
		await waitFor(async () => {
			const [log] = await db.select().from(taskExecutionLogsTable);
			return log?.status === "success" && Boolean(log.finishedAt);
		});

		expect(intervalCalls).toEqual([30000]);
		expect(requests).toEqual([
			{ action: "run", projectId: "project-1", issueKey: "TASK-000001" },
		]);
		scheduler.stop();
	});

	it("marks rejected daemon runs failed and blocks still-ready tasks", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const db = testDatabase.db;
		await seedProjectTask(db, "todo");

		startInternalTaskPollingScheduler(
			{
				config: createConfig(30000),
				db,
				cliExecutor: {
					execute: async (request) => rejectedResult(request),
					executeStream: async (request, emit) => {
						emit({ type: "error", error: "daemon rejected task" });
						return rejectedResult(request);
					},
					getHistory: () => [],
				},
				logger: createLogger(),
			},
			{
				setIntervalFn: () => 1 as unknown as InternalTaskPollingIntervalHandle,
				clearIntervalFn: () => {},
			},
		);

		await waitFor(async () => {
			const [task] = await db.select().from(boardTasksTable);
			const [log] = await db.select().from(taskExecutionLogsTable);
			return task?.status === "blocked" && log?.status === "failed";
		});
		const [log] = await db.select().from(taskExecutionLogsTable);
		expect(log?.log).toContain("daemon rejected task");
	});

	it("skips overlapping ticks while a polling cycle is active", async () => {
		testDatabase = await createDrizzleServerTestDatabase();
		const db = testDatabase.db;
		await seedProjectTask(db, "todo");
		let tick: (() => void) | undefined;
		let release: (() => void) | undefined;
		const running = new Promise<void>((resolve) => {
			release = resolve;
		});
		let calls = 0;

		startInternalTaskPollingScheduler(
			{
				config: createConfig(30000),
				db,
				cliExecutor: {
					execute: async (request) => succeededResult(request),
					executeStream: async (request, _emit) => {
						calls += 1;
						await running;
						return succeededResult(request);
					},
					getHistory: () => [],
				},
				logger: createLogger(),
			},
			{
				setIntervalFn: (handler) => {
					tick = handler;
					return 1 as unknown as InternalTaskPollingIntervalHandle;
				},
				clearIntervalFn: () => {},
			},
		);

		await waitFor(() => calls === 1);
		tick?.();
		tick?.();
		await Promise.resolve();
		expect(calls).toBe(1);
		release?.();
		await waitFor(async () => {
			const [log] = await db.select().from(taskExecutionLogsTable);
			return log?.status === "success";
		});
		tick?.();
		await waitFor(() => calls === 2);
	});
});
