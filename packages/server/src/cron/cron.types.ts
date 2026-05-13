import type { LoadedConfig } from "adhdai/features/config";
import type { CronJobConfig, RunOptions } from "adhdai/features/types";

export interface RunCronOptions {
	jobId?: string;
}

export interface RunCronJobOnceOptions {
	jobId?: string;
}

export interface CronRuntimeState {
	readonly nextRunAtByJobId: ReadonlyMap<string, number>;
	readonly activeJobIds: ReadonlySet<string>;
}

export interface CronCycleState {
	nextRunAtByJobId: Map<string, number>;
	activeJobIds: Set<string>;
}

export interface CronJobRunDependencies {
	runWorkflow?: (config: LoadedConfig, options: RunOptions) => Promise<void>;
}

export interface CronSchedulerDependencies extends CronJobRunDependencies {
	now?: () => Date;
	sleep?: (ms: number) => Promise<void>;
}

export interface CronCycleDeps {
	now: () => Date;
	runWorkflow: (config: LoadedConfig, options: RunOptions) => Promise<void>;
}

export type SelectCronJobsFn = (
	config: LoadedConfig,
	jobId: string | undefined,
) => CronJobConfig[];
