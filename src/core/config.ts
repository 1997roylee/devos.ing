import { Database } from "bun:sqlite";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
	AdhdAiRootConfig,
	CodexReasoningEffort,
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
} from "./types";

const DEFAULT_CONFIG_FILE = "adhd-ai.config.ts";
const LOCAL_CONFIG_FILE = "adhd-ai.local.config.ts";
const LEGACY_CONFIG_FILE = "piv-loop.config.ts";
const SQLITE_ENV_DIR = path.join(".piv-loop", "config");
const SQLITE_ENV_DB_FILE = "env.sqlite";
const SQLITE_ENV_TABLE = "env_config";
const AUTO_SELECT_SKILLS_DB_FILE = "skills.sqlite";

type ResolvedEnv = Record<string, string | undefined>;

type RootOverride = DeepPartial<AdhdAiRootConfig>;
type LegacyOverride = DeepPartial<ProjectRuntimeConfig>;
type AnyOverride = RootOverride | LegacyOverride;

export interface LoadedConfig {
	projects: ResolvedProjectConfig[];
	polling: PollingConfig;
	automations: CronConfig;
	cron: CronConfig;
	notifications: ResolvedNotificationConfig;
}

export async function loadConfig(cwd: string): Promise<LoadedConfig> {
	const env = await loadResolvedEnv(cwd);
	const envBase = buildEnvBase(cwd, env);
	const envPolling = buildEnvPolling(env);
	const envNotifications = buildEnvNotifications(env);
	const loadedOverride = await loadConfigOverride(cwd);
	const root = normalizeOverrideToRoot(loadedOverride);
	assertNoProjectPolling(root.projects);
	assertNoProjectNotifications(root.projects);
	const projects = resolveProjects(cwd, envBase, root);
	const polling = resolvePolling(envPolling, root.polling);
	const automations = resolveAutomations(root.automations, root.cron);
	const cron = automations;
	const notifications = resolveNotifications(
		envNotifications,
		root.notifications,
	);
	validateProjects(projects);
	validatePolling(polling);
	validateCron(automations);
	validateNotifications(notifications);
	return { projects, polling, automations, cron, notifications };
}

export function getProjectById(
	config: LoadedConfig,
	projectId: string,
): ResolvedProjectConfig | undefined {
	return config.projects.find((project) => project.id === projectId);
}

async function loadResolvedEnv(cwd: string): Promise<ResolvedEnv> {
	const sqliteEnv = await loadSqliteEnv(cwd);
	const resolved: ResolvedEnv = { ...(sqliteEnv ?? {}) };
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			resolved[key] = value;
		}
	}
	return resolved;
}

export function sqliteEnvDbPath(cwd: string): string {
	return path.join(cwd, SQLITE_ENV_DIR, SQLITE_ENV_DB_FILE);
}

export async function loadSqliteEnv(
	cwd: string,
): Promise<Record<string, string> | undefined> {
	const dbPath = sqliteEnvDbPath(cwd);
	try {
		await access(dbPath);
	} catch {
		return undefined;
	}

	const db = new Database(dbPath, { readonly: true, create: false });
	try {
		const rows = db
			.query(`SELECT key, value FROM ${SQLITE_ENV_TABLE}`)
			.all() as Array<{ key: string; value: string }>;
		const loaded: Record<string, string> = {};
		for (const row of rows) {
			loaded[row.key] = row.value;
		}
		return loaded;
	} finally {
		db.close(false);
	}
}

export async function saveSqliteEnv(
	cwd: string,
	updates: Record<string, string | undefined>,
): Promise<void> {
	const dbPath = sqliteEnvDbPath(cwd);
	await mkdir(path.dirname(dbPath), { recursive: true });
	const db = new Database(dbPath, { create: true });
	try {
		db.run(
			`CREATE TABLE IF NOT EXISTS ${SQLITE_ENV_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
		);
		const upsert = db.query(
			`INSERT INTO ${SQLITE_ENV_TABLE} (key, value, updated_at)
			 VALUES (?1, ?2, ?3)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
		);
		const remove = db.query(`DELETE FROM ${SQLITE_ENV_TABLE} WHERE key = ?1`);
		const now = new Date().toISOString();
		for (const [key, value] of Object.entries(updates)) {
			if (value === undefined) {
				remove.run(key);
				continue;
			}
			upsert.run(key, value, now);
		}
	} finally {
		db.close(false);
	}
}

