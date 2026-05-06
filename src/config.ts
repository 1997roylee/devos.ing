import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
	DeepPartial,
	PivLoopRootConfig,
	ProjectConfig,
	ProjectRuntimeConfig,
	ResolvedProjectConfig,
} from "./types";

const DEFAULT_CONFIG_FILE = "piv-loop.config.ts";

type RootOverride = DeepPartial<PivLoopRootConfig>;
type LegacyOverride = DeepPartial<ProjectRuntimeConfig>;
type AnyOverride = RootOverride | LegacyOverride;

export interface LoadedConfig {
	projects: ResolvedProjectConfig[];
}

export async function loadConfig(cwd: string): Promise<LoadedConfig> {
	const envBase = buildEnvBase(cwd);
	const loadedOverride = await loadConfigOverride(cwd);
	const root = normalizeOverrideToRoot(loadedOverride);
	const projects = resolveProjects(envBase, root, cwd);
	validateProjects(projects);
	return { projects };
}

export function getProjectById(
	config: LoadedConfig,
	projectId: string,
): ResolvedProjectConfig | undefined {
	return config.projects.find((project) => project.id === projectId);
}

function buildEnvBase(cwd: string): ProjectRuntimeConfig {
	const env = process.env;
	return {
		workspacePath: env.PIV_WORKSPACE_PATH ?? cwd,
		repo: {
			owner: env.GITHUB_REPO_OWNER ?? "",
			name: env.GITHUB_REPO_NAME ?? "",
			baseBranch: env.GITHUB_BASE_BRANCH ?? "main",
		},
		linear: {
			apiKey: env.LINEAR_API_KEY ?? "",
			apiUrl: env.LINEAR_API_URL ?? "https://api.linear.app/graphql",
			teamId: env.LINEAR_TEAM_ID,
			requiredLabel: env.LINEAR_REQUIRED_LABEL,
			pollLimit: Number(env.PIV_POLL_LIMIT ?? "10"),
			statusMap: {
				assigned: env.LINEAR_STATUS_ASSIGNED ?? "",
				planning: env.LINEAR_STATUS_PLANNING ?? "",
				implementing: env.LINEAR_STATUS_IMPLEMENTING ?? "",
				pr_created: env.LINEAR_STATUS_PR_CREATED ?? "",
				reviewing: env.LINEAR_STATUS_REVIEWING ?? "",
				testing: env.LINEAR_STATUS_TESTING ?? "",
				blocked: env.LINEAR_STATUS_BLOCKED ?? "",
				done: env.LINEAR_STATUS_DONE ?? "",
			},
		},
		github: {
			useGhCli: true,
			defaultBugLabel: env.GITHUB_BUG_LABEL ?? "bug",
		},
		codex: {
			binary: env.CODEX_BINARY ?? "codex",
			model: env.CODEX_MODEL,
			sandbox:
				(env.CODEX_SANDBOX as ProjectRuntimeConfig["codex"]["sandbox"]) ??
				"workspace-write",
			codexHome: env.CODEX_HOME ?? path.join(cwd, ".piv-loop", "codex-home"),
		},
		skills: {
			plan: path.join(cwd, "skills", "piv-plan", "SKILL.md"),
			implement: path.join(cwd, "skills", "piv-implement", "SKILL.md"),
			reviewTest: path.join(cwd, "skills", "piv-review-test", "SKILL.md"),
		},
		dryRun: env.PIV_DRY_RUN === "1",
	};
}

async function loadConfigOverride(cwd: string): Promise<AnyOverride> {
	const configPath = path.join(cwd, DEFAULT_CONFIG_FILE);
	try {
		await access(configPath);
	} catch {
		return {};
	}

	const imported = await import(pathToFileURL(configPath).href);
	const override = imported.default ?? imported.config ?? {};
	return override as AnyOverride;
}

function normalizeOverrideToRoot(override: AnyOverride): PivLoopRootConfig {
	if ("projects" in override && Array.isArray(override.projects)) {
		return override as PivLoopRootConfig;
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
	base: ProjectRuntimeConfig,
	root: PivLoopRootConfig,
	cwd: string,
): ResolvedProjectConfig[] {
	const projectSpecs =
		root.projects.length > 0 ? root.projects : [{ id: "default" }];
	const rootDefaults = stripProjects(root);
	const resolved = projectSpecs.map((project) =>
		resolveProject(base, rootDefaults, project, cwd),
	);
	return resolved;
}

function stripProjects(
	root: PivLoopRootConfig,
): DeepPartial<ProjectRuntimeConfig> {
	const { projects: _, ...rest } = root;
	return rest;
}

function resolveProject(
	base: ProjectRuntimeConfig,
	rootDefaults: DeepPartial<ProjectRuntimeConfig>,
	project: ProjectConfig,
	cwd: string,
): ResolvedProjectConfig {
	const mergedRuntime = mergeRuntime(base, rootDefaults, project);
	const id = project.id.trim();
	const name = project.name?.trim() || id;

	return {
		...mergedRuntime,
		id,
		name,
		codex: {
			...mergedRuntime.codex,
			codexHome:
				project.codex?.codexHome ??
				rootDefaults.codex?.codexHome ??
				path.join(cwd, ".piv-loop", "codex-home", id),
		},
	};
}

function mergeRuntime(
	base: ProjectRuntimeConfig,
	rootDefaults: DeepPartial<ProjectRuntimeConfig>,
	project: ProjectConfig,
): ProjectRuntimeConfig {
	return {
		workspacePath:
			project.workspacePath ?? rootDefaults.workspacePath ?? base.workspacePath,
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
		dryRun: project.dryRun ?? rootDefaults.dryRun ?? base.dryRun,
	};
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

function validateProject(project: ResolvedProjectConfig): void {
	if (!project.linear.apiKey) {
		throw new Error(`LINEAR_API_KEY is required for project '${project.id}'`);
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
