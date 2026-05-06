import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { assertCommandOk, runCommand } from "./shell";
import type { ResolvedProjectConfig } from "./types";

export interface CodexResult {
	sessionId?: string;
	finalMessage: string;
	stdout: string;
}

export function buildCodexExecArgs(
	config: ResolvedProjectConfig,
	prompt: string,
	outputFile: string,
): string[] {
	const args = [
		"exec",
		"--json",
		"--skip-git-repo-check",
		"--cd",
		config.workspacePath,
		"--output-last-message",
		outputFile,
	];
	if (config.codex.model) {
		args.push("--model", config.codex.model);
	}
	if (config.codex.sandbox) {
		args.push("--sandbox", config.codex.sandbox);
	}
	args.push(prompt);
	return args;
}

export function buildCodexResumeArgs(
	config: ResolvedProjectConfig,
	sessionId: string,
	prompt: string,
	outputFile: string,
): string[] {
	const args = [
		"exec",
		"resume",
		"--json",
		"--skip-git-repo-check",
		"--cd",
		config.workspacePath,
		"--output-last-message",
		outputFile,
	];
	if (config.codex.model) {
		args.push("--model", config.codex.model);
	}
	if (config.codex.sandbox) {
		args.push("--sandbox", config.codex.sandbox);
	}
	args.push(sessionId, prompt);
	return args;
}

export async function runPlanSession(
	config: ResolvedProjectConfig,
	prompt: string,
): Promise<CodexResult> {
	return runCodex(
		config,
		buildCodexExecArgs(config, prompt, await nextOutputFile(config)),
	);
}

export async function runResumeSession(
	config: ResolvedProjectConfig,
	sessionId: string,
	prompt: string,
): Promise<CodexResult> {
	return runCodex(
		config,
		buildCodexResumeArgs(
			config,
			sessionId,
			prompt,
			await nextOutputFile(config),
		),
	);
}

export async function runReviewSession(
	config: ResolvedProjectConfig,
	prompt: string,
): Promise<CodexResult> {
	return runPlanSession(config, prompt);
}

async function runCodex(
	config: ResolvedProjectConfig,
	args: string[],
): Promise<CodexResult> {
	const outputFile = args[args.indexOf("--output-last-message") + 1] ?? "";
	const result = await runCommand(config.codex.binary, args, {
		cwd: config.workspacePath,
		env: {
			CODEX_HOME: config.codex.codexHome,
		},
	});

	assertCommandOk(config.codex.binary, args, result);
	const sessionId = extractSessionId(result.stdout);
	const finalMessage = await readOutputFile(outputFile);
	return {
		sessionId,
		finalMessage,
		stdout: result.stdout,
	};
}

async function nextOutputFile(config: ResolvedProjectConfig): Promise<string> {
	const dir = path.join(config.workspacePath, ".piv-loop", "tmp");
	await mkdir(dir, { recursive: true });
	return path.join(
		dir,
		`codex-output-${Date.now()}-${Math.floor(Math.random() * 10000)}.txt`,
	);
}

async function readOutputFile(file: string): Promise<string> {
	try {
		return (await readFile(file, "utf8")).trim();
	} catch {
		return "";
	}
}

export function extractSessionId(jsonlOutput: string): string | undefined {
	const lines = jsonlOutput.split("\n").filter(Boolean);
	for (const line of lines) {
		try {
			const parsed = JSON.parse(line) as unknown;
			const id = findStringByKey(parsed, [
				"session_id",
				"sessionId",
				"thread_id",
				"threadId",
				"conversation_id",
				"conversationId",
			]);
			if (id) {
				return id;
			}
		} catch {}
	}
	return undefined;
}

function findStringByKey(value: unknown, keys: string[]): string | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}
	const asRecord = value as Record<string, unknown>;
	for (const key of keys) {
		const candidate = asRecord[key];
		if (typeof candidate === "string" && candidate.length > 0) {
			return candidate;
		}
	}
	for (const nested of Object.values(asRecord)) {
		const id = findStringByKey(nested, keys);
		if (id) {
			return id;
		}
	}
	return undefined;
}
