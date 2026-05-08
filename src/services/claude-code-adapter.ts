import type { AgentAdapter, AgentResult } from "../core/agent-adapter";
import type { ResolvedProjectConfig } from "../core/types";
import {
	extractFinalMessage,
	extractSessionId,
	extractUsage,
} from "../utils/parsing";
import { assertCommandOk, runCommand } from "../utils/shell";

export class ClaudeCodeAdapter implements AgentAdapter {
	constructor(private config: ResolvedProjectConfig) {}

	async runPlan(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	async resume(_sessionId: string, prompt: string): Promise<AgentResult> {
		return this.runClaudeContinue(prompt);
	}

	async runReview(prompt: string): Promise<AgentResult> {
		return this.runClaude(prompt);
	}

	private async runClaude(prompt: string): Promise<AgentResult> {
		const args = ["-p", prompt, "--output-format", "json"];

		const result = await runCommand("claude", args, {
			cwd: this.config.executionPath,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
		});

		assertCommandOk("claude", args, result);
		const finalMessage = extractFinalMessage(result.stdout);
		const sessionId = extractSessionId(result.stdout);
		const usage = extractUsage(result.stdout);

		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			usage,
		};
	}

	private async runClaudeContinue(prompt: string): Promise<AgentResult> {
		const args = ["--continue", prompt, "--output-format", "json"];

		const result = await runCommand("claude", args, {
			cwd: this.config.executionPath,
			streamStdout: this.config.codex.streamLogs,
			streamStderr: this.config.codex.streamLogs,
			stdinMode: "ignore",
		});

		assertCommandOk("claude", args, result);
		const finalMessage = extractFinalMessage(result.stdout);
		const sessionId = extractSessionId(result.stdout);
		const usage = extractUsage(result.stdout);

		return {
			sessionId,
			finalMessage,
			stdout: result.stdout,
			usage,
		};
	}
}
