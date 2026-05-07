#!/usr/bin/env bun
import { parseArgs } from "./args";
import { handleCommand, printHelp } from "./commands/handlers";
import { loadConfig } from "./core/config";
import {
	logger,
	normalizeError,
	setupProcessErrorHandlers,
} from "./utils/logger";

async function main(): Promise<void> {
	setupProcessErrorHandlers();
	const command = parseArgs(process.argv);
	if (command.kind === "help") {
		printHelp();
		return;
	}

	const cwd = process.cwd();
	const config = await loadConfig(cwd);
	await handleCommand(command, config);
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	logger.error({ err: normalizeError(error) }, message);
	process.exitCode = 1;
});
