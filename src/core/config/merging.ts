/**
 * Configuration merging utilities for ADHD.ai.
 * Handles deep merging of config overrides and project resolution.
 */

import type {
	AdhdAiRootConfig,
	CronConfig,
	CronJobConfig,
	CronJobSchedule,
	CronScheduleDayOfWeek,
	DeepPartial,
	NotificationConfig,
	PollingConfig,
	ProjectConfig,
	ProjectRuntimeConfig,
	ResolvedNotificationConfig,
	ResolvedProjectConfig,
	RunOptions,
} from "../types";

export function resolveProjects(
	base: ProjectRuntimeConfig,
	root: AdhdAiRootConfig,
): ResolvedProjectConfig[] {
	const projectSpecs =
		root.projects.length > 0 ? root.projects : [{ id: "default" }];
	const rootDefaults = stripProjects(root);
	const resolved = projectSpecs.map((project) =>
		resolveProject(base, rootDefaults, project),
	);
	return resolved;
}

export function stripProjects(
	root: AdhdAiRootConfig,
): DeepPartial<ProjectRuntimeConfig> {
	const {
		projects: _,
		polling: __,
		cron: ___,
		notifications: ____,
		...rest
	} = root;
	return rest;
}

export function resolveProject(
	base: ProjectRuntimeConfig,
	rootDefaults: DeepPartial<ProjectRuntimeConfig>,
	project: ProjectConfig,
): ResolvedProjectConfig {
	const mergedRuntime = mergeRuntime(base, rootDefaults, project);
	const id = project.id.trim();
	const name = project.name?.trim() || id;

	return {
		...mergedRuntime,
		id,
		name,
	};
}

export function mergeRuntime(
	base: ProjectRuntimeConfig,
	rootDefaults: DeepPartial<ProjectRuntimeConfig>,
	project: ProjectConfig,
): ProjectRuntimeConfig {
	const workspacePath =
		project.workspacePath ?? rootDefaults.workspacePath ?? base.workspacePath;
	const executionPath =
		project.executionPath ??
		rootDefaults.executionPath ??
		project.workspacePath ??
		rootDefaults.workspacePath ??
		base.executionPath;

	return {
		workspacePath,
		executionPath,
		repo: {
			...base.repo,
			...(rootDefaults.repo ?? {}),
			...(project.repo ?? {}),
		},
		linear: {
			...base.linear,
			...(rootDefaults.linear ?? {}),
			...(project.linear ?? {}),
			statusMap: {
				...base.linear.statusMap,
				...(rootDefaults.linear?.statusMap ?? {}),
				...(project.linear?.statusMap ?? {}),
			},
			labelMap: {
				...base.linear.labelMap,
				...(rootDefaults.linear?.labelMap ?? {}),
				...(project.linear?.labelMap ?? {}),
			},
		},
		github: {
			...base.github,
			...(rootDefaults.github ?? {}),
			...(project.github ?? {}),
		},
		codex: {
			...base.codex,
			...(rootDefaults.codex ?? {}),
			...(project.codex ?? {}),
		},
		skills: {
			...base.skills,
			...(rootDefaults.skills ?? {}),
			...(project.skills ?? {}),
		},
		agent: {
			...base.agent,
			...(rootDefaults.agent ?? {}),
			...(project.agent ?? {}),
		},
		dryRun: project.dryRun ?? rootDefaults.dryRun ?? base.dryRun,
	};
}

export function resolvePolling(
	envPolling: {
		intervalMs: number;
		maxCycles?: number;
		exitWhenIdle?: boolean;
		staleRunTimeoutMs?: number;
	},
	rootPolling?: DeepPartial<PollingConfig>,
): PollingConfig {
	return {
		intervalMs: envPolling.intervalMs,
		maxCycles: rootPolling?.maxCycles ?? envPolling.maxCycles ?? undefined,
		exitWhenIdle: rootPolling?.exitWhenIdle ?? envPolling.exitWhenIdle ?? true,
		staleRunTimeoutMs:
			rootPolling?.staleRunTimeoutMs ?? envPolling.staleRunTimeoutMs ?? 3600000,
	};
}

export function resolveCron(override?: DeepPartial<CronConfig>): CronConfig {
	const jobs = override?.jobs ?? [];
	return {
		jobs: jobs.map((job, index) => resolveCronJob(job, index)),
	};
}

export function resolveNotifications(
	base: ResolvedNotificationConfig,
	override?: DeepPartial<NotificationConfig>,
): ResolvedNotificationConfig {
	const email = override?.email;
	const resendApiKey =
		typeof email?.resendApiKey === "string"
			? normalizeOptionalString(email.resendApiKey)
			: base.email.resendApiKey;
	const from =
		typeof email?.from === "string"
			? normalizeOptionalString(email.from)
			: base.email.from;
	const to = normalizeRecipientsOverride(email?.to) ?? base.email.to;
	const enabled = resolveNotificationEnabled(email?.enabled, resendApiKey);

	return {
		email: {
			enabled,
			resendApiKey,
			from,
			to,
		},
	};
}

export function resolveNotificationEnabled(
	input: unknown,
	resendApiKey: string | undefined,
): boolean {
	if (input === undefined) {
		return Boolean(resendApiKey);
	}
	if (input === true) {
		return true;
	}
	if (input === false) {
		return false;
	}
	throw new Error("notifications.email.enabled must be a boolean");
}