function buildEnvBase(cwd: string, env: ResolvedEnv): ProjectRuntimeConfig {
	const workspacePath = env.PIV_WORKSPACE_PATH ?? cwd;
	const sandbox = normalizeSandboxValue(env.CODEX_SANDBOX);
	const codexHome = normalizeOptionalValue(env.CODEX_HOME);
	return {
		workspacePath,
		executionPath: env.PIV_EXECUTION_PATH ?? workspacePath,
		repo: {
			owner: env.GITHUB_REPO_OWNER ?? "",
			name: env.GITHUB_REPO_NAME ?? "",
			baseBranch: env.GITHUB_BASE_BRANCH ?? "main",
		},
		linear: {
			apiKey: env.LINEAR_API_KEY ?? "",
			apiUrl: env.LINEAR_API_URL ?? "https://api.linear.app/graphql",
			projectId: normalizeOptionalValue(env.LINEAR_PROJECT_ID),
			teamId: env.LINEAR_TEAM_ID,
			requiredLabel: env.LINEAR_REQUIRED_LABEL,
			pollLimit: Number(env.PIV_POLL_LIMIT ?? "10"),
			statusMap: {
				assigned: env.LINEAR_STATUS_ASSIGNED ?? "Todo",
				planning: env.LINEAR_STATUS_PLANNING ?? "In Progress",
				implementing: env.LINEAR_STATUS_IMPLEMENTING ?? "In Progress",
				pr_created: env.LINEAR_STATUS_PR_CREATED ?? "In Review",
				reviewing: env.LINEAR_STATUS_REVIEWING ?? "In Review",
				testing: env.LINEAR_STATUS_TESTING ?? "In Review",
				blocked: env.LINEAR_STATUS_BLOCKED ?? "Canceled",
				done: env.LINEAR_STATUS_DONE ?? "Done",
			},
			labelMap: {
				pr_created: env.LINEAR_LABEL_PR_CREATED ?? "PR Created",
				reviewing: env.LINEAR_LABEL_REVIEWING ?? "Reviewing",
				testing: env.LINEAR_LABEL_TESTING ?? "Testing",
			},
			autoCreateLabels: env.LINEAR_AUTO_CREATE_LABELS !== "0",
		},
		github: {
			useGhCli: true,
			defaultBugLabel: env.GITHUB_BUG_LABEL ?? "bug",
		},
		codex: {
			binary: env.CODEX_BINARY ?? "codex",
			streamLogs: env.PIV_DEV_MODE === "1" || env.PIV_PRINT_CODEX_LOGS === "1",
			model: env.CODEX_MODEL,
			reasoningEffort: normalizeReasoningEffortValue(
				env.CODEX_REASONING_EFFORT,
				"CODEX_REASONING_EFFORT",
			),
			models: {
				plan: env.CODEX_MODEL_PLAN,
				implement: env.CODEX_MODEL_IMPLEMENT,
				reviewTest: env.CODEX_MODEL_REVIEW_TEST,
			},
			reasoningEfforts: {
				plan: normalizeReasoningEffortValue(
					env.CODEX_REASONING_EFFORT_PLAN,
					"CODEX_REASONING_EFFORT_PLAN",
				),
				implement: normalizeReasoningEffortValue(
					env.CODEX_REASONING_EFFORT_IMPLEMENT,
					"CODEX_REASONING_EFFORT_IMPLEMENT",
				),
				reviewTest: normalizeReasoningEffortValue(
					env.CODEX_REASONING_EFFORT_REVIEW_TEST,
					"CODEX_REASONING_EFFORT_REVIEW_TEST",
				),
			},
			fastModes: {
				plan: normalizeBooleanEnvValue(
					env.CODEX_FAST_MODE_PLAN,
					"CODEX_FAST_MODE_PLAN",
				),
				implement: normalizeBooleanEnvValue(
					env.CODEX_FAST_MODE_IMPLEMENT,
					"CODEX_FAST_MODE_IMPLEMENT",
				),
				reviewTest: normalizeBooleanEnvValue(
					env.CODEX_FAST_MODE_REVIEW_TEST,
					"CODEX_FAST_MODE_REVIEW_TEST",
				),
			},
			sandbox,
			codexHome,
		},
		skills: {
			root: path.join(cwd, "skills"),
			plan: path.join("piv-plan", "SKILL.md"),
			implement: path.join("piv-implement", "SKILL.md"),
			reviewTest: path.join("piv-review-test", "SKILL.md"),
			autoSelect: {
				enabled: false,
				sources: {
					folder: true,
					database: false,
				},
				databasePath: path.join(
					cwd,
					SQLITE_ENV_DIR,
					AUTO_SELECT_SKILLS_DB_FILE,
				),
				maxSelected: 3,
			},
		},
		agent: {
			backend: normalizeAgentBackend(env.AGENT_BACKEND),
			model: normalizeOptionalValue(env.CLAUDE_CODE_MODEL),
			maxTurns: parseOptionalPositiveInt(env.CLAUDE_CODE_MAX_TURNS),
			allowedTools: parseCommaList(env.CLAUDE_CODE_ALLOWED_TOOLS),
			permissionMode: normalizePermissionMode(env.CLAUDE_CODE_PERMISSION_MODE),
		},
		dryRun: env.PIV_DRY_RUN === "1",
	};
}

