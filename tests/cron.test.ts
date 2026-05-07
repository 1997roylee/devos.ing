import { describe, expect, it } from "bun:test";
import type { LoadedConfig } from "../src/core/config";
import type { CronJobConfig } from "../src/core/types";
import {
	computeNextCronRunAt,
	runCronSchedulerCycle,
	selectCronJobs,
} from "../src/services/cron";

describe("computeNextCronRunAt", () => {
	it("computes minute schedules", () => {
		const next = computeNextCronRunAt(
			{ frequency: "minute", every: 5 },
			new Date(2026, 4, 7, 10, 2, 35),
		);
		expect(next.getMinutes()).toBe(5);
		expect(next.getSeconds()).toBe(0);
	});

	it("computes hourly schedules", () => {
		const next = computeNextCronRunAt(
			{ frequency: "hourly", every: 2, minute: 15 },
			new Date(2026, 4, 7, 10, 20, 0),
		);
		expect(next.getHours()).toBe(12);
		expect(next.getMinutes()).toBe(15);
	});

	it("computes daily schedules", () => {
		const next = computeNextCronRunAt(
			{ frequency: "daily", time: "09:30" },
			new Date(2026, 4, 7, 9, 40, 0),
		);
		expect(next.getDate()).toBe(8);
		expect(next.getHours()).toBe(9);
		expect(next.getMinutes()).toBe(30);
	});

	it("computes weekly schedules", () => {
		const next = computeNextCronRunAt(
			{ frequency: "weekly", dayOfWeek: "mon", time: "08:00" },
			new Date(2026, 4, 7, 9, 0, 0),
		);
		expect(next.getDay()).toBe(1);
		expect(next.getHours()).toBe(8);
		expect(next.getMinutes()).toBe(0);
	});
});

describe("selectCronJobs", () => {
	it("filters disabled jobs", () => {
		const config = createLoadedConfig([
			{
				id: "enabled",
				schedule: { frequency: "minute" },
				enabled: true,
				run: {},
			},
			{
				id: "disabled",
				schedule: { frequency: "minute" },
				enabled: false,
				run: {},
			},
		]);

		expect(selectCronJobs(config, undefined).map((job) => job.id)).toEqual([
			"enabled",
		]);
	});

	it("selects one enabled job by id", () => {
		const config = createLoadedConfig([
			{ id: "a", schedule: { frequency: "minute" }, run: {} },
			{ id: "b", schedule: { frequency: "minute" }, run: {} },
		]);
		expect(selectCronJobs(config, "b").map((job) => job.id)).toEqual(["b"]);
	});
});

describe("runCronSchedulerCycle", () => {
	it("starts due jobs and advances next run", async () => {
		const now = new Date(2026, 4, 7, 10, 0, 0);
		const jobs: CronJobConfig[] = [
			{
				id: "due",
				schedule: { frequency: "minute", every: 5 },
				enabled: true,
				run: { projectId: "default" },
			},
		];
		const state = {
			nextRunAtByJobId: new Map<string, number>([
				["due", now.getTime() - 1000],
			]),
			activeJobIds: new Set<string>(),
		};
		let called = 0;
		let release: (() => void) | undefined;
		const running = new Promise<void>((resolve) => {
			release = resolve;
		});

		await runCronSchedulerCycle(createLoadedConfig(jobs), jobs, state, {
			now: () => now,
			runWorkflow: async () => {
				called += 1;
				await running;
			},
		});

		expect(called).toBe(1);
		expect(state.activeJobIds.has("due")).toBe(true);
		expect(state.nextRunAtByJobId.get("due")).toBeGreaterThanOrEqual(
			now.getTime(),
		);
		release?.();
		await Promise.resolve();
	});

	it("skips overlapping due jobs", async () => {
		const now = new Date(2026, 4, 7, 10, 0, 0);
		const jobs: CronJobConfig[] = [
			{
				id: "busy",
				schedule: { frequency: "minute", every: 1 },
				enabled: true,
				run: {},
			},
		];
		const state = {
			nextRunAtByJobId: new Map<string, number>([
				["busy", now.getTime() - 60000],
			]),
			activeJobIds: new Set<string>(["busy"]),
		};
		let called = 0;

		await runCronSchedulerCycle(createLoadedConfig(jobs), jobs, state, {
			now: () => now,
			runWorkflow: async () => {
				called += 1;
			},
		});

		expect(called).toBe(0);
		expect(state.nextRunAtByJobId.get("busy")).toBeGreaterThan(now.getTime());
	});
});

function createLoadedConfig(jobs: CronJobConfig[]): LoadedConfig {
	return {
		projects: [],
		polling: {
			intervalMs: 30000,
			maxCycles: undefined,
			exitWhenIdle: true,
			staleRunTimeoutMs: 3600000,
		},
		cron: { jobs },
		notifications: {
			email: {
				enabled: false,
				to: [],
			},
		},
	};
}
