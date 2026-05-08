/**
 * Environment variable resolution for ADHD.ai configuration.
 * Reads env vars and converts to strongly-typed config values.
 */

import path from "node:path";
import type {
	PollingConfig,
	ProjectRuntimeConfig,
	ResolvedNotificationConfig,
} from "../types";

export function buildEnvBase(cwd: string): ProjectRuntimeConfig {
	const env = process.env;
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
			models: {
				plan: env.CODEX_MODEL_PLAN,
				implement: env.CODEX_MODEL_IMPLEMENT,
				reviewTest: env.CODEX_MODEL_REVIEW_TEST,
			},
			sandbox,
			codexHome,
		},
		skills: {
			plan: path.join(cwd, "skills", "piv-plan", "SKILL.md"),
			implement: path.join(cwd, "skills", "piv-implement", "SKILL.md"),
			reviewTest: path.join(cwd, "skills", "piv-review-test", "SKILL.md"),
		},
		agent: {
			backend: normalizeAgentBackend(env.AGENT_BACKEND),
		},
		dryRun: env.PIV_DRY_RUN === "1",
	};
}

export function buildEnvPolling(): PollingConfig {
	const env = process.env;
	return {
		intervalMs: Number(env.PIV_POLL_INTERVAL_MS ?? "30000"),
		maxCycles: parseOptionalPositiveInt(env.PIV_MAX_POLL_CYCLES),
		exitWhenIdle: env.PIV_EXIT_WHEN_IDLE !== "0",
		staleRunTimeoutMs: Number(env.PIV_STALE_RUN_TIMEOUT_MS ?? "3600000"),
	};
}

export function buildEnvNotifications(): ResolvedNotificationConfig {
	const env = process.env;
	return {
		email: {
			enabled: false,
			resendApiKey: normalizeOptionalValue(env.RESEND_API_KEY),
			from: normalizeOptionalValue(env.RESEND_FROM),
			to: parseRecipientsFromEnv(env.RESEND_TO),
		},
	};
}

export function normalizeOptionalValue(
	input: string | undefined,
): string | undefined {
	if (!input) {
		return undefined;
	}
	const value = input.trim();
	return value ? value : undefined;
}

export function normalizeSandboxValue(
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

export function normalizeAgentBackend(
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

export function parseRecipientsFromEnv(input: string | undefined): string[] {
	if (!input) {
		return [];
	}
	return input
		.split(",")
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
}

export function parseOptionalPositiveInt(
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
