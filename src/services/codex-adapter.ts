import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AgentAdapter, AgentResult } from "../core/agent-adapter";
import type { ResolvedProjectConfig } from "../core/types";
import { extractSessionId, extractUsage } from "../utils/parsing";
import { assertCommandOk, runCommand } from "../utils/shell";

export class CodexAdapter implements AgentAdapter {
	constructor(private config: ResolvedProjectConfig) {}

	async runPlan(prompt: string): Promise<AgentResult> {
		const model = this.config.codex.models?.plan ?? this.config.codex.model;
		return this.runCodex(
			this.buildExecArgs(prompt, await this.nextOutputFile(), model),
		);
	}

	async resume(sessionId: string, prompt: string): Promise<AgentResult> {
		const model =
			this.config.codex.models?.implement ?? this.config.codex.model;
		return this.runCodex(
			this.buildResumeArgs(
				sessionId,
				prompt,
				await this.nextOutputFile(),
				model,
			),
		);
	}

	async runReview(prompt: string): Promise<AgentResult> {
		const model =
			this.config.codex.models?.reviewTest ??
			this.config.codex.models?.implement ??
			this.config.codex.model;
		return this.runCodex(
			this.buildExecArgs(prompt, await this.nextOutputFile(), model),
		);
	}

	private buildExecArgs(
		prompt: string,
		outputFile: string,
		modelOverride?: string,
	): string[] {
		const args = [
			"exec",
			"--json",
			"--skip-git-repo-check",
			"--cd",
			this.config.executionPath,
			"--output-last-message",
			outputFile,
		];
		const model = modelOverride ?? this.config.codex.model;
		if (model) {
			args.push("--model", model);
		}
		if (this.config.codex.sandbox) {
			args.push("--sandbox", this.config.codex.sandbox);
		}
		this.appendConfigArgs(args);
		args.push(prompt);
		return args;
	}

	private buildResumeArgs(
		sessionId: string,
		prompt: string,
		outputFile: string,
		modelOverride?: string,
	): string[] {
		const args = [
			"exec",
			"resume",
			"--json",
			"--skip-git-repo-check",
			"--output-last-message",
			outputFile,
		];
		const model = modelOverride ?? this.config.codex.model;
		if (model) {
			args.push("--model", model);
		}
		this.appendConfigArgs(args);
		args.push(sessionId, prompt);
		return args;
	}

	private async runCodex(args: string[]): Promise<AgentResult> {
		const outputFile = args[args.indexOf("--output-last-message") + 1] ?? "";
		const envOverrides = this.config.codex.codexHome
			? { CODEX_HOME: this.config.codex.codexHome }
			: {};
		const result = await runCommand(this.config.codex.binary, args, {
			cwd: this.config.executionPath,
			env: envOverrides,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
		});

		assertCommandOk(this.config.codex.binary, args, result);
		const sessionId = extractSessionId(result.stdout);
		const finalMessage = await readOutputFile(outputFile);
		const usage = extractUsage(result.stdout);
		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			usage,
		};
	}

	private async nextOutputFile(): Promise<string> {
		const dir = path.join(this.config.workspacePath, ".piv-loop", "tmp");
		await mkdir(dir, { recursive: true });
		return path.join(
			dir,
			`codex-output-${Date.now()}-${Math.floor(Math.random() * 10000)}.txt`,
		);
	}

	private appendConfigArgs(args: string[]): void {
		for (const override of this.buildConfigOverrides()) {
			args.push("--config", override);
		}
	}

	private buildConfigOverrides(): string[] {
		const overrides: string[] = [];
		const plugins = normalizeList(this.config.codex.plugins);
		const skillsets = normalizeList(this.config.codex.skillsets);

		for (const plugin of plugins) {
			const pluginKey = JSON.stringify(plugin);
			overrides.push(`plugins.${pluginKey}.enabled=true`);
		}
		if (skillsets.length > 0) {
			overrides.push(`skillsets=${toTomlStringArray(skillsets)}`);
		}
		for (const [rawKey, rawValue] of Object.entries(
			this.config.codex.configOverrides ?? {},
		)) {
			const key = rawKey.trim();
			const value = rawValue.trim();
			if (!key || !value) {
				continue;
			}
			overrides.push(`${key}=${value}`);
		}

		return overrides;
	}
}

async function readOutputFile(file: string): Promise<string> {
	try {
		return (await readFile(file, "utf8")).trim();
	} catch {
		return "";
	}
}

function normalizeList(values: string[] | undefined): string[] {
	if (!values) {
		return [];
	}
	return values.map((value) => value.trim()).filter(Boolean);
}

function toTomlStringArray(values: string[]): string {
	return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
}