function buildEnvPolling(env: ResolvedEnv): PollingConfig {
	return {
		intervalMs: Number(env.PIV_POLL_INTERVAL_MS ?? "30000"),
		maxCycles: parseOptionalPositiveInt(env.PIV_MAX_POLL_CYCLES),
		exitWhenIdle: env.PIV_EXIT_WHEN_IDLE !== "0",
		staleRunTimeoutMs: Number(env.PIV_STALE_RUN_TIMEOUT_MS ?? "3600000"),
	};
}

function buildEnvNotifications(env: ResolvedEnv): ResolvedNotificationConfig {
	return {
		email: {
			enabled: false,
			resendApiKey: normalizeOptionalValue(env.RESEND_API_KEY),
			from: normalizeOptionalValue(env.RESEND_FROM),
			to: parseRecipientsFromEnv(env.RESEND_TO),
		},
	};
}

async function loadConfigOverride(cwd: string): Promise<AnyOverride> {
	for (const configFile of [
		LOCAL_CONFIG_FILE,
		DEFAULT_CONFIG_FILE,
		LEGACY_CONFIG_FILE,
	]) {
		const configPath = path.join(cwd, configFile);
		try {
			await access(configPath);
		} catch {
			continue;
		}

		const imported = await import(pathToFileURL(configPath).href);
		const override = imported.default ?? imported.config ?? {};
		return override as AnyOverride;
	}

	return {};
}

function normalizeOverrideToRoot(override: AnyOverride): AdhdAiRootConfig {
	if ("projects" in override && Array.isArray(override.projects)) {
		return override as AdhdAiRootConfig;
	}

	const legacy = override as DeepPartial<ProjectRuntimeConfig>;
	return {
		...legacy,
		projects: [
			{
				id: "default",
			},
		],
	};
}

function resolveProjects(
	configCwd: string,
	base: ProjectRuntimeConfig,
	root: AdhdAiRootConfig,
): ResolvedProjectConfig[] {
	const projectSpecs =
		root.projects.length > 0 ? root.projects : [{ id: "default" }];
	const rootDefaults = stripProjects(root);
	const resolved = projectSpecs.map((project) =>
		resolveProject(configCwd, base, rootDefaults, project),
	);
	return resolved;
}

function stripProjects(
	root: AdhdAiRootConfig,
): DeepPartial<ProjectRuntimeConfig> {
	const {
		projects: _,
		polling: __,
		automations: ___,
		cron: ____,
		notifications: _____,
		// keep root-only keys out of runtime project defaults
		...rest
	} = root;
	return rest;
}

function resolvePolling(
	base: PollingConfig,
	override: DeepPartial<PollingConfig> | undefined,
): PollingConfig {
	return {
		...base,
		...(override ?? {}),
	};
}

function resolveAutomations(
	automationsOverride: DeepPartial<CronConfig> | undefined,
	cronOverride: DeepPartial<CronConfig> | undefined,
): CronConfig {
	const jobs = automationsOverride?.jobs ?? cronOverride?.jobs;
	const fieldPath =
		automationsOverride?.jobs !== undefined ? "automations.jobs" : "cron.jobs";
	if (jobs === undefined) {
		return {
			jobs: buildDefaultCronJobs(),
		};
	}
	return {
		jobs: jobs.map((job, index) => resolveCronJob(job, index, fieldPath)),
	};
}

