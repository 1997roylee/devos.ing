import type { PollingConfig, RunOptions } from "../../features/types";
import type { PollingSettings } from "./workflow.types";

export function resolvePollingSettings(
	pollingConfig: PollingConfig,
	options: RunOptions,
): PollingSettings {
	const pollForever = options.pollForever === true;
	return {
		enabled: options.poll === true || pollForever,
		intervalMs: options.pollIntervalMs ?? pollingConfig.intervalMs,
		maxCycles: pollForever
			? undefined
			: (options.maxPollCycles ?? pollingConfig.maxCycles),
		exitWhenIdle: pollForever
			? false
			: (options.exitWhenIdle ?? pollingConfig.exitWhenIdle),
		staleRunTimeoutMs: pollingConfig.staleRunTimeoutMs,
	};
}

export function shouldStopPolling(
	polling: PollingSettings,
	options: RunOptions,
	cycle: number,
	totalIssues: number,
	cycleHadError = false,
): boolean {
	if (!polling.enabled || options.issueArg) {
		return true;
	}
	if (polling.maxCycles !== undefined && cycle >= polling.maxCycles) {
		return true;
	}
	if (totalIssues === 0 && polling.exitWhenIdle && !cycleHadError) {
		return true;
	}
	return false;
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}
