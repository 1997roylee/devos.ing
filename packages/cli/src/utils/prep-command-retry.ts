import { logger } from "./logger";
import { runCommand } from "./shell";
import type { CommandResult, RunCommandOptions } from "./shell.types";

export const PREP_COMMAND_ATTEMPTS = 3;
export const PREP_COMMAND_TIMEOUT_MS = 5 * 60 * 1000;

const PREP_COMMAND_BACKOFF_MS = [1000, 3000] as const;

export async function runPrepCommandWithRetry(
	label: string,
	command: string,
	args: string[],
	options: RunCommandOptions,
	commandRunner: typeof runCommand = runCommand,
): Promise<CommandResult> {
	let lastResult: CommandResult | undefined;
	let lastError: unknown;
	const commandOptions = {
		...options,
		timeoutMs: options.timeoutMs ?? PREP_COMMAND_TIMEOUT_MS,
	};

	for (let attempt = 1; attempt <= PREP_COMMAND_ATTEMPTS; attempt += 1) {
		try {
			const result = await commandRunner(command, args, commandOptions);
			if (result.code === 0) {
				return result;
			}
			lastResult = result;
			lastError = undefined;
		} catch (error) {
			lastError = error;
			lastResult = undefined;
		}

		if (attempt < PREP_COMMAND_ATTEMPTS) {
			logger.warn(
				{
					label,
					command,
					args,
					cwd: options.cwd,
					attempt,
					attempts: PREP_COMMAND_ATTEMPTS,
					output: formatPrepCommandOutput(lastResult, lastError),
				},
				"Prep command failed; retrying",
			);
			await delay(PREP_COMMAND_BACKOFF_MS[attempt - 1] ?? 0);
		}
	}

	throw new Error(
		[
			`${label} failed after ${PREP_COMMAND_ATTEMPTS} attempts in '${options.cwd}'.`,
			`Command: ${command} ${args.join(" ")}`,
			"Output:",
			formatPrepCommandOutput(lastResult, lastError),
		].join("\n"),
	);
}

export function formatPrepCommandOutput(
	result: CommandResult | undefined,
	error: unknown,
): string {
	if (result) {
		return (result.stderr || result.stdout || "No output").trim();
	}
	if (error instanceof Error) {
		return error.message;
	}
	return error === undefined ? "No output" : String(error);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
