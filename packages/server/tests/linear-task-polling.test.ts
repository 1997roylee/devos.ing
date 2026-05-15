import { describe, expect, it } from "bun:test";
import type { LoadedConfig } from "devos/features/config";
import type { CliCommandExecutionResult } from "devos/features/server";
import { startLinearTaskPollingScheduler } from "../src/features/polling";
import type { LinearTaskPollingIntervalHandle } from "../src/features/polling";
import type { ServerLogger } from "../src/logger.types";

describe("startLinearTaskPollingScheduler", () => {
	it("uses configured polling interval and dispatches a single-cycle run", async () => {
		const setIntervalCalls: number[] = [];
		let tick: (() => void) | undefined;
		const clearCalls: LinearTaskPollingIntervalHandle[] = [];
		const requests: unknown[] = [];

		const scheduler = startLinearTaskPollingScheduler(
			{
				config: createConfig(45000),
				cliExecutor: {
					execute: async (request) => {
						requests.push(request);
						return succeededResult(request);
					},
					executeStream: async (request) => succeededResult(request),
					getHistory: () => [],
				},
				logger: createLogger(),
			},
			{
				setIntervalFn: (handler, timeoutMs) => {
					tick = handler;
					setIntervalCalls.push(timeoutMs);
					return 123 as unknown as LinearTaskPollingIntervalHandle;
				},
				clearIntervalFn: (handle) => {
					clearCalls.push(handle);
				},
			},
		);

		await Promise.resolve();
		expect(setIntervalCalls).toEqual([45000]);
		expect(requests).toEqual([
			{
				action: "run",
				allProjects: true,
				poll: true,
				maxPollCycles: 1,
			},
		]);

		tick?.();
		await Promise.resolve();
		expect(requests).toHaveLength(2);

		scheduler.stop();
		expect(clearCalls).toEqual([
			123 as unknown as LinearTaskPollingIntervalHandle,
		]);
	});

	it("skips overlapping ticks while dispatch is in flight", async () => {
		let tick: (() => void) | undefined;
		const requests: unknown[] = [];
		let release: (() => void) | undefined;
		const running = new Promise<void>((resolve) => {
			release = resolve;
		});

		startLinearTaskPollingScheduler(
			{
				config: createConfig(30000),
				cliExecutor: {
					execute: async (request) => {
						requests.push(request);
						await running;
						return succeededResult(request);
					},
					executeStream: async (request) => succeededResult(request),
					getHistory: () => [],
				},
				logger: createLogger(),
			},
			{
				setIntervalFn: (handler) => {
					tick = handler;
					return 1 as unknown as LinearTaskPollingIntervalHandle;
				},
				clearIntervalFn: () => {},
			},
		);

		await Promise.resolve();
		tick?.();
		tick?.();
		await Promise.resolve();
		expect(requests).toHaveLength(1);

		release?.();
		await running;
		await Promise.resolve();
		tick?.();
		await Promise.resolve();
		expect(requests).toHaveLength(2);
	});

	it("continues polling after dispatch failures", async () => {
		let tick: (() => void) | undefined;
		let calls = 0;

		startLinearTaskPollingScheduler(
			{
				config: createConfig(30000),
				cliExecutor: {
					execute: async (request) => {
						calls += 1;
						if (calls === 1) {
							throw new Error("boom");
						}
						return succeededResult(request);
					},
					executeStream: async (request) => succeededResult(request),
					getHistory: () => [],
				},
				logger: createLogger(),
			},
			{
				setIntervalFn: (handler) => {
					tick = handler;
					return 1 as unknown as LinearTaskPollingIntervalHandle;
				},
				clearIntervalFn: () => {},
			},
		);

		await Promise.resolve();
		expect(calls).toBe(1);
		tick?.();
		await Promise.resolve();
		expect(calls).toBe(2);
	});
});

function createConfig(intervalMs: number): LoadedConfig {
	return {
		projects: [],
		polling: {
			intervalMs,
			maxCycles: undefined,
			exitWhenIdle: true,
			staleRunTimeoutMs: 3600000,
		},
		notifications: {
			email: {
				enabled: false,
				to: [],
			},
		},
	};
}

function succeededResult(request: unknown): CliCommandExecutionResult {
	return {
		status: "succeeded",
		request: request as { action: string },
	};
}

function createLogger(): ServerLogger {
	return {
		info: () => {},
		error: () => {},
		fatal: () => {},
	};
}
