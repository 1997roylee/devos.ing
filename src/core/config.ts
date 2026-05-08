/**
 * Configuration loading and resolution for ADHD.ai.
 * Coordinates env resolution, file loading, merging, and validation.
 */

import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
	buildEnvBase,
	buildEnvNotifications,
	buildEnvPolling,
} from "./config/env";
import {
	resolveCron,
	resolveNotifications,
	resolveProjects,
} from "./config/merging";
import {
	assertNoProjectNotifications,
	assertNoProjectPolling,
	validateCron,
	validateNotifications,
	validatePolling,
	validateProject,
	validateProjects,
} from "./config/validation";
import type {
	AdhdAiRootConfig,
	CronConfig,
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
const LEGACY_CONFIG_FILE = "piv-loop.config.ts";

type RootOverride = DeepPartial<AdhdAiRootConfig>;
type LegacyOverride = DeepPartial<ProjectRuntimeConfig>;
type AnyOverride = RootOverride | LegacyOverride;

export interface LoadedConfig {
	projects: ResolvedProjectConfig[];
	polling: PollingConfig;
	cron: CronConfig;
	notifications: ResolvedNotificationConfig;
}

export async function loadConfig(cwd: string): Promise<LoadedConfig> {
	const envBase = buildEnvBase(cwd);
	const envPolling = buildEnvPolling();
	const envNotifications = buildEnvNotifications();
	const loadedOverride = await loadConfigOverride(cwd);
	const root = normalizeOverrideToRoot(loadedOverride);
	assertNoProjectPolling(root.projects);
	assertNoProjectNotifications(root.projects);
	const projects = resolveProjects(envBase, root);
	const polling: PollingConfig = {
		intervalMs: envPolling.intervalMs,
		maxCycles: envPolling.maxCycles ?? undefined,
		exitWhenIdle: envPolling.exitWhenIdle ?? true,
		staleRunTimeoutMs: envPolling.staleRunTimeoutMs ?? 3600000,
	};
	const cron = resolveCron(root.cron);
	const notifications = resolveNotifications(
		envNotifications,
		root.notifications,
	);
	validateProjects(projects);
	validatePolling(polling);
	validateCron(cron);
	validateNotifications(notifications);
	return { projects, polling, cron, notifications };
}

export function getProjectById(
	config: LoadedConfig,
	projectId: string,
): ResolvedProjectConfig | undefined {
	return config.projects.find((project) => project.id === projectId);
}

async function loadConfigOverride(cwd: string): Promise<AnyOverride> {
	for (const configFile of [DEFAULT_CONFIG_FILE, LEGACY_CONFIG_FILE]) {
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