function buildDefaultCronJobs(): CronJobConfig[] {
	return [
		{
			id: "hourly-pr-review",
			name: "Hourly PR Review",
			enabled: true,
			schedule: {
				frequency: "hourly",
				every: 1,
				minute: 0,
			},
			run: {
				allProjects: true,
				reviewOnly: true,
			},
		},
		{
			id: "daily-codebase-maintenance",
			name: "Daily Codebase Maintenance",
			enabled: true,
			schedule: {
				frequency: "daily",
				time: "09:00",
			},
			run: {
				allProjects: true,
				poll: true,
				maxPollCycles: 1,
				exitWhenIdle: true,
			},
		},
	];
}

function resolveNotifications(
	base: ResolvedNotificationConfig,
	override: DeepPartial<NotificationConfig> | undefined,
): ResolvedNotificationConfig {
	const email = override?.email;
	const resendApiKey =
		typeof email?.resendApiKey === "string"
			? normalizeOptionalValue(email.resendApiKey)
			: base.email.resendApiKey;
	const from =
		typeof email?.from === "string"
			? normalizeOptionalValue(email.from)
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

function resolveNotificationEnabled(
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

function normalizeRecipientsOverride(input: unknown): string[] | undefined {
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

function parseRecipientsFromEnv(input: string | undefined): string[] {
	if (!input) {
		return [];
	}
	return input
		.split(",")
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
}

function resolveCronJob(
	job: DeepPartial<CronJobConfig>,
	index: number,
	fieldPath: string,
): CronJobConfig {
	if (!job || typeof job !== "object") {
		throw new Error(`${fieldPath}[${index}] must be an object`);
	}
	if (typeof job.id !== "string" || job.id.trim() === "") {
		throw new Error(`${fieldPath}[${index}].id is required`);
	}

	const resolvedSkills = resolveCronSkillOverrides(
		job.skills,
		index,
		fieldPath,
	);
	return {
		id: job.id.trim(),
		name:
			typeof job.name === "string" && job.name.trim()
				? job.name.trim()
				: undefined,
		enabled: job.enabled === undefined ? true : job.enabled === true,
		schedule: resolveCronSchedule(job.schedule, index, fieldPath),
		run: resolveCronRun(job.run, index, fieldPath),
		...(resolvedSkills ? { skills: resolvedSkills } : {}),
	};
}

function resolveCronSchedule(
	schedule: DeepPartial<CronJobSchedule> | undefined,
	index: number,
	fieldPath: string,
): CronJobSchedule {
	if (!schedule || typeof schedule !== "object") {
		throw new Error(`${fieldPath}[${index}].schedule is required`);
	}
	if (schedule.frequency === "minute") {
		return {
			frequency: "minute",
			every: parseOptionalPositiveIntStrict(
				schedule.every,
				`${fieldPath}[${index}].schedule.every`,
			),
		};
	}
	if (schedule.frequency === "hourly") {
		return {
			frequency: "hourly",
			every: parseOptionalPositiveIntStrict(
				schedule.every,
				`${fieldPath}[${index}].schedule.every`,
			),
			minute: parseOptionalPositiveIntStrict(
				schedule.minute,
				`${fieldPath}[${index}].schedule.minute`,
				true,
			),
		};
	}
	if (schedule.frequency === "daily") {
		if (typeof schedule.time !== "string") {
			throw new Error(`${fieldPath}[${index}].schedule.time is required`);
		}
		return {
			frequency: "daily",
			time: schedule.time,
		};
	}
	if (schedule.frequency === "weekly") {
		if (typeof schedule.time !== "string") {
			throw new Error(`${fieldPath}[${index}].schedule.time is required`);
		}
		if (typeof schedule.dayOfWeek !== "string") {
			throw new Error(`${fieldPath}[${index}].schedule.dayOfWeek is required`);
		}
		return {
			frequency: "weekly",
			dayOfWeek: schedule.dayOfWeek as CronScheduleDayOfWeek,
			time: schedule.time,
		};
	}

	throw new Error(
		`${fieldPath}[${index}].schedule.frequency must be one of minute, hourly, daily, weekly`,
	);
}

function resolveCronRun(
	run: DeepPartial<RunOptions> | undefined,
	index: number,
	fieldPath: string,
): RunOptions {
	if (!run || typeof run !== "object") {
		return {};
	}
	const projectId =
		typeof run.projectId === "string"
			? normalizeOptionalValue(run.projectId)
			: undefined;
	const issueArg =
		typeof run.issueArg === "string"
			? normalizeOptionalValue(run.issueArg)
			: undefined;
	const pollIntervalMs = parseOptionalPositiveIntStrict(
		run.pollIntervalMs,
		`${fieldPath}[${index}].run.pollIntervalMs`,
	);
	const maxPollCycles = parseOptionalPositiveIntStrict(
		run.maxPollCycles,
		`${fieldPath}[${index}].run.maxPollCycles`,
	);
	const exitWhenIdle =
		run.exitWhenIdle === undefined
			? undefined
			: run.exitWhenIdle === true
				? true
				: run.exitWhenIdle === false
					? false
					: invalidCronRunBoolean(
							`${fieldPath}[${index}].run.exitWhenIdle must be a boolean`,
						);
	const allProjects =
		run.allProjects === undefined
			? undefined
			: run.allProjects === true
				? true
				: run.allProjects === false
					? false
					: invalidCronRunBoolean(
							`${fieldPath}[${index}].run.allProjects must be a boolean`,
						);
	const poll =
		run.poll === undefined
			? undefined
			: run.poll === true
				? true
				: run.poll === false
					? false
					: invalidCronRunBoolean(
							`${fieldPath}[${index}].run.poll must be a boolean`,
						);
	const reviewOnly =
		run.reviewOnly === undefined
			? undefined
			: run.reviewOnly === true
				? true
				: run.reviewOnly === false
					? false
					: invalidCronRunBoolean(
							`${fieldPath}[${index}].run.reviewOnly must be a boolean`,
						);

	return {
		issueArg,
		projectId,
		allProjects,
		reviewOnly,
		poll,
		pollIntervalMs,
		maxPollCycles,
		exitWhenIdle,
	};
}

function resolveCronSkillOverrides(
	skills: unknown,
	index: number,
	fieldPath: string,
): CronJobConfig["skills"] {
	if (skills === undefined) {
		return undefined;
	}
	if (!skills || typeof skills !== "object") {
		throw new Error(`${fieldPath}[${index}].skills must be an object`);
	}

	const parsed = skills as {
		plan?: unknown;
		implement?: unknown;
		reviewTest?: unknown;
	};
	return {
		plan: normalizeSkillOverridePath(
			parsed.plan,
			`${fieldPath}[${index}].skills.plan`,
		),
		implement: normalizeSkillOverridePath(
			parsed.implement,
			`${fieldPath}[${index}].skills.implement`,
		),
		reviewTest: normalizeSkillOverridePath(
			parsed.reviewTest,
			`${fieldPath}[${index}].skills.reviewTest`,
		),
	};
}

function normalizeSkillOverridePath(
	input: unknown,
	field: string,
): string | undefined {
	if (input === undefined) {
		return undefined;
	}
	if (typeof input !== "string") {
		throw new Error(`${field} must be a string`);
	}
	return normalizeOptionalValue(input);
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

function resolveProject(
	configCwd: string,
	base: ProjectRuntimeConfig,
	rootDefaults: DeepPartial<ProjectRuntimeConfig>,
	project: ProjectConfig,
): ResolvedProjectConfig {
	const mergedRuntime = mergeRuntime(configCwd, base, rootDefaults, project);
	const id = project.id.trim();
	const name = project.name?.trim() || id;

	return {
		...mergedRuntime,
		id,
		name,
	};
}

function mergeRuntime(
	configCwd: string,
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

	const skillRoot =
		project.skills?.root ?? rootDefaults.skills?.root ?? base.skills.root;
	const mergedSkills = {
		plan: project.skills?.plan ?? rootDefaults.skills?.plan ?? base.skills.plan,
		implement:
			project.skills?.implement ??
			rootDefaults.skills?.implement ??
			base.skills.implement,
		reviewTest:
			project.skills?.reviewTest ??
			rootDefaults.skills?.reviewTest ??
			base.skills.reviewTest,
	};
	const mergedAutoSelect = resolveAutoSelectConfig(
		configCwd,
		base.skills.autoSelect,
		rootDefaults.skills?.autoSelect,
		project.skills?.autoSelect,
	);

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
			reasoningEfforts: {
				...(base.codex.reasoningEfforts ?? {}),
				...(rootDefaults.codex?.reasoningEfforts ?? {}),
				...(project.codex?.reasoningEfforts ?? {}),
			},
			fastModes: {
				...(base.codex.fastModes ?? {}),
				...(rootDefaults.codex?.fastModes ?? {}),
				...(project.codex?.fastModes ?? {}),
			},
		},
		skills: {
			root: skillRoot,
			plan: resolveSkillPath(skillRoot, mergedSkills.plan),
			implement: resolveSkillPath(skillRoot, mergedSkills.implement),
			reviewTest: resolveSkillPath(skillRoot, mergedSkills.reviewTest),
			autoSelect: mergedAutoSelect,
		},
		agent: {
			...base.agent,
			...(rootDefaults.agent ?? {}),
			...(project.agent ?? {}),
		},
		dryRun: project.dryRun ?? rootDefaults.dryRun ?? base.dryRun,
	};
}

function resolveSkillPath(root: string, input: string): string {
	if (path.isAbsolute(input)) {
		return input;
	}
	return path.resolve(root, input);
}

function resolveAutoSelectConfig(
	configCwd: string,
	base: ProjectRuntimeConfig["skills"]["autoSelect"] | undefined,
	rootOverride:
		| DeepPartial<NonNullable<ProjectRuntimeConfig["skills"]["autoSelect"]>>
		| undefined,
	projectOverride:
		| DeepPartial<NonNullable<ProjectRuntimeConfig["skills"]["autoSelect"]>>
		| undefined,
): NonNullable<ProjectRuntimeConfig["skills"]["autoSelect"]> {
	const mergedEnabled =
		projectOverride?.enabled ?? rootOverride?.enabled ?? base?.enabled ?? false;
	const mergedFolderSource =
		projectOverride?.sources?.folder ??
		rootOverride?.sources?.folder ??
		base?.sources?.folder ??
		true;
	const mergedDatabaseSource =
		projectOverride?.sources?.database ??
		rootOverride?.sources?.database ??
		base?.sources?.database ??
		false;
	const mergedDatabasePath = normalizeOptionalPath(
		projectOverride?.databasePath ??
			rootOverride?.databasePath ??
			base?.databasePath,
		configCwd,
	);
	const mergedMaxSelected = normalizeMaxSelected(
		projectOverride?.maxSelected ??
			rootOverride?.maxSelected ??
			base?.maxSelected,
	);

	return {
		enabled: mergedEnabled === true,
		sources: {
			folder: mergedFolderSource === true,
			database: mergedDatabaseSource === true,
		},
		databasePath: mergedDatabasePath,
		maxSelected: mergedMaxSelected,
	};
}

function normalizeOptionalPath(
	input: unknown,
	baseDir: string,
): string | undefined {
	if (typeof input !== "string") {
		return undefined;
	}
	const trimmed = input.trim();
	if (!trimmed) {
		return undefined;
	}
	return path.isAbsolute(trimmed)
		? trimmed
		: path.resolve(baseDir || process.cwd(), trimmed);
}

function normalizeMaxSelected(input: unknown): number {
	if (typeof input !== "number" || !Number.isInteger(input) || input <= 0) {
		return 3;
	}
	return input;
}

function parseOptionalPositiveInt(
	value: string | undefined,
): number | undefined {
	if (!value) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return undefined;
	}
	return parsed;
}

function validateProjects(projects: ResolvedProjectConfig[]): void {
	if (projects.length === 0) {
		throw new Error("At least one project configuration is required");
	}

	const seen = new Set<string>();
	for (const project of projects) {
		if (!project.id) {
			throw new Error("Project id cannot be empty");
		}
		if (seen.has(project.id)) {
			throw new Error(`Duplicate project id: ${project.id}`);
		}
		seen.add(project.id);
		validateProject(project);
	}
}

function parseCommaList(input: string | undefined): string[] | undefined {
	if (!input || !input.trim()) {
		return undefined;
	}
	const items = input
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
	return items.length > 0 ? items : undefined;
}

function normalizeOptionalValue(input: string | undefined): string | undefined {
	if (!input) {
		return undefined;
	}
	const value = input.trim();
	return value ? value : undefined;
}

function normalizeSandboxValue(
	input: string | undefined,
): ProjectRuntimeConfig["codex"]["sandbox"] | undefined {
	if (!input) {
		return undefined;
	}

	const value = input.trim().toLowerCase();
	if (!value || value === "off" || value === "none" || value === "0") {
		return undefined;
	}

	if (value === "read-only") {
		return "read-only";
	}
	if (value === "workspace-write") {
		return "workspace-write";
	}
	if (value === "danger-full-access") {
		return "danger-full-access";
	}

	throw new Error(
		`Invalid CODEX_SANDBOX value '${input}'. Use read-only, workspace-write, danger-full-access, or leave empty.`,
	);
}

function normalizeReasoningEffortValue(
	input: string | undefined,
	envName: string,
): CodexReasoningEffort | undefined {
	if (!input) {
		return undefined;
	}

	const value = input.trim().toLowerCase();
	if (!value || value === "off" || value === "none" || value === "0") {
		return undefined;
	}
	if (
		value === "low" ||
		value === "medium" ||
		value === "high" ||
		value === "xhigh"
	) {
		return value;
	}

	throw new Error(
		`Invalid ${envName} value '${input}'. Use low, medium, high, xhigh, or leave empty.`,
	);
}

function normalizeBooleanEnvValue(
	input: string | undefined,
	envName: string,
): boolean | undefined {
	if (!input) {
		return undefined;
	}

	const value = input.trim().toLowerCase();
	if (!value || value === "off" || value === "none") {
		return undefined;
	}
	if (value === "1" || value === "true" || value === "yes" || value === "on") {
		return true;
	}
	if (value === "0" || value === "false" || value === "no") {
		return false;
	}

	throw new Error(
		`Invalid ${envName} value '${input}'. Use true/false, 1/0, yes/no, or leave empty.`,
	);
}

function validateProject(project: ResolvedProjectConfig): void {
	if (!project.linear.apiKey) {
		throw new Error(`LINEAR_API_KEY is required for project '${project.id}'`);
	}
	if (!project.executionPath) {
		throw new Error(`Execution path is required for project '${project.id}'`);
	}

	const requiredStateIds = Object.entries(project.linear.statusMap).filter(
		([, value]) => !value,
	);
	if (requiredStateIds.length > 0) {
		throw new Error(
			`Missing Linear status ids for project '${project.id}': ${requiredStateIds
				.map(([key]) => key)
				.join(", ")}`,
		);
	}
}

function validatePolling(polling: PollingConfig): void {
	if (!Number.isInteger(polling.intervalMs) || polling.intervalMs <= 0) {
		throw new Error("Polling interval must be a positive integer");
	}
	if (
		polling.maxCycles !== undefined &&
		(!Number.isInteger(polling.maxCycles) || polling.maxCycles <= 0)
	) {
		throw new Error("Polling max cycles must be a positive integer");
	}
	if (
		!Number.isInteger(polling.staleRunTimeoutMs) ||
		polling.staleRunTimeoutMs <= 0
	) {
		throw new Error("Polling stale run timeout must be a positive integer");
	}
}

function validateCron(cron: CronConfig): void {
	const seen = new Set<string>();
	for (const job of cron.jobs) {
		if (seen.has(job.id)) {
			throw new Error(`Duplicate cron job id: ${job.id}`);
		}
		seen.add(job.id);
		validateCronSchedule(job.id, job.schedule);
		validateCronRun(job.id, job.run);
	}
}

function validateNotifications(
	notifications: ResolvedNotificationConfig,
): void {
	const { email } = notifications;
	if (!email.enabled) {
		return;
	}
	if (!email.resendApiKey) {
		throw new Error(
			"notifications.email.resendApiKey (or RESEND_API_KEY) is required when email notifications are enabled",
		);
	}
	if (!email.from) {
		throw new Error(
			"notifications.email.from (or RESEND_FROM) is required when email notifications are enabled",
		);
	}
	if (email.to.length === 0) {
		throw new Error(
			"notifications.email.to (or RESEND_TO) must include at least one recipient when email notifications are enabled",
		);
	}
}

function validateCronSchedule(jobId: string, schedule: CronJobSchedule): void {
	if (schedule.frequency === "minute") {
		const every = schedule.every ?? 1;
		if (!Number.isInteger(every) || every <= 0 || every > 59) {
			throw new Error(
				`Cron job '${jobId}' minute schedule.every must be between 1 and 59`,
			);
		}
		return;
	}
	if (schedule.frequency === "hourly") {
		const every = schedule.every ?? 1;
		const minute = schedule.minute ?? 0;
		if (!Number.isInteger(every) || every <= 0 || every > 24) {
			throw new Error(
				`Cron job '${jobId}' hourly schedule.every must be between 1 and 24`,
			);
		}
		if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
			throw new Error(
				`Cron job '${jobId}' hourly schedule.minute must be between 0 and 59`,
			);
		}
		return;
	}
	if (schedule.frequency === "daily") {
		assertValidTime(jobId, schedule.time);
		return;
	}
	assertValidDayOfWeek(jobId, schedule.dayOfWeek);
	assertValidTime(jobId, schedule.time);
}