export function normalizeRecipientsOverride(
	input: unknown,
): string[] | undefined {
	if (input === undefined) {
		return undefined;
	}
	if (!Array.isArray(input)) {
		throw new Error("notifications.email.to must be an array of email strings");
	}

	const recipients = input.map((value, index) => {
		if (typeof value !== "string") {
			throw new Error(
				`notifications.email.to[${index}] must be an email string`,
			);
		}
		return value.trim();
	});
	return recipients.filter((recipient) => recipient.length > 0);
}

export function resolveCronJob(
	job: DeepPartial<CronJobConfig>,
	index: number,
): CronJobConfig {
	if (!job || typeof job !== "object") {
		throw new Error(`cron.jobs[${index}] must be an object`);
	}
	if (typeof job.id !== "string" || job.id.trim() === "") {
		throw new Error(`cron.jobs[${index}].id is required`);
	}

	return {
		id: job.id.trim(),
		name:
			typeof job.name === "string" && job.name.trim()
				? job.name.trim()
				: undefined,
		enabled: job.enabled === undefined ? true : job.enabled === true,
		schedule: resolveCronSchedule(job.schedule, index),
		run: resolveCronRun(job.run, index),
	};
}

export function resolveCronSchedule(
	schedule: DeepPartial<CronJobSchedule> | undefined,
	index: number,
): CronJobSchedule {
	if (!schedule || typeof schedule !== "object") {
		throw new Error(`cron.jobs[${index}].schedule is required`);
	}
	if (schedule.frequency === "minute") {
		return {
			frequency: "minute",
			every: parseOptionalPositiveIntStrict(
				schedule.every,
				`cron.jobs[${index}].schedule.every`,
			),
		};
	}
	if (schedule.frequency === "hourly") {
		return {
			frequency: "hourly",
			every: parseOptionalPositiveIntStrict(
				schedule.every,
				`cron.jobs[${index}].schedule.every`,
			),
			minute: parseOptionalPositiveIntStrict(
				schedule.minute,
				`cron.jobs[${index}].schedule.minute`,
				true,
			),
		};
	}
	if (schedule.frequency === "daily") {
		if (typeof schedule.time !== "string") {
			throw new Error(`cron.jobs[${index}].schedule.time is required`);
		}
		return {
			frequency: "daily",
			time: schedule.time,
		};
	}
	if (schedule.frequency === "weekly") {
		if (typeof schedule.time !== "string") {
			throw new Error(`cron.jobs[${index}].schedule.time is required`);
		}
		if (typeof schedule.dayOfWeek !== "string") {
			throw new Error(`cron.jobs[${index}].schedule.dayOfWeek is required`);
		}
		return {
			frequency: "weekly",
			dayOfWeek: schedule.dayOfWeek as CronScheduleDayOfWeek,
			time: schedule.time,
		};
	}

	throw new Error(
		`cron.jobs[${index}].schedule.frequency must be one of minute, hourly, daily, weekly`,
	);
}

export function resolveCronRun(
	run: DeepPartial<RunOptions> | undefined,
	index: number,
): RunOptions {
	if (!run || typeof run !== "object") {
		return {};
	}
	const projectId =
		typeof run.projectId === "string"
			? normalizeOptionalString(run.projectId)
			: undefined;
	const issueArg =
		typeof run.issueArg === "string"
			? normalizeOptionalString(run.issueArg)
			: undefined;
	const pollIntervalMs = parseOptionalPositiveIntStrict(
		run.pollIntervalMs,
		`cron.jobs[${index}].run.pollIntervalMs`,
	);
	const maxPollCycles = parseOptionalPositiveIntStrict(
		run.maxPollCycles,
		`cron.jobs[${index}].run.maxPollCycles`,
	);
	const exitWhenIdle =
		run.exitWhenIdle === undefined
			? undefined
			: run.exitWhenIdle === true
				? true
				: run.exitWhenIdle === false
					? false
					: invalidCronRunBoolean(
							`cron.jobs[${index}].run.exitWhenIdle must be a boolean`,
						);
	const allProjects =
		run.allProjects === undefined
			? undefined
			: run.allProjects === true
				? true
				: run.allProjects === false
					? false
					: invalidCronRunBoolean(
							`cron.jobs[${index}].run.allProjects must be a boolean`,
						);
	const poll =
		run.poll === undefined
			? undefined
			: run.poll === true
				? true
				: run.poll === false
					? false
					: invalidCronRunBoolean(
							`cron.jobs[${index}].run.poll must be a boolean`,
						);

	return {
		issueArg,
		projectId,
		allProjects,
		poll,
		pollIntervalMs,
		maxPollCycles,
		exitWhenIdle,
	};
}

function invalidCronRunBoolean(_message: string): never {
	throw new Error(_message);
}

function parseOptionalPositiveIntStrict(
	input: unknown,
	field: string,
	allowZero = false,
): number | undefined {
	if (input === undefined) {
		return undefined;
	}
	if (typeof input !== "number" || !Number.isInteger(input)) {
		throw new Error(`${field} must be an integer`);
	}
	if (allowZero) {
		if (input < 0) {
			throw new Error(`${field} must be zero or a positive integer`);
		}
		return input;
	}
	if (input <= 0) {
		throw new Error(`${field} must be a positive integer`);
	}
	return input;
}

function normalizeOptionalString(
	input: string | undefined,
): string | undefined {
	if (!input) {
		return undefined;
	}
	const value = input.trim();
	return value ? value : undefined;
}