function validateCronRun(jobId: string, run: RunOptions): void {
	if (run.projectId && run.allProjects) {
		throw new Error(
			`Cron job '${jobId}' run cannot use projectId with allProjects`,
		);
	}
	if (run.reviewOnly && run.issueArg) {
		throw new Error(
			`Cron job '${jobId}' run cannot use issueArg with reviewOnly`,
		);
	}
}

function assertValidTime(jobId: string, time: string): void {
	if (!/^\d{2}:\d{2}$/.test(time)) {
		throw new Error(`Cron job '${jobId}' time must be in HH:mm 24-hour format`);
	}
	const [hourRaw, minuteRaw] = time.split(":");
	const hour = Number(hourRaw);
	const minute = Number(minuteRaw);
	if (
		!Number.isInteger(hour) ||
		!Number.isInteger(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		throw new Error(`Cron job '${jobId}' time must be in HH:mm 24-hour format`);
	}
}

function assertValidDayOfWeek(
	jobId: string,
	dayOfWeek: CronScheduleDayOfWeek,
): void {
	const allowed = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
	if (!allowed.includes(dayOfWeek)) {
		throw new Error(
			`Cron job '${jobId}' weekly dayOfWeek must be one of: ${allowed.join(", ")}`,
		);
	}
}

function assertNoProjectPolling(projects: ProjectConfig[]): void {
	for (const project of projects) {
		if ("polling" in (project as unknown as Record<string, unknown>)) {
			throw new Error(
				`Project-level polling config is not supported for project '${project.id}'. Configure polling once at root level.`,
			);
		}
	}
}

function assertNoProjectNotifications(projects: ProjectConfig[]): void {
	for (const project of projects) {
		if ("notifications" in (project as unknown as Record<string, unknown>)) {
			throw new Error(
				`Project-level notifications config is not supported for project '${project.id}'. Configure notifications once at root level.`,
			);
		}
	}
}

function normalizeAgentBackend(
	value: string | undefined,
): "codex" | "claude-code" | undefined {
	if (!value) {
		return undefined;
	}
	const normalized = value.trim().toLowerCase();
	if (normalized === "codex" || normalized === "claude-code") {
		return normalized;
	}
	throw new Error(
		`Invalid AGENT_BACKEND value: '${value}'. Must be 'codex' or 'claude-code'.`,
	);
}

type ClaudePermissionMode = NonNullable<
	NonNullable<ResolvedProjectConfig["agent"]>["permissionMode"]
>;

const VALID_PERMISSION_MODES: readonly ClaudePermissionMode[] = [
	"default",
	"acceptEdits",
	"bypassPermissions",
	"dontAsk",
	"plan",
];

function normalizePermissionMode(
	value: string | undefined,
): ClaudePermissionMode | undefined {
	if (!value) {
		return undefined;
	}
	const normalized = value.trim();
	if ((VALID_PERMISSION_MODES as readonly string[]).includes(normalized)) {
		return normalized as ClaudePermissionMode;
	}
	throw new Error(
		`Invalid CLAUDE_CODE_PERMISSION_MODE value: '${value}'. Must be one of: ${VALID_PERMISSION_MODES.join(", ")}.`,
	);
}
